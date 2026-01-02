/**
 * jQNext - Object Utilities
 * Object manipulation and iteration functions
 */

import { isFunction, isArray, isArrayLike, isPlainObject, isWindow } from './type.js';

/**
 * Merge the contents of two or more objects together into the first object
 * @param {boolean|Object} deep - If true, performs deep merge. Or target object.
 * @param {Object} target - The object to extend (if deep is boolean)
 * @param {...Object} sources - Objects containing properties to merge
 * @returns {Object} - The target object
 */
export function extend(deep, target, ...sources) {
  let isDeep = false;
  let targetObj = deep;
  let objectsToMerge = [target, ...sources];
  
  // Handle deep copy situation
  if (typeof deep === 'boolean') {
    isDeep = deep;
    targetObj = target;
    objectsToMerge = sources;
  }
  
  // Handle case when target is not an object
  if (typeof targetObj !== 'object' && !isFunction(targetObj)) {
    targetObj = {};
  }
  
  objectsToMerge.forEach(src => {
    if (src == null) return;
    
    for (const key in src) {
      const srcVal = src[key];
      
      // Prevent Object.prototype pollution
      if (key === '__proto__' || targetObj === srcVal) {
        continue;
      }
      
      // Recurse if we're merging plain objects or arrays
      if (isDeep && srcVal && (isPlainObject(srcVal) || isArray(srcVal))) {
        const existingVal = targetObj[key];
        let clone;
        
        if (isArray(srcVal)) {
          clone = existingVal && isArray(existingVal) ? existingVal : [];
        } else {
          clone = existingVal && isPlainObject(existingVal) ? existingVal : {};
        }
        
        targetObj[key] = extend(isDeep, clone, srcVal);
      } else if (srcVal !== undefined) {
        targetObj[key] = srcVal;
      }
    }
  });
  
  return targetObj;
}

/**
 * Iterate over an object or array, executing a function for each element
 * @param {Object|Array} obj - Object or array to iterate
 * @param {Function} callback - Function to execute for each element (index/key, value)
 * @returns {Object|Array} - The original object
 */
export function each(obj, callback) {
  if (isArrayLike(obj)) {
    const length = obj.length;
    for (let i = 0; i < length; i++) {
      if (callback.call(obj[i], i, obj[i]) === false) {
        break;
      }
    }
  } else {
    for (const key in obj) {
      if (callback.call(obj[key], key, obj[key]) === false) {
        break;
      }
    }
  }
  
  return obj;
}

/**
 * Translate all items in an array or object to new array of items
 * @param {Object|Array} obj - Object or array to iterate
 * @param {Function} callback - Function to execute for each element (value, index/key)
 * @returns {Array} - New array with the results
 */
export function map(obj, callback) {
  const result = [];
  
  if (isArrayLike(obj)) {
    const length = obj.length;
    for (let i = 0; i < length; i++) {
      const value = callback(obj[i], i);
      if (value != null) {
        result.push(value);
      }
    }
  } else {
    for (const key in obj) {
      const value = callback(obj[key], key);
      if (value != null) {
        result.push(value);
      }
    }
  }
  
  return result.flat();
}

/**
 * Finds the elements of an array which satisfy a filter function
 * @param {Array} array - Array to filter
 * @param {Function} callback - Filter function (element, index)
 * @param {boolean} [invert=false] - If true, return elements that don't match
 * @returns {Array} - Filtered array
 */
export function grep(array, callback, invert = false) {
  const result = [];
  const length = array.length;
  const expectTrue = !invert;
  
  for (let i = 0; i < length; i++) {
    const retVal = !!callback(array[i], i);
    if (retVal === expectTrue) {
      result.push(array[i]);
    }
  }
  
  return result;
}

/**
 * Search for a specified value within an array
 * @param {*} elem - Value to search for
 * @param {Array} array - Array to search
 * @param {number} [fromIndex=0] - Index to start from
 * @returns {number} - Index of element, or -1 if not found
 */
export function inArray(elem, array, fromIndex = 0) {
  return array == null ? -1 : Array.prototype.indexOf.call(array, elem, fromIndex);
}

