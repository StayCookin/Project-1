/**
 * This file provides a function to check if an array includes a value using a custom comparator.
 * The `arrayIncludesWith` function iterates over the elements of the given array and uses the
 * provided comparator function to determine if the target value is present in the array.
 * If the comparator returns true for any element, the function immediately returns true;
 * otherwise, it returns false after checking all elements.
 *
 * @private
 * @param {Array} [array] The array to inspect.
 * @param {*} target The value to search for.
 * @param {Function} comparator The comparator invoked per element.
 * @returns {boolean} Returns `true` if `target` is found, else `false`.
 */
function arrayIncludesWith(array, value, comparator) {
  var index = -1,
    length = array == null ? 0 : array.length;

  while (++index < length) {
    if (comparator(value, array[index])) {
      return true;
    }
  }
  return false;
}

module.exports = arrayIncludesWith;
