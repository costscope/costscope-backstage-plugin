// Minimal browser-friendly mock for '@costscope/contracts' to unblock Storybook bundling.
// Exports only what the UI may touch at runtime via dynamic import in validation.ts.

export const OPENAPI_SPEC_HASH = '00000000';

export function verifyDescriptorHash(opts: { descriptorHash: string }) {
  const fragment = OPENAPI_SPEC_HASH.slice(0, 8);
  const dh = (opts?.descriptorHash || '').slice(0, 8);
  return { matches: dh === fragment, comparedSpecFragment: fragment };
}

// Note: Types like `paths` are type-only in our UI code and stripped by the TS loader,
// so we don't export them here.
