// Custom ESLint rule: disallow direct console.* in runtime code.
// Use the central logger (utils/logger) instead.
// Allowed direct usage files: utils/logger.ts, scripts/mock-server.ts
export default {
  meta: {
    type: 'problem',
    docs: { description: 'Disallow direct console.* in runtime code; use logger from utils/logger.' },
    schema: [
      {
        type: 'object',
        properties: { allow: { type: 'array', items: { type: 'string' } } },
        additionalProperties: false,
      },
    ],
    messages: {
      noConsole: 'Use logger (utils/logger) instead of direct console.* (allowed only in: {{allowList}})'.trim(),
    },
  },
  create(context) {
    const filename = context.getFilename();
    if (!filename.includes('/src/') || filename.endsWith('.d.ts')) return {};
    const opts = context.options?.[0] || {};
    const allow = new Set([
      'src/utils/logger.ts',
      'scripts/mock-server.ts',
      ...(opts.allow || []),
    ]);
    const isTest = /\.test\.[tj]sx?$/.test(filename) || filename.includes('__tests__');
    if (isTest) return {};
    if ([...allow].some(a => filename.endsWith(a))) return {};
    return {
      MemberExpression(node) {
        if (node.object && node.object.name === 'console') {
          context.report({ node, messageId: 'noConsole', data: { allowList: [...allow].join(', ') } });
        }
      },
    };
  },
};
