// Minimal CommonJS shim for eslint rule no-internal-imports-in-ui
module.exports = {
  meta: { type: 'problem', docs: { description: 'disallow internal or example workspace imports in UI layer' } },
  create: function(context) {
    const filename = context.getFilename();
    const isUi = /packages\/plugin\/src\//.test(filename);
    return {
      ImportDeclaration(node) {
        if (!isUi) return;
        const value = node.source.value;
        if (/\/internal\//.test(value)) {
          context.report({ node, message: 'Do not import internal modules from UI layer' });
        }
        if (/^examples\//.test(value) || /\.\.\/\.\.\/examples\//.test(value)) {
          context.report({ node, message: 'UI code must not import from examples/* workspace' });
        }
      }
    };
  }
};
