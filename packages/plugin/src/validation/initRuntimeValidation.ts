// Central helper to lazily initialize runtime validation (client-visible shim path retained).
let initPromise: Promise<any> | undefined;

export function initRuntimeValidation(): Promise<any | undefined> {
  if (initPromise) return initPromise;
  try {
    const env = (globalThis as any)?.process?.env;
    if (env?.COSTSCOPE_RUNTIME_VALIDATE === 'true') {
      initPromise = import('../validation');
    } else {
      initPromise = Promise.resolve(undefined);
    }
  } catch {
    initPromise = Promise.resolve(undefined);
  }
  return initPromise;
}
