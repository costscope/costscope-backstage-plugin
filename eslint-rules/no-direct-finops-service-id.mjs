// Custom ESLint rule: disallow hardcoded FinOps service id literals outside constants.ts
// Ensures a single source of truth via DEFAULT_SERVICE_ID.
export default {
  meta: {
    type: 'problem',
    docs: {
  description: "Disallow direct string literals for the FinOps service id outside constants.ts; use DEFAULT_SERVICE_ID instead.",
    },
    schema: [],
    messages: {
  noDirect: "Use DEFAULT_SERVICE_ID from constants instead of hardcoding service id literals.",
    },
  },
  create(context) {
    function isAllowed(filename) {
      // Allow defining the literal only within the consolidated constants module
      return (
        filename.endsWith('constants.ts') ||
        filename.endsWith('constants/index.ts') ||
        filename.endsWith('.d.ts')
      );
    }
    return {
      Literal(node) {
        if (typeof node.value !== 'string') return;
  const banned = new Set(['finops-insights', 'costscope']);
  if (!banned.has(node.value)) return;
        const filename = context.getFilename();
        if (isAllowed(filename)) return;
        context.report({ node, messageId: 'noDirect' });
      },
      TemplateElement(node) {
        if (node.value && node.value.cooked && ['finops-insights', 'costscope'].includes(node.value.cooked)) {
          const filename = context.getFilename();
          if (isAllowed(filename)) return;
          context.report({ node, messageId: 'noDirect' });
        }
      },
    };
  },
};
