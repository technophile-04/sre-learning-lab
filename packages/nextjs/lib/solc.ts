// Main-thread wrapper around the solc web-worker.
// Lazily spawns the worker on first compile, then reuses it across requests.

export type CompileResult =
  | { ok: true; abi: unknown[]; bytecode: `0x${string}`; warnings: string[] }
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
        warnings: (rest.warnings as string[]) ?? [],
      });
    } else {
      resolver({ ok: false, errors: (rest.errors as string[]) ?? ["unknown error"] });
    }
  };
  return worker;
}

export function compileSolidity(source: string): Promise<CompileResult> {
  const w = ensureWorker();
  const id = String(nextId++);
  return new Promise(resolve => {
    pending.set(id, resolve);
    w.postMessage({ id, source });
  });
}
