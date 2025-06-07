// This file provides a function to check if an array includes a certain value.
// It exports a single function, `arrayIncludes`, which uses a specialized version of
// `_.includes` for arrays. This specialized version does not support specifying
// an index to search from; it always starts at the beginning of the array.

var baseIndexOf = require("./_baseIndexOf");

/**
 * A specialized version of `_.includes` for arrays without support for
 * specifying an index to search from.
 *
 * @private
 * @param {Array} [array] The array to inspect.
 * @param {*} target The value to search for.
 * @returns {boolean} Returns `true` if `target` is found, else `false`.
 */
function arrayIncludes(array, value) {
  var length = array == null ? 0 : array.length;
  return !!length && baseIndexOf(array, value, 0) > -1;
}

module.exports = arrayIncludes;
