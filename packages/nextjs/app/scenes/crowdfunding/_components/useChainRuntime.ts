"use client";

// The in-browser chain for TRY IT + SHIP IT. Owns a tevm memory client for the
// lifetime of the deck page (not persisted — the chain resets on reload). It
// compiles the learner's running source (with any gaps filled in so it always
// runs), deploys FundingRecipient then CrowdFund wired to it, and exposes
// contribute / advanceTime / execute / withdraw plus a snapshot of the campaign.
//
// State-changing calls go through tevm's native action, not viem's writeContract:
// against the memory client, writeContract reverts a call that follows deploys in
// the same flow, while tevmContract executes against committed state correctly.
//
// Time travel: tevm has no evm_increaseTime, but mining a block advances ~1s, so
// advanceTime mines enough blocks to clear the 30s deadline.
import { useCallback, useMemo, useRef, useState } from "react";
import { PREFUNDED_ACCOUNTS, createMemoryClient } from "tevm";
import { type Abi, formatEther, parseEther } from "viem";
import { completedSources } from "~~/lib/deck/crowdfunding-contracts";
import type { SolFile } from "~~/lib/deck/types";
import { compileContracts } from "~~/lib/solc";

export type Deployment = {
  crowdFundAddress: `0x${string}`;
  recipientAddress: `0x${string}`;
  crowdFundAbi: Abi;
  recipientAbi: Abi;
  sourceKey: string;
};

export type Snapshot = {
  contractEth: bigint;
  learnerContribution: bigint;
  learnerEth: bigint;
  openToWithdraw: boolean;
  completed: boolean;
  timeLeft: bigint;
};

type TevmContractParams = {
  to: string;
  abi: Abi;
  functionName: string;
  args: readonly unknown[];
  from: string;
  value?: bigint;
  createTransaction: true;
  addToBlockchain: true;
};
type TevmContractFn = (p: TevmContractParams) => Promise<{ errors?: Array<{ message?: string }> }>;

