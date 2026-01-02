/**
 * jQNext - Type Utilities
 * Type checking and conversion functions
 */

const class2type = {};
const toString = class2type.toString;
const hasOwn = class2type.hasOwnProperty;

// Populate class2type map
'Boolean Number String Function Array Date RegExp Object Error Symbol'.split(' ').forEach(name => {
  class2type[`[object ${name}]`] = name.toLowerCase();
});

/**
 * Determine the internal JavaScript [[Class]] of an object
 * @param {*} obj - Value to check
 * @returns {string} - Type string (e.g., 'array', 'object', 'function')
 */
export function type(obj) {
  if (obj == null) {
    return obj + '';
  }
  return typeof obj === 'object' || typeof obj === 'function'
    ? class2type[toString.call(obj)] || 'object'
    : typeof obj;
}

/**
 * Check if value is array-like (has length and numeric indices)
 * @param {*} obj - Value to check
 * @returns {boolean}
 */
export function isArrayLike(obj) {
  // Defensive checks
  if (obj == null || isWindow(obj)) {
    return false;
  }
  
  // Must be an object
  if (typeof obj !== 'object' && typeof obj !== 'function') {
    return false;
  }
  
  // No functions
  if (typeof obj === 'function') {
    return false;
  }
  
  const length = obj.length;
  const objType = type(obj);
  
  // Elements with length
  if (obj.nodeType === 1 && length) {
    return true;
  }
  
  // Arrays
  if (objType === 'array') {
    return true;
  }
  
  // Empty array-like
  if (length === 0) {
    return true;
  }
  
  // Array-like with valid length
  if (typeof length === 'number' && length > 0) {
    try {
      return (length - 1) in obj;
    } catch (e) {
      return false;
    }
  }
  
  return false;
}

/**
 * Check if value is an array
 * @param {*} obj - Value to check
 * @returns {boolean}
 */
export function isArray(obj) {
  return Array.isArray(obj);
}

/**
 * Check if value is a function
 * @param {*} obj - Value to check
 * @returns {boolean}
 */
export function isFunction(obj) {
  return typeof obj === 'function' && typeof obj.nodeType !== 'number';
}

/**
 * Check if value is a window object
 * @param {*} obj - Value to check
 * @returns {boolean}
 */
export function isWindow(obj) {
  return obj != null && obj === obj.window;
}

/**
 * Check if value is a Document
 * @param {*} obj - Value to check
 * @returns {boolean}
 */
export function isDocument(obj) {
  return obj != null && obj.nodeType === 9;
}

/**
 * Check if value is an Element
 * @param {*} obj - Value to check
 * @returns {boolean}
 */
export function isElement(obj) {
  return obj != null && obj.nodeType === 1;
}

/**
 * Check if value is numeric
 * @param {*} obj - Value to check
 * @returns {boolean}
 */
export function isNumeric(obj) {
  const realType = type(obj);
  return (realType === 'number' || realType === 'string') && 
    !isNaN(obj - parseFloat(obj));
}

/**
 * Check if value is a plain object (created using {} or new Object)
 * @param {*} obj - Value to check
 * @returns {boolean}
 */
export function isPlainObject(obj) {
  if (!obj || type(obj) !== 'object' || obj.nodeType || isWindow(obj)) {
    return false;
  }
  
  try {
    if (obj.constructor && 
        !hasOwn.call(obj, 'constructor') && 
        !hasOwn.call(obj.constructor.prototype, 'isPrototypeOf')) {
      return false;
    }
  } catch (e) {
    return false;
  }
  
  // Own properties are enumerated firstly, so to speed up checking
  let key;
  for (key in obj) { /* empty */ }
  
  return key === undefined || hasOwn.call(obj, key);
}

/**
 * Check if object is empty (has no own enumerable properties)
 * @param {Object} obj - Object to check
 * @returns {boolean}
 */
export function isEmptyObject(obj) {
  for (const name in obj) {
    return false;
  }
  return true;
}

/**
 * Check if value is a string
 * @param {*} obj - Value to check
 * @returns {boolean}
 */
export function isString(obj) {
  return type(obj) === 'string';
}

/**
 * Check if value is undefined
 * @param {*} obj - Value to check
 * @returns {boolean}
 */
export function isUndefined(obj) {
  return obj === undefined;
}

/**
 * Check if value is null
 * @param {*} obj - Value to check
 * @returns {boolean}
 */
export function isNull(obj) {
  return obj === null;
}

/**
 * Check if value is a boolean
 * @param {*} obj - Value to check
 * @returns {boolean}
 */
export function isBoolean(obj) {
  return type(obj) === 'boolean';
}

/**
 * Check if value is an object (not null and typeof object or function)
 * @param {*} obj - Value to check
 * @returns {boolean}
 */
export function isObject(obj) {
  return obj != null && (typeof obj === 'object' || typeof obj === 'function');
}

export default {
  type,
  isArrayLike,
  isArray,
  isFunction,
  isWindow,
  isDocument,
  isElement,
  isNumeric,
  isPlainObject,
  isEmptyObject,
  isString,
  isUndefined,
  isNull,
  isBoolean,
  isObject
};