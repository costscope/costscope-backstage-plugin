// CommonJS shim that mirrors the real rule implementation for no-barrel-wildcard
module.exports = {
  meta: {
    type: 'problem',
    docs: {
      description:
        "Disallow wildcard re-exports (export * from ...) in root barrel (src/index.ts); require explicit named exports.",
    },
    schema: [],
    messages: {
      noWildcard:
        'Do not use wildcard re-export in root barrel (src/index.ts); list explicit symbols instead.',
    },
  },
  create: function (context) {
    const filename = context.getFilename().replace(/\\/g, '/');
    const isRootBarrel = /(^|\/)src\/index\.ts$/.test(filename);
    if (!isRootBarrel) return {};
    return {
      ExportAllDeclaration(node) {
        context.report({ node, messageId: 'noWildcard' });
      },
    };
  },
};