/**
 * Merge the contents of two arrays together into the first array
 * @param {Array} first - Array to receive elements
 * @param {Array} second - Array to merge into first
 * @returns {Array} - The first array
 */
export function merge(first, second) {
  const len = +second.length;
  let j = 0;
  let i = first.length;
  
  for (; j < len; j++) {
    first[i++] = second[j];
  }
  
  first.length = i;
  
  return first;
}

/**
 * Convert an array-like object into a true JavaScript array
 * @param {*} arrayLike - Any array-like object
 * @returns {Array} - Array containing the elements
 */
export function makeArray(arrayLike, results = []) {
  const arr = results;
  
  if (arrayLike != null) {
    if (isArrayLike(Object(arrayLike))) {
      merge(arr, typeof arrayLike === 'string' ? [arrayLike] : arrayLike);
    } else {
      arr.push(arrayLike);
    }
  }
  
  return arr;
}

/**
 * Bind a function to a context
 * @param {Function} fn - Function to bind
 * @param {Object} context - Context to bind to
 * @param {...*} args - Arguments to prepend to function calls
 * @returns {Function} - Bound function
 */
export function proxy(fn, context, ...args) {
  if (!isFunction(fn)) {
    return undefined;
  }
  
  // Support: jQuery-style arguments (context, name)
  if (typeof context === 'string') {
    const tmp = fn[context];
    context = fn;
    fn = tmp;
  }
  
  // Create bound function
  const bound = function(...callArgs) {
    return fn.apply(
      context || this,
      args.concat(callArgs)
    );
  };
  
  // Set a unique guid so we can remove the bound function later
  bound.guid = fn.guid = fn.guid || proxy.guid++;
  
  return bound;
}

proxy.guid = 1;

/**
 * An empty function - used as placeholder
 */
export function noop() {}

/**
 * Return the current time
 * @returns {number} - Current timestamp in milliseconds
 */
export function now() {
  return Date.now();
}

/**
 * Sort an array of DOM elements, in place, removing duplicates
 * @param {Array} results - Array to sort and dedupe
 * @returns {Array} - The sorted array
 */
export function uniqueSort(results) {
  // Handle null, undefined, or non-array-like
  if (!results) {
    return results || [];
  }
  
  // Ensure it's array-like
  if (typeof results !== 'object' || typeof results.length !== 'number') {
    return [];
  }
  
  if (!results.length) {
    return [];
  }
  
  const seen = new Set();
  const unique = [];
  
  for (let i = 0; i < results.length; i++) {
    const elem = results[i];
    if (elem && !seen.has(elem)) {
      seen.add(elem);
      unique.push(elem);
    }
  }
  
  // Sort by document position if elements
  if (unique[0] && typeof unique[0].compareDocumentPosition === 'function') {
    unique.sort((a, b) => {
      if (a === b) return 0;
      if (!a || !b || !a.compareDocumentPosition) return 0;
      const compare = a.compareDocumentPosition(b);
      if (compare & 4) return -1; // a is before b
      if (compare & 2) return 1;  // a is after b
      return 0;
    });
  }
  
  return unique;
}

/**
 * Check if an element is contained within another
 * @param {Element} container - Potential container element
 * @param {Element} contained - Element to check
 * @returns {boolean} - True if contained is inside container
 */
export function contains(container, contained) {
  // Element.contains works for most cases
  if (container.contains) {
    return container !== contained && container.contains(contained);
  }
  
  // Fallback for older browsers
  if (container.compareDocumentPosition) {
    return !!(container.compareDocumentPosition(contained) & 16);
  }
  
  return false;
}

/**
 * Execute some JavaScript code globally
 * @param {string} code - Code to execute
 */
export function globalEval(code) {
  if (code && /\S/.test(code)) {
    // Use indirect eval to run code in global scope
    const script = document.createElement('script');
    script.text = code;
    document.head.appendChild(script).parentNode.removeChild(script);
  }
}

export default {
  extend,
  each,
  map,
  grep,
  inArray,
  merge,
  makeArray,
  proxy,
  noop,
  now,
  uniqueSort,
  contains,
  globalEval
};