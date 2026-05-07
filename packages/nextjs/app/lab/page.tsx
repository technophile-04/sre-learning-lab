"use client";

import { useCallback, useMemo, useRef, useState } from "react";
import { solidity } from "@replit/codemirror-lang-solidity";
import { githubDark } from "@uiw/codemirror-theme-github";
import CodeMirror from "@uiw/react-codemirror";
import { PREFUNDED_ACCOUNTS, createMemoryClient } from "tevm";
import type { Abi, Address } from "viem";
import { compileSolidity } from "~~/lib/solc";

// Week-1 lab: prove the runtime round-trip end-to-end.
// User-typed solidity → web-worker solc compile → tevm deploy → call → read state.
// No styling, no scenes, no AI. The point is to confirm the pipeline works before
// anything else lands. See CONTEXT.md and docs/adr/0001-stay-on-se2-substrate.md.

const STARTER_SOURCE = `// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

contract MiniERC20 {
    string public name = "Mini";
    string public symbol = "MNI";
    mapping(address => uint256) public balanceOf;
    uint256 public totalSupply;

    constructor(uint256 _initialSupply) {
        balanceOf[msg.sender] = _initialSupply;
        totalSupply = _initialSupply;
    }

    function transfer(address to, uint256 amount) external returns (bool) {
        require(balanceOf[msg.sender] >= amount, "balance too low");
        balanceOf[msg.sender] -= amount;
        balanceOf[to] += amount;
        return true;
    }
}
`;

type LogLine = { kind: "info" | "ok" | "error"; text: string };

export default function LabPage() {
  const [source, setSource] = useState(STARTER_SOURCE);
  const [logs, setLogs] = useState<LogLine[]>([]);
  const [busy, setBusy] = useState(false);
  const [contractAddress, setContractAddress] = useState<Address | null>(null);
  const [abi, setAbi] = useState<Abi | null>(null);
  const [balanceA, setBalanceA] = useState<bigint | null>(null);
  const [balanceB, setBalanceB] = useState<bigint | null>(null);

  const client = useMemo(() => createMemoryClient({ miningConfig: { type: "auto" } }), []);
  const accountA = useRef(PREFUNDED_ACCOUNTS[0]);
  const accountB = useRef(PREFUNDED_ACCOUNTS[1]);

  const log = useCallback((line: LogLine) => {
    setLogs(prev => [...prev, line]);
  }, []);

  const onCompileAndDeploy = useCallback(async () => {
    setBusy(true);
    log({ kind: "info", text: "compiling…" });
    const result = await compileSolidity(source);
    if (!result.ok) {
      for (const e of result.errors) log({ kind: "error", text: e });
      setBusy(false);
      return;
    }
    log({ kind: "ok", text: `compiled (bytecode ${result.bytecode.length / 2 - 1} bytes)` });
    for (const w of result.warnings) log({ kind: "info", text: `warning: ${w}` });

    try {
      // Encode the constructor (initialSupply = 1_000_000)
      const initialSupply = 1_000_000n;
      // We'll deploy via tevm by sending a creation tx from accountA.
      // tevm exposes setCode for a shortcut, but we want a real constructor run so balances initialize.
      const hash = await client.deployContract({
        abi: result.abi as Abi,
        bytecode: result.bytecode,
        args: [initialSupply],
        account: accountA.current,
        chain: null,
      });
      const receipt = await client.waitForTransactionReceipt({ hash });
      if (!receipt.contractAddress) {
        log({ kind: "error", text: "deployed but no contract address in receipt" });
        setBusy(false);
        return;
      }
      setContractAddress(receipt.contractAddress as Address);
      setAbi(result.abi as Abi);
      log({ kind: "ok", text: `deployed at ${receipt.contractAddress}` });
      await refreshBalances(receipt.contractAddress as Address, result.abi as Abi);
    } catch (err) {
      log({ kind: "error", text: `deploy failed: ${(err as Error).message}` });
    }
    setBusy(false);
  }, [client, source, log]);

  const refreshBalances = useCallback(
    async (addr: Address, currentAbi: Abi) => {
      try {
        const a = (await client.readContract({
          address: addr,
          abi: currentAbi,
          functionName: "balanceOf",
          args: [accountA.current.address],
        })) as bigint;
        const b = (await client.readContract({
          address: addr,
          abi: currentAbi,
          functionName: "balanceOf",
          args: [accountB.current.address],
        })) as bigint;
        setBalanceA(a);
        setBalanceB(b);
      } catch (err) {
        log({ kind: "error", text: `read failed: ${(err as Error).message}` });
      }
    },
    [client, log],
  );

  const onTransfer = useCallback(async () => {
    if (!contractAddress || !abi) return;
    setBusy(true);
    try {
      const hash = await client.writeContract({
        address: contractAddress,
        abi,
        functionName: "transfer",
        args: [accountB.current.address, 100n],
        account: accountA.current,
        chain: null,
      });
      await client.waitForTransactionReceipt({ hash });
      log({ kind: "ok", text: "transferred 100 from A → B" });
      await refreshBalances(contractAddress, abi);
    } catch (err) {
      log({ kind: "error", text: `transfer failed: ${(err as Error).message}` });
    }
    setBusy(false);
  }, [client, contractAddress, abi, log, refreshBalances]);

  return (
    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16, padding: 16 }}>
      <div>
        <h2 style={{ marginBottom: 8 }}>solidity</h2>
        <CodeMirror value={source} onChange={setSource} extensions={[solidity]} theme={githubDark} height="480px" />
        <div style={{ marginTop: 12, display: "flex", gap: 8 }}>
          <button onClick={onCompileAndDeploy} disabled={busy}>
            compile &amp; deploy
          </button>
          <button onClick={onTransfer} disabled={busy || !contractAddress}>
            transfer 100 A → B
          </button>
        </div>
      </div>
      <div>
        <h2 style={{ marginBottom: 8 }}>state</h2>
        <div style={{ fontFamily: "monospace", fontSize: 13, lineHeight: 1.6 }}>
          <div>contract: {contractAddress ?? "—"}</div>
          <div>balanceOf(A): {balanceA?.toString() ?? "—"}</div>
          <div>balanceOf(B): {balanceB?.toString() ?? "—"}</div>
        </div>
        <h3 style={{ marginTop: 24, marginBottom: 8 }}>logs</h3>
        <div
          style={{
            fontFamily: "monospace",
            fontSize: 12,
            lineHeight: 1.5,
            background: "#0d1117",
            color: "#c9d1d9",
            padding: 12,
            borderRadius: 6,
            height: 320,
            overflowY: "auto",
          }}
        >
          {logs.length === 0 && <div style={{ color: "#7d8590" }}>(empty)</div>}
          {logs.map((l, i) => (
            <div
              key={i}
              style={{
                color: l.kind === "error" ? "#ff7b72" : l.kind === "ok" ? "#7ee787" : "#79c0ff",
              }}
            >
              {l.text}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
