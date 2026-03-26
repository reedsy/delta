export { default, Delta, Op, OpIterator, AttributeMap } from './Delta';

if (typeof module === 'object') {
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  const m = require('./Delta');
  module.exports = m.default;
  module.exports.default = m.default;
  module.exports.Delta = m.Delta;
  module.exports.Op = m.Op;
  module.exports.OpIterator = m.OpIterator;
  module.exports.AttributeMap = m.AttributeMap;
}