export function useChainRuntime() {
  const client = useMemo(() => createMemoryClient({ miningConfig: { type: "auto" } }), []);
  const deployer = useMemo(() => PREFUNDED_ACCOUNTS[0], []);
  const learner = useMemo(() => PREFUNDED_ACCOUNTS[1], []);

  const [deployment, setDeployment] = useState<Deployment | null>(null);
  const [snapshot, setSnapshot] = useState<Snapshot | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const deployRef = useRef<Deployment | null>(null);

  const refresh = useCallback(
    async (d: Deployment | null = deployRef.current) => {
      if (!d) return;
      const [contractEth, learnerContribution, learnerEth, openToWithdraw, completed, timeLeft] = await Promise.all([
        client.getBalance({ address: d.crowdFundAddress }),
        client.readContract({
          address: d.crowdFundAddress,
          abi: d.crowdFundAbi,
          functionName: "balances",
          args: [learner.address],
        }) as Promise<bigint>,
        client.getBalance({ address: learner.address }),
        client.readContract({
          address: d.crowdFundAddress,
          abi: d.crowdFundAbi,
          functionName: "openToWithdraw",
          args: [],
        }) as Promise<boolean>,
        client.readContract({
          address: d.recipientAddress,
          abi: d.recipientAbi,
          functionName: "completed",
          args: [],
        }) as Promise<boolean>,
        client.readContract({
          address: d.crowdFundAddress,
          abi: d.crowdFundAbi,
          functionName: "timeLeft",
          args: [],
        }) as Promise<bigint>,
      ]);
      setSnapshot({ contractEth, learnerContribution, learnerEth, openToWithdraw, completed, timeLeft });
    },
    [client, learner.address],
  );

  // send a state-changing call via tevm's native action; throw on revert so the
  // caller can surface the reason.
  const sendTx = useCallback(
    async (p: Omit<TevmContractParams, "createTransaction" | "addToBlockchain">) => {
      const call = client.tevmContract as unknown as TevmContractFn;
      const r = await call({ ...p, createTransaction: true, addToBlockchain: true });
      if (r.errors && r.errors.length > 0) {
        throw new Error(r.errors[0]?.message ?? "transaction reverted");
      }
    },
    [client],
  );

  /** Deploy the running source (gaps filled with reference code). Idempotent for
   *  unchanged source. */
  const ensureDeployed = useCallback(
    async (sources: Record<string, string>): Promise<Deployment> => {
      const full = completedSources(sources as Record<SolFile, string>);
      const sourceKey = full["CrowdFund.sol"] + " " + full["FundingRecipient.sol"];
      if (deployRef.current && deployRef.current.sourceKey === sourceKey) return deployRef.current;

      setBusy(true);
      setError(null);
      try {
        const res = await compileContracts(full);
        if (!res.ok) throw new Error(res.errors[0] ?? "compile failed");
        const recipient = res.contracts["FundingRecipient"];
        const crowdFund = res.contracts["CrowdFund"];
        if (!recipient || !crowdFund) throw new Error("expected CrowdFund and FundingRecipient contracts");

        const rHash = await client.deployContract({
          abi: recipient.abi as Abi,
          bytecode: recipient.bytecode,
          args: [],
          account: deployer,
          chain: null,
        });
        const recipientAddress = (await client.waitForTransactionReceipt({ hash: rHash }))
          .contractAddress as `0x${string}`;

        const cHash = await client.deployContract({
          abi: crowdFund.abi as Abi,
          bytecode: crowdFund.bytecode,
          args: [recipientAddress],
          account: deployer,
          chain: null,
        });
        const crowdFundAddress = (await client.waitForTransactionReceipt({ hash: cHash }))
          .contractAddress as `0x${string}`;

        const next: Deployment = {
          crowdFundAddress,
          recipientAddress,
          crowdFundAbi: crowdFund.abi as Abi,
          recipientAbi: recipient.abi as Abi,
          sourceKey,
        };
        deployRef.current = next;
        setDeployment(next);
        await refresh(next);
        return next;
      } catch (e) {
        setError(shortRevert((e as Error).message));
        throw e;
      } finally {
        setBusy(false);
      }
    },
    [client, deployer, refresh],
  );

  const run = useCallback(
    async (fn: () => Promise<void>) => {
      setBusy(true);
      setError(null);
      try {
        await fn();
        await refresh();
      } catch (e) {
        setError(shortRevert((e as Error).message));
      } finally {
        setBusy(false);
      }
    },
    [refresh],
  );

  const contribute = useCallback(
    (eth: string) =>
      run(async () => {
        const d = deployRef.current!;
        await sendTx({
          to: d.crowdFundAddress,
          abi: d.crowdFundAbi,
          functionName: "contribute",
          args: [],
          value: parseEther(eth || "0"),
          from: learner.address,
        });
      }),
    [learner.address, run, sendTx],
  );

  // mine ~35 blocks to push past the 30s deadline (≈1s per block in tevm)
  const advanceTime = useCallback(
    () =>
      run(async () => {
        const mine = client.tevmMine as unknown as (p: { blockCount: number }) => Promise<unknown>;
        await mine({ blockCount: 40 });
      }),
    [client, run],
  );

  const execute = useCallback(
    () =>
      run(async () => {
        const d = deployRef.current!;
        await sendTx({
          to: d.crowdFundAddress,
          abi: d.crowdFundAbi,
          functionName: "execute",
          args: [],
          from: learner.address,
        });
      }),
    [learner.address, run, sendTx],
  );

  const withdraw = useCallback(
    () =>
      run(async () => {
        const d = deployRef.current!;
        await sendTx({
          to: d.crowdFundAddress,
          abi: d.crowdFundAbi,
          functionName: "withdraw",
          args: [],
          from: learner.address,
        });
      }),
    [learner.address, run, sendTx],
  );

  return {
    deployment,
    snapshot,
    busy,
    error,
    accounts: { deployer: deployer.address, learner: learner.address },
    ensureDeployed,
    refresh,
    contribute,
    advanceTime,
    execute,
    withdraw,
    fmt: (v: bigint) => formatEther(v),
  };
}

function shortRevert(msg: string): string {
  const m = msg.match(/reverted.*?:\s*(.+?)(\n|$)/i) ?? msg.match(/reason:\s*(.+?)(\n|$)/i);
  if (m) return m[1].trim();
  if (/TooEarly/i.test(msg)) return "the deadline hasn't passed yet";
  if (/NotOpenToWithdraw/i.test(msg)) return "withdrawals aren't open — the campaign has to fail first";
  if (/AlreadyCompleted/i.test(msg)) return "the campaign is already completed";
  if (/insufficient/i.test(msg)) return "insufficient balance";
  return msg.split("\n")[0].slice(0, 140);
}
