/// <reference lib="webworker" />
// Web-worker that compiles Solidity in the browser.
//
// Soljson is fetched once from the official binaries CDN; subsequent compiles
// reuse it. We pin a specific compiler version so bytecode and ABI are
// reproducible.
//
// Two request shapes:
//   { id, source }            — legacy single file (compiled as "Contract.sol")
//   { id, sources: {..} }     — multi-file; OpenZeppelin imports are resolved
//                               from the vendored OZ_SOURCES map via solc's
//                               import callback, so real `import "@openzeppelin
//                               /..."` lines work with no filesystem.
import { OZ_SOURCES } from "./oz-sources";
import wrapper from "solc/wrapper";

const SOLJSON_URL = "https://binaries.soliditylang.org/bin/soljson-v0.8.24+commit.e11b9ed9.js";

declare const self: DedicatedWorkerGlobalScope;

self.importScripts(SOLJSON_URL);

const compiler = wrapper((self as unknown as { Module: unknown }).Module);

type CompileRequest = { id: string; source?: string; sources?: Record<string, string> };

type Compiled = { name: string; file: string; abi: unknown[]; bytecode: string };

type CompileSuccess = {
  id: string;
  ok: true;
  // legacy convenience: first contract's abi/bytecode
  abi: unknown[];
  bytecode: string;
  // every contract found, keyed by contract name (e.g. "YourToken", "Vendor")
  contracts: Record<string, Compiled>;
  warnings: string[];
};

type CompileFailure = { id: string; ok: false; errors: string[] };

function makeImportCallback(localSources: Record<string, string>) {
  return (importPath: string): { contents: string } | { error: string } => {
    if (OZ_SOURCES[importPath]) return { contents: OZ_SOURCES[importPath] };
    if (localSources[importPath]) return { contents: localSources[importPath] };
    return { error: "File not found: " + importPath };
  };
}

self.onmessage = (event: MessageEvent<CompileRequest>) => {
  const { id, source, sources } = event.data;

  const fileMap: Record<string, string> = sources ?? { "Contract.sol": source ?? "" };

  const input = {
    language: "Solidity",
    sources: Object.fromEntries(Object.entries(fileMap).map(([name, content]) => [name, { content }])),
    settings: {
      optimizer: { enabled: false },
      outputSelection: { "*": { "*": ["abi", "evm.bytecode.object"] } },
    },
  };

  try {
    const raw = compiler.compile(JSON.stringify(input), { import: makeImportCallback(fileMap) });
    const output = JSON.parse(raw);

    const errors: string[] = [];
    const warnings: string[] = [];
    for (const e of output.errors ?? []) {
      if (e.severity === "error") errors.push(e.formattedMessage ?? e.message);
      else warnings.push(e.formattedMessage ?? e.message);
    }
    if (errors.length > 0) {
      self.postMessage({ id, ok: false, errors } satisfies CompileFailure);
      return;
    }

    // Collect every contract across the learner's files. We skip the vendored
    // OZ files — only files the learner authored produce deployable artifacts.
    const contracts: Record<string, Compiled> = {};
    for (const file of Object.keys(fileMap)) {
      const defs = output.contracts?.[file];
      if (!defs) continue;
      for (const [name, def] of Object.entries(
        defs as Record<string, { abi: unknown[]; evm: { bytecode: { object: string } } }>,
      )) {
        const obj = def.evm?.bytecode?.object ?? "";
        if (!obj) continue; // interfaces / abstract contracts have no bytecode
        contracts[name] = { name, file, abi: def.abi, bytecode: "0x" + obj };
      }
    }

    const names = Object.keys(contracts);
    if (names.length === 0) {
      self.postMessage({
        id,
        ok: false,
        errors: ["compilation produced no deployable contracts"],
      } satisfies CompileFailure);
      return;
    }

    const first = contracts[names[0]];
    self.postMessage({
      id,
      ok: true,
      abi: first.abi,
      bytecode: first.bytecode,
      contracts,
      warnings,
    } satisfies CompileSuccess);
  } catch (err) {
    self.postMessage({ id, ok: false, errors: [(err as Error).message] } satisfies CompileFailure);
  }
};
