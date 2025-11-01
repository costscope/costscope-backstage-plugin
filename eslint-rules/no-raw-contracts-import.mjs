import path from 'node:path';

// Disallow importing from packages/contracts/src/* with relative or deep paths; enforce using '@costscope/contracts'
export default {
  meta: {
    type: 'problem',
    docs: { description: 'Enforce contracts imports via @costscope/contracts alias only' },
    schema: [],
    messages: {
      preferAlias: 'Import contracts code via "@costscope/contracts" alias, not raw path {{raw}}.'
    }
  },
  create(context) {
    return {
      ImportDeclaration(node) {
        const value = node.source.value;
        if (typeof value !== 'string') return;
        if (value.includes('@costscope/contracts')) return; // ok
        // Detect raw file system style path into contracts
        if (value.startsWith('..') || value.startsWith('.')) {
          const fileDir = path.dirname(context.getFilename());
          const resolved = path.resolve(fileDir, value);
          if (resolved.includes(path.sep + 'packages' + path.sep + 'contracts' + path.sep + 'src' + path.sep)) {
            context.report({ node, messageId: 'preferAlias', data: { raw: value } });
          }
        }
      }
    };
  }
};
