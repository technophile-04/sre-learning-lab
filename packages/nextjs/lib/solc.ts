// Main-thread wrapper around the solc web-worker.
// Lazily spawns the worker on first compile, then reuses it across requests.

export type CompiledContract = { name: string; file: string; abi: unknown[]; bytecode: `0x${string}` };

export type CompileResult =
  | {
      ok: true;
      abi: unknown[];
      bytecode: `0x${string}`;
      contracts: Record<string, CompiledContract>;
      warnings: string[];
    }
  | { ok: false; errors: string[] };

let worker: Worker | null = null;
let nextId = 0;
const pending = new Map<string, (r: CompileResult) => void>();

function ensureWorker(): Worker {
  if (worker) return worker;
  worker = new Worker(new URL("./solc-worker.ts", import.meta.url));
  worker.onmessage = (event: MessageEvent) => {
    const { id, ...rest } = event.data as { id: string } & Record<string, unknown>;
    const resolver = pending.get(id);
    if (!resolver) return;
    pending.delete(id);
    if (rest.ok === true) {
      resolver({
        ok: true,
        abi: rest.abi as unknown[],
        bytecode: rest.bytecode as `0x${string}`,
        contracts: (rest.contracts as Record<string, CompiledContract>) ?? {},
        warnings: (rest.warnings as string[]) ?? [],
      });
    } else {
      resolver({ ok: false, errors: (rest.errors as string[]) ?? ["unknown error"] });
    }
  };
  return worker;
}

function post(message: Record<string, unknown>): Promise<CompileResult> {
  const w = ensureWorker();
  const id = String(nextId++);
  return new Promise(resolve => {
    pending.set(id, resolve);
    w.postMessage({ id, ...message });
  });
}

/** Compile a single self-contained source (no imports). */
export function compileSolidity(source: string): Promise<CompileResult> {
  return post({ source });
}

/**
 * Compile a set of named Solidity files. OpenZeppelin imports resolve from the
 * vendored OZ_SOURCES map inside the worker; relative imports between the given
 * files resolve against each other. Returns every deployable contract found,
 * keyed by contract name.
 *
 * @example compileContracts({ "YourToken.sol": tokenSrc, "Vendor.sol": vendorSrc })
 */
export function compileContracts(sources: Record<string, string>): Promise<CompileResult> {
  return post({ sources });
}
