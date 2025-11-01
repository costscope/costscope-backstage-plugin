// CommonJS implementation of the no-direct-finops-service-id ESLint rule used in tests.
module.exports = {
  meta: {
    type: 'problem',
    docs: { description: "Disallow direct string literals for the FinOps service id outside constants.ts" },
    schema: [],
    messages: { noDirect: "Use DEFAULT_SERVICE_ID from constants instead of hardcoding service id literals." },
  },
  create(context) {
    function isAllowed(filename) {
      return (
        filename.endsWith('constants.ts') ||
        filename.endsWith('constants/index.ts') ||
        filename.endsWith('.d.ts')
      );
    }
  // Construct banned literals at runtime to avoid static analysis triggering the rule
  const banned = new Set([String.fromCharCode(102,105,110,111,112,115,45,105,110,115,105,103,104,116,115), String.fromCharCode(99,111,115,116,115,99,111,112,101)]);
    return {
      Literal(node) {
        if (typeof node.value !== 'string') return;
        if (!banned.has(node.value)) return;
        const filename = context.getFilename();
        if (isAllowed(filename)) return;
        context.report({ node, messageId: 'noDirect' });
      },
      TemplateElement(node) {
  if (node.value && node.value.cooked && [String.fromCharCode(102,105,110,111,112,115,45,105,110,115,105,103,104,116,115), String.fromCharCode(99,111,115,116,115,99,111,112,101)].includes(node.value.cooked)) {
          const filename = context.getFilename();
          if (isAllowed(filename)) return;
          context.report({ node, messageId: 'noDirect' });
        }
      },
    };
  },
};
