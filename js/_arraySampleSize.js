// This file provides a function to get a sample of a specified size from an array.
// It uses `baseClamp` to ensure the sample size is within the array bounds,
// `copyArray` to create a copy of the array, and `shuffleSelf` to shuffle the array
// and select the sample of the desired size.

var baseClamp = require("./_baseClamp"),
  copyArray = require("./_copyArray"),
  shuffleSelf = require("./_shuffleSelf");

/**
 * A specialized version of `_.sampleSize` for arrays.
 *
 * @private
 * @param {Array} array The array to sample.
 * @param {number} n The number of elements to sample.
 * @returns {Array} Returns the random elements.
 */
function arraySampleSize(array, n) {
  return shuffleSelf(copyArray(array), baseClamp(n, 0, array.length));
}

module.exports = arraySampleSize;
