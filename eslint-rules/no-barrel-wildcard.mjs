// Custom ESLint rule: disallow `export *` (wildcard re-export) in the root barrel (src/index.ts)
// Rationale: enforce an explicit curated public surface; avoid accidental export of internals.
// Allowed elsewhere (e.g., nested feature barrels) to keep internal module ergonomics flexible.
export default {
  meta: {
    type: 'problem',
    docs: {
      description: 'Disallow wildcard re-exports (export * from ...) in root barrel (src/index.ts); require explicit named exports.',
    },
    schema: [],
    messages: {
      noWildcard: 'Do not use wildcard re-export in root barrel (src/index.ts); list explicit symbols instead.',
    },
  },
  create(context) {
    const filename = context.getFilename().replace(/\\/g, '/');
    // Match absolute or relative paths that end with src/index.ts
    const isRootBarrel = /(^|\/)src\/index\.ts$/.test(filename);
    if (!isRootBarrel) return {};
    return {
      ExportAllDeclaration(node) {
        context.report({ node, messageId: 'noWildcard' });
      },
    };
  },
};
