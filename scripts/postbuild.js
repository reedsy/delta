'use strict';
// Generates dist/Delta.d.mts — the ESM type declaration used by `node16` /
// `bundler` moduleResolution consumers.
//
// TypeScript treats .d.ts files as CJS when the package has no "type":"module",
// so default imports from ESM TypeScript resolve to the module namespace
// (not constructable). A .d.mts file is always treated as ESM regardless of
// the package type field, fixing the construct-signature error.
//
// We re-export the *named* Delta export as `default` (not `export { default }`)
// so TypeScript resolves it as the class type rather than the CJS module.exports
// namespace.
const { writeFileSync } = require('fs');
writeFileSync(
  `${__dirname}/../dist/Delta.d.mts`,
  'export { Delta as default, Delta, Op, OpIterator, AttributeMap } from "./Delta.js";\n',
);
