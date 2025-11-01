// Minimal CommonJS shim for @backstage/plugin-catalog-react used in tests to avoid
// Jest parsing ESM bundles from node_modules during collection time. This shim
// provides only the small part of the API used by the costscope plugin tests.

exports.useEntity = function useEntity() {
  // Return a stub entity shape sufficient for hooks that only read metadata.name
  return { entity: { metadata: { name: 'mock-entity' } } };
};

// Re-export any other helpers as no-op fallbacks to keep imports safe in tests
exports.Entity = function Entity() { return null; };
