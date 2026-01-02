/**
 * jQNext - Data Storage
 * WeakMap-based data storage for elements (replaces jQuery's $.data)
 */

// Use WeakMap for memory-efficient data storage
const dataCache = new WeakMap();

// Unique identifier for internal data
export const expando = 'jQNext' + Date.now() + Math.random().toString(36).slice(2);

/**
 * Get or create the data object for an element
 * @param {Object} owner - Element or object to get data for
 * @returns {Object} - Data object for the owner
 */
function getData(owner) {
  let data = dataCache.get(owner);
  if (!data) {
    data = {};
    // Only set for nodes that can accept data
    if (acceptsData(owner)) {
      dataCache.set(owner, data);
    }
  }
  return data;
}

/**
 * Check if an object can have data attached to it
 * @param {Object} owner - Object to check
 * @returns {boolean}
 */
function acceptsData(owner) {
  // Accept data on:
  // - Objects (any object without a fixed type)
  // - Element nodes
  // - Document nodes
  // Reject on:
  // - null/undefined
  // - Text nodes
  // - Comment nodes
  // - Processing instruction nodes
  // - Embedded elements (applets, object)
  return owner != null && (
    owner.nodeType === 1 ||
    owner.nodeType === 9 ||
    owner.nodeType === 11 ||
    !+owner.nodeType // Objects without nodeType (plain objects)
  );
}

/**
 * Convert data attribute name to property key
 * @param {string} key - Attribute name
 * @returns {string} - Property key
 */
function camelCase(key) {
  return key.replace(/-([a-z])/g, (_, letter) => letter.toUpperCase());
}

/**
 * Get value from HTML5 data attributes
 * @param {Element} elem - Element to get data from
 * @param {string} key - Data key (without 'data-' prefix)
 * @returns {*} - Data value
 */
function dataAttr(elem, key) {
  if (elem.nodeType !== 1) return undefined;
  
  const name = 'data-' + key.replace(/[A-Z]/g, '-$&').toLowerCase();
  const data = elem.getAttribute(name);
  
  if (data === null) {
    return undefined;
  }
  
  // Try to parse the value
  if (data === 'true') return true;
  if (data === 'false') return false;
  if (data === 'null') return null;
  
  // Convert to number if it represents a number
  if (data === +data + '') return +data;
  
  // Try to parse as JSON
  if (/^(?:\{[\w\W]*\}|\[[\w\W]*\])$/.test(data)) {
    try {
      return JSON.parse(data);
    } catch (e) {
      // Not valid JSON, return as string
    }
  }
  
  return data;
}

/**
 * Set data on an element
 * @param {Object} owner - Element or object
 * @param {string|Object} key - Data key or object of key-value pairs
 * @param {*} [value] - Value to set
 */
export function setData(owner, key, value) {
  const cache = getData(owner);
  
  if (typeof key === 'string') {
    cache[camelCase(key)] = value;
  } else if (typeof key === 'object') {
    // Set multiple values
    for (const k in key) {
      cache[camelCase(k)] = key[k];
    }
  }
}

/**
 * Get data from an element
 * @param {Object} owner - Element or object
 * @param {string} [key] - Data key (optional, returns all data if not provided)
 * @returns {*} - Data value or all data
 */
export function getDataValue(owner, key) {
  const cache = getData(owner);
  
  if (key === undefined) {
    // Return all data, including data attributes
    if (owner.nodeType === 1) {
      // Populate from data- attributes if not already done
      if (!cache._attrsRead && owner.dataset) {
        for (const attr in owner.dataset) {
          if (!(attr in cache)) {
            cache[attr] = dataAttr(owner, attr);
          }
        }
        cache._attrsRead = true;
      }
    }
    
    // Return copy without internal properties
    const result = {};
    for (const k in cache) {
      if (!k.startsWith('_')) {
        result[k] = cache[k];
      }
    }
    return result;
  }
  
  const camelKey = camelCase(key);
  
  // Check cache first
  if (camelKey in cache) {
    return cache[camelKey];
  }
  
  // Fall back to data attribute
  if (owner.nodeType === 1) {
    const value = dataAttr(owner, key);
    if (value !== undefined) {
      // Cache for future access
      cache[camelKey] = value;
      return value;
    }
  }
  
  return undefined;
}

/**
 * Remove data from an element
 * @param {Object} owner - Element or object
 * @param {string|string[]} [key] - Data key(s) to remove (removes all if not provided)
 */
export function removeData(owner, key) {
  if (key === undefined) {
    // Remove all data
    dataCache.delete(owner);
    return;
  }
  
  const cache = getData(owner);
  const keys = Array.isArray(key) ? key : [key];
  
  keys.forEach(k => {
    delete cache[camelCase(k)];
  });
}

/**
 * Check if an element has any data
 * @param {Object} owner - Element or object
 * @returns {boolean}
 */
export function hasData(owner) {
  const cache = dataCache.get(owner);
  if (!cache) return false;
  
  // Check if there are any non-internal properties
  for (const key in cache) {
    if (!key.startsWith('_')) {
      return true;
    }
  }
  return false;
}

/**
 * Get internal data (prefixed with '_')
 * @param {Object} owner - Element or object
 * @param {string} key - Internal data key
 * @returns {*}
 */
export function getInternalData(owner, key) {
  const cache = getData(owner);
  return cache['_' + key];
}

/**
 * Set internal data (prefixed with '_')
 * @param {Object} owner - Element or object
 * @param {string} key - Internal data key
 * @param {*} value - Value to set
 */
export function setInternalData(owner, key, value) {
  const cache = getData(owner);
  cache['_' + key] = value;
}

/**
 * Remove internal data
 * @param {Object} owner - Element or object
 * @param {string} key - Internal data key
 */
export function removeInternalData(owner, key) {
  const cache = getData(owner);
  delete cache['_' + key];
}

/**
 * Clean up all data associated with removed elements
 * Should be called when elements are removed from DOM
 * @param {Element|Element[]} elems - Elements to clean up
 */
export function cleanData(elems) {
  const elements = Array.isArray(elems) ? elems : [elems];
  
  elements.forEach(elem => {
    // Remove data
    dataCache.delete(elem);
    
    // Also clean children
    if (elem.nodeType === 1) {
      const children = elem.getElementsByTagName('*');
      for (let i = 0; i < children.length; i++) {
        dataCache.delete(children[i]);
      }
    }
  });
}

export default {
  expando,
  setData,
  getDataValue,
  removeData,
  hasData,
  getInternalData,
  setInternalData,
  removeInternalData,
  cleanData
};