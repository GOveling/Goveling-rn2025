// Babel plugin to transform import.meta
module.exports = function() {
  return {
    name: 'transform-import-meta',
    visitor: {
      MetaProperty(path) {
        if (path.node.meta.name === 'import' && path.node.property.name === 'meta') {
          path.replaceWith({
            type: 'MemberExpression',
            object: {
              type: 'Identifier',
              name: 'globalThis'
            },
            property: {
              type: 'Identifier',
              name: 'importMeta'
            },
            computed: false
          });
        }
      }
    }
  };
};
