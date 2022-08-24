/**
 * Combines the second array with the first array, without having to loop or change the reference of the first array.
 * @param arr1
 * @param arr2
 */
export function mergeArrays(arr1: Array<unknown>, arr2: Array<unknown>) {
  Array.prototype.push.apply(arr1, arr2);
}
