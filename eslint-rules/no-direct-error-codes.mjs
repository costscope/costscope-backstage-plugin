// Disallow direct usage of Costscope error code string literals outside central definition & tests.
// Enforce importing from errorCodes.ts (CostscopeErrorCodes / CostscopeErrorCode).
const ERROR_CODES = new Set(['TIMEOUT','HTTP_ERROR','NETWORK_ERROR','VALIDATION_ERROR','UNKNOWN']);

export default {
  meta: {
    type: 'problem',
    docs: { description: 'Disallow raw Costscope error code string literals; use CostscopeErrorCodes constant.' },
    schema: [],
    messages: {
      noDirect: 'Use CostscopeErrorCodes.<NAME> instead of hardcoded "{{code}}"',
    },
  },
  create(context) {
    function isAllowedFile(filename) {
      if (filename.endsWith('errorCodes.ts')) return true; // legacy/shim source
      if (filename.endsWith('constants/errors.ts')) return true; // consolidated source of truth
      if (filename.endsWith('.d.ts')) return true; // declaration artifacts
      if (/\.test\.(ts|tsx)$/.test(filename)) return true; // tests may assert raw values
      return false;
    }
    function reportIfLiteral(node, value) {
      if (!ERROR_CODES.has(value)) return;
      const filename = context.getFilename();
      if (isAllowedFile(filename)) return;
      context.report({ node, messageId: 'noDirect', data: { code: value } });
    }
    return {
      Literal(node) {
        if (typeof node.value === 'string') reportIfLiteral(node, node.value);
      },
      TemplateElement(node) {
        if (node.value && typeof node.value.raw === 'string') reportIfLiteral(node, node.value.raw);
      },
    };
  },
};
