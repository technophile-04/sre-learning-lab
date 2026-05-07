/// <reference lib="webworker" />
// Classic web-worker that compiles a single Solidity source.
// Soljson is fetched once from the official binaries CDN; subsequent compiles reuse it.
// We pin a specific compiler version so the bytecode and ABI are reproducible.
import wrapper from "solc/wrapper";

const SOLJSON_URL = "https://binaries.soliditylang.org/bin/soljson-v0.8.24+commit.e11b9ed9.js";

declare const self: DedicatedWorkerGlobalScope;

self.importScripts(SOLJSON_URL);

const compiler = wrapper((self as unknown as { Module: unknown }).Module);

type CompileRequest = { id: string; source: string };

type CompileSuccess = {
  id: string;
  ok: true;
  abi: unknown[];
  bytecode: string;
  warnings: string[];
};

type CompileFailure = { id: string; ok: false; errors: string[] };

self.onmessage = (event: MessageEvent<CompileRequest>) => {
  const { id, source } = event.data;
  const input = {
    language: "Solidity",
    sources: { "Contract.sol": { content: source } },
    settings: {
      optimizer: { enabled: false },
      outputSelection: {
        "*": { "*": ["abi", "evm.bytecode.object"] },
      },
    },
  };

  try {
    const raw = compiler.compile(JSON.stringify(input));
    const output = JSON.parse(raw);

    const errors: string[] = [];
    const warnings: string[] = [];
    for (const e of output.errors ?? []) {
      if (e.severity === "error") errors.push(e.formattedMessage ?? e.message);
      else warnings.push(e.formattedMessage ?? e.message);
    }
    if (errors.length > 0) {
      const failure: CompileFailure = { id, ok: false, errors };
      self.postMessage(failure);
      return;
    }

    const fileEntry = output.contracts?.["Contract.sol"];
    if (!fileEntry) {
      self.postMessage({
        id,
        ok: false,
        errors: ["compilation produced no contracts"],
      } satisfies CompileFailure);
      return;
    }
    const contractName = Object.keys(fileEntry)[0]!;
    const contract = fileEntry[contractName];

    const success: CompileSuccess = {
      id,
      ok: true,
      abi: contract.abi,
      bytecode: "0x" + contract.evm.bytecode.object,
      warnings,
    };
    self.postMessage(success);
  } catch (err) {
    self.postMessage({
      id,
      ok: false,
      errors: [(err as Error).message],
    } satisfies CompileFailure);
  }
};
