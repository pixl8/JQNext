/*!
 * jQNext v1.0.0 - Modern jQuery 2.x Compatible Library
 * https://gitlab.com/ready-intelligence/jqnext
 * 
 * Copyright (c) 2026 Ready Intelligence
 * Released under the MIT License
 * 
 * A drop-in replacement for jQuery 2.x using modern JavaScript internals.
 * Compatible with jQuery UI 1.11.x
 */
(function (global, factory) {
  typeof exports === 'object' && typeof module !== 'undefined' ? module.exports = factory() :
  typeof define === 'function' && define.amd ? define('jquery', factory) :
  (global = typeof globalThis !== 'undefined' ? globalThis : global || self, global.jQuery = factory());
})(this, (function () { 'use strict';

  /**
   * jQNext - Pseudo Selector Engine
   * Support for jQuery-specific pseudo-selectors
   */

  /**
   * Check if element is visible
   * @param {Element} elem - Element to check
   * @returns {boolean}
   */
  function isVisible(elem) {
    return !!(elem.offsetWidth || elem.offsetHeight || elem.getClientRects().length);
  }

  /**
   * Pseudo-selector definitions
   * Each returns true if the element matches the pseudo
   */
  const pseudoSelectors = {
    // Visibility
    ':visible': (elem) => isVisible(elem),
    ':hidden': (elem) => !isVisible(elem),
    
    // :not() - handles jQuery pseudos inside
    ':not': (elem, index, collection, selector) => {
      if (!selector) return true;
      // Use matchesWithPseudo for the inner selector to handle jQuery pseudos
      return !matchesSingleSelectorForNot(elem, selector, index, collection);
    },
    
    // Position in set
    ':first': (elem, index) => index === 0,
    ':last': (elem, index, collection) => index === collection.length - 1,
    ':even': (elem, index) => index % 2 === 0,
    ':odd': (elem, index) => index % 2 === 1,
    ':eq': (elem, index, collection, param) => index === parseInt(param, 10),
    ':gt': (elem, index, collection, param) => index > parseInt(param, 10),
    ':lt': (elem, index, collection, param) => index < parseInt(param, 10),
    ':nth': (elem, index, collection, param) => index === parseInt(param, 10),
    
    // Content
    ':contains': (elem, index, collection, text) => elem.textContent.indexOf(text) > -1,
    ':empty': (elem) => !elem.firstChild,
    ':parent': (elem) => !!elem.firstChild,
    ':has': (elem, index, collection, selector) => elem.querySelector(selector) !== null,
    
    // Form elements
    ':input': (elem) => /^(input|select|textarea|button)$/i.test(elem.nodeName),
    ':text': (elem) => elem.type === 'text',
    ':password': (elem) => elem.type === 'password',
    ':radio': (elem) => elem.type === 'radio',
    ':checkbox': (elem) => elem.type === 'checkbox',
    ':submit': (elem) => elem.type === 'submit',
    ':image': (elem) => elem.type === 'image',
    ':reset': (elem) => elem.type === 'reset',
    ':button': (elem) => elem.type === 'button' || elem.nodeName.toLowerCase() === 'button',
    ':file': (elem) => elem.type === 'file',
    
    // Form state
    ':enabled': (elem) => elem.disabled === false && !elem.matches('[disabled]'),
    ':disabled': (elem) => elem.disabled === true,
    ':checked': (elem) => elem.checked === true,
    ':selected': (elem) => elem.selected === true,
    ':focus': (elem) => elem === elem.ownerDocument.activeElement && elem.ownerDocument.hasFocus(),
    
    // Structure
    ':root': (elem) => elem === elem.ownerDocument.documentElement,
    ':target': (elem) => {
      const hash = window.location.hash;
      return hash && elem.id === hash.slice(1);
    },
    ':animated': (elem) => {
      // Check if element has running animations
      const animations = elem.getAnimations?.() || [];
      return animations.length > 0;
    },
    
    // Header elements
    ':header': (elem) => /^h[1-6]$/i.test(elem.nodeName),
    
    // First/last of type
    ':first-child': (elem) => elem.parentNode?.firstElementChild === elem,
    ':last-child': (elem) => elem.parentNode?.lastElementChild === elem,
    ':only-child': (elem) => {
      const parent = elem.parentNode;
      return parent?.firstElementChild === elem && parent?.lastElementChild === elem;
    },
    
    // Data attribute
    ':data': (elem, index, collection, key) => {
      if (key) {
        return elem.dataset[key] !== undefined;
      }
      return Object.keys(elem.dataset).length > 0;
    },
    
    // Lang
    ':lang': (elem, index, collection, lang) => {
      const elemLang = elem.lang || elem.closest('[lang]')?.lang || '';
      return elemLang.toLowerCase().startsWith(lang.toLowerCase());
    }
  };

  // Regex to match pseudo-selectors with optional parameters
  const pseudoRegex = /:([\w-]+)(?:\(([^)]*)\))?/g;

  /**
   * Check if a pseudo name is a jQuery-specific pseudo (not native CSS)
   * @param {string} name - Pseudo name without colon
   * @returns {boolean}
   */
  function isJQueryPseudo(name) {
    // Check both with and without colon prefix (plugins may add without colon)
    return pseudoSelectors[':' + name] !== undefined || pseudoSelectors[name] !== undefined;
  }

  /**
   * Parse a selector string and extract pseudo-selectors
   * @param {string} selector - Selector string
   * @returns {Object} - { baseSelector, pseudos: [{ name, param }] }
   */
  function parsePseudos(selector) {
    const pseudos = [];
    let baseSelector = selector;
    
    // Reset regex lastIndex
    pseudoRegex.lastIndex = 0;
    
    let match;
    while ((match = pseudoRegex.exec(selector)) !== null) {
      const [fullMatch, name, param] = match;
      
      // Check if it's a jQuery pseudo (not native CSS)
      // Also make sure it's not inside an attribute selector like [type='text']
      const beforeMatch = selector.substring(0, match.index);
      const insideAttr = (beforeMatch.match(/\[/g) || []).length > (beforeMatch.match(/\]/g) || []).length;
      
      if (!insideAttr && isJQueryPseudo(name)) {
        pseudos.push({
          name: ':' + name,
          param: param?.replace(/^['"]|['"]$/g, '') // Remove quotes
        });
        
        // Check if the pseudo was preceded by a space (descendant combinator)
        // In that case, replace with '*' to select all descendants
        const charBefore = match.index > 0 ? selector[match.index - 1] : '';
        if (charBefore === ' ' || charBefore === '\t' || charBefore === '\n') {
          // Replace the pseudo with '*' to get all descendants
          baseSelector = baseSelector.substring(0, match.index) + '*' + baseSelector.substring(match.index + fullMatch.length);
        } else {
          baseSelector = baseSelector.replace(fullMatch, '');
        }
      }
    }
    
    // Clean up the base selector - remove leading/trailing commas and whitespace
    baseSelector = baseSelector
      .replace(/^[\s,]+/, '')  // Remove leading whitespace and commas
      .replace(/[\s,]+$/, '')  // Remove trailing whitespace and commas
      .replace(/,\s*,/g, ',')  // Remove double commas
      .trim();
    
    // If selector is empty or just whitespace, default to '*'
    if (!baseSelector) {
      baseSelector = '*';
    }
    
    return { baseSelector, pseudos };
  }

  /**
   * Filter elements by jQuery pseudo-selectors
   * @param {Element[]} elements - Elements to filter
   * @param {Array} pseudos - Array of { name, param } objects
   * @returns {Element[]} - Filtered elements
   */
  function filterByPseudos(elements, pseudos) {
    if (!pseudos.length) return elements;
    
    let result = elements;
    
    for (const pseudo of pseudos) {
      // Check both with and without colon prefix (plugins may add without colon)
      const filterFn = pseudoSelectors[pseudo.name] || pseudoSelectors[pseudo.name.slice(1)];
      if (filterFn) {
        result = result.filter((elem, index, arr) =>
          filterFn(elem, index, arr, pseudo.param)
        );
      }
    }
    
    return result;
  }

  /**
   * Enhanced query selector with jQuery pseudo support
   * @param {string} selector - Selector string
   * @param {Element|Document} context - Context element
   * @returns {Element[]} - Matching elements
   */
  function querySelectorAllWithPseudo(selector, context = document) {
    // Ensure selector is a string
    if (typeof selector !== 'string' || !selector) {
      return [];
    }
    
    // Ensure context is valid
    if (!context || typeof context.querySelectorAll !== 'function') {
      // Try to use document if context is invalid
      context = document;
    }
    
    // Handle comma-separated selectors
    if (selector.indexOf(',') > -1) {
      const selectors = selector.split(',').map(s => s.trim());
      const results = new Set();
      
      selectors.forEach(sel => {
        querySelectorAllWithPseudo(sel, context).forEach(elem => results.add(elem));
      });
      
      return Array.from(results);
    }
    
    const { baseSelector, pseudos } = parsePseudos(selector);
    
    try {
      // Handle selectors starting with > (child combinator)
      let actualSelector = baseSelector;
      if (actualSelector.startsWith('>')) {
        // Need to scope the selector to the context
        if (context.id) {
          actualSelector = '#' + context.id + ' ' + actualSelector;
        } else {
          // Add a temporary ID
          const tempId = 'jqnext-temp-' + Math.random().toString(36).substr(2, 9);
          context.id = tempId;
          actualSelector = '#' + tempId + ' ' + actualSelector;
          const elements = Array.from(document.querySelectorAll(actualSelector));
          context.removeAttribute('id');
          return filterByPseudos(elements, pseudos);
        }
      }
      
      // First, try native querySelectorAll
      let elements = Array.from(context.querySelectorAll(actualSelector));
      
      // Then filter by jQuery pseudos
      return filterByPseudos(elements, pseudos);
    } catch (e) {
      // If native fails (invalid selector), return empty
      console.warn('Invalid selector:', selector, e);
      return [];
    }
  }

  /**
   * Check if a single element matches a selector with pseudo support
   * @param {Element} elem - Element to check
   * @param {string} selector - Selector string
   * @param {number} [index=0] - Element's index in the collection (for filter context)
   * @param {Element[]} [collection=null] - The full collection being filtered
   * @returns {boolean}
   */
  function matchesWithPseudo(elem, selector, index = 0, collection = null) {
    // Ensure selector is a string
    if (typeof selector !== 'string' || !selector) {
      return false;
    }
    
    // Ensure elem is valid
    if (!elem || !elem.matches) {
      return false;
    }
    
    // Default collection to just the element if not provided
    const coll = collection || [elem];
    const idx = collection ? index : 0;
    
    // Handle comma-separated selectors (element matches if ANY part matches)
    if (selector.indexOf(',') > -1) {
      const selectors = selector.split(',').map(s => s.trim()).filter(Boolean);
      return selectors.some(sel => matchesSingleSelector(elem, sel, idx, coll));
    }
    
    return matchesSingleSelector(elem, selector, idx, coll);
  }

  /**
   * Check if element matches a single (non-comma-separated) selector
   * @param {Element} elem - Element to check
   * @param {string} selector - Single selector string
   * @param {number} index - Element's index in the collection
   * @param {Element[]} collection - The full collection being filtered
   * @returns {boolean}
   */
  function matchesSingleSelector(elem, selector, index, collection) {
    const { baseSelector, pseudos } = parsePseudos(selector);
    
    // Check base selector first (if not just '*')
    if (baseSelector && baseSelector !== '*') {
      try {
        if (!elem.matches(baseSelector)) {
          return false;
        }
      } catch (e) {
        // Invalid selector - can't match
        return false;
      }
    }
    
    // Check all pseudos with proper index and collection context
    for (const pseudo of pseudos) {
      const filterFn = pseudoSelectors[pseudo.name];
      if (filterFn && !filterFn(elem, index, collection, pseudo.param)) {
        return false;
      }
    }
    
    return true;
  }

  /**
   * Check if element matches a single selector with proper collection context
   * This is used by :not() to properly evaluate index-based pseudos like :last
   * @param {Element} elem - Element to check
   * @param {string} selector - Single selector string
   * @param {number} index - Element's index in the collection
   * @param {Element[]} collection - The full collection being filtered
   * @returns {boolean}
   */
  function matchesSingleSelectorForNot(elem, selector, index, collection) {
    const { baseSelector, pseudos } = parsePseudos(selector);
    
    // Check base selector first (if not just '*')
    if (baseSelector && baseSelector !== '*') {
      try {
        if (!elem.matches(baseSelector)) {
          return false;
        }
      } catch (e) {
        // Invalid selector - can't match
        return false;
      }
    }
    
    // Check all pseudos with proper index and collection context
    for (const pseudo of pseudos) {
      const filterFn = pseudoSelectors[pseudo.name];
      if (filterFn && !filterFn(elem, index, collection, pseudo.param)) {
        return false;
      }
    }
    
    return true;
  }

  /**
   * jQNext - Data Storage
   * WeakMap-based data storage for elements (replaces jQuery's $.data)
   */

  // Use WeakMap for memory-efficient data storage
  const dataCache = new WeakMap();

  // Unique identifier for internal data
  const expando = 'jQNext' + Date.now() + Math.random().toString(36).slice(2);

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
  function camelCase$1(key) {
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
  function setData(owner, key, value) {
    const cache = getData(owner);
    
    if (typeof key === 'string') {
      cache[camelCase$1(key)] = value;
    } else if (typeof key === 'object') {
      // Set multiple values
      for (const k in key) {
        cache[camelCase$1(k)] = key[k];
      }
    }
  }

  /**
   * Get data from an element
   * @param {Object} owner - Element or object
   * @param {string} [key] - Data key (optional, returns all data if not provided)
   * @returns {*} - Data value or all data
   */
  function getDataValue(owner, key) {
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
    
    const camelKey = camelCase$1(key);
    
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
  function removeData(owner, key) {
    if (key === undefined) {
      // Remove all data
      dataCache.delete(owner);
      return;
    }
    
    const cache = getData(owner);
    const keys = Array.isArray(key) ? key : [key];
    
    keys.forEach(k => {
      delete cache[camelCase$1(k)];
    });
  }

  /**
   * Check if an element has any data
   * @param {Object} owner - Element or object
   * @returns {boolean}
   */
  function hasData(owner) {
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
  function getInternalData(owner, key) {
    const cache = getData(owner);
    return cache['_' + key];
  }

  /**
   * Set internal data (prefixed with '_')
   * @param {Object} owner - Element or object
   * @param {string} key - Internal data key
   * @param {*} value - Value to set
   */
  function setInternalData(owner, key, value) {
    const cache = getData(owner);
    cache['_' + key] = value;
  }

  /**
   * Remove internal data
   * @param {Object} owner - Element or object
   * @param {string} key - Internal data key
   */
  function removeInternalData(owner, key) {
    const cache = getData(owner);
    delete cache['_' + key];
  }

  /**
   * Clean up all data associated with removed elements
   * Should be called when elements are removed from DOM
   * @param {Element|Element[]} elems - Elements to clean up
   */
  function cleanData(elems) {
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
  function type(obj) {
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
  function isArrayLike(obj) {
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
  function isArray(obj) {
    return Array.isArray(obj);
  }

  /**
   * Check if value is a function
   * @param {*} obj - Value to check
   * @returns {boolean}
   */
  function isFunction(obj) {
    return typeof obj === 'function' && typeof obj.nodeType !== 'number';
  }

  /**
   * Check if value is a window object
   * @param {*} obj - Value to check
   * @returns {boolean}
   */
  function isWindow(obj) {
    return obj != null && obj === obj.window;
  }

  /**
   * Check if value is an Element
   * @param {*} obj - Value to check
   * @returns {boolean}
   */
  function isElement(obj) {
    return obj != null && obj.nodeType === 1;
  }

  /**
   * Check if value is numeric
   * @param {*} obj - Value to check
   * @returns {boolean}
   */
  function isNumeric(obj) {
    const realType = type(obj);
    return (realType === 'number' || realType === 'string') && 
      !isNaN(obj - parseFloat(obj));
  }

  /**
   * Check if value is a plain object (created using {} or new Object)
   * @param {*} obj - Value to check
   * @returns {boolean}
   */
  function isPlainObject(obj) {
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
  function isEmptyObject(obj) {
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
  function isString(obj) {
    return type(obj) === 'string';
  }

  /**
   * jQNext - Object Utilities
   * Object manipulation and iteration functions
   */


  /**
   * Merge the contents of two or more objects together into the first object
   * @param {boolean|Object} deep - If true, performs deep merge. Or target object.
   * @param {Object} target - The object to extend (if deep is boolean)
   * @param {...Object} sources - Objects containing properties to merge
   * @returns {Object} - The target object
   */
  function extend(deep, target, ...sources) {
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
  function each(obj, callback) {
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
  function map(obj, callback) {
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
  function grep(array, callback, invert = false) {
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
  function inArray(elem, array, fromIndex = 0) {
    return array == null ? -1 : Array.prototype.indexOf.call(array, elem, fromIndex);
  }

  /**
   * Merge the contents of two arrays together into the first array
   * @param {Array} first - Array to receive elements
   * @param {Array} second - Array to merge into first
   * @returns {Array} - The first array
   */
  function merge(first, second) {
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
  function makeArray(arrayLike, results = []) {
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
  function proxy(fn, context, ...args) {
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
  function noop() {}

  /**
   * Return the current time
   * @returns {number} - Current timestamp in milliseconds
   */
  function now() {
    return Date.now();
  }

  /**
   * Sort an array of DOM elements, in place, removing duplicates
   * @param {Array} results - Array to sort and dedupe
   * @returns {Array} - The sorted array
   */
  function uniqueSort(results) {
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
  function contains(container, contained) {
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
  function globalEval(code) {
    if (code && /\S/.test(code)) {
      // Use indirect eval to run code in global scope
      const script = document.createElement('script');
      script.text = code;
      document.head.appendChild(script).parentNode.removeChild(script);
    }
  }

  /**
   * jQNext - String Utilities
   * String manipulation functions
   */

  const rmsPrefix = /^-ms-/;
  const rdashAlpha = /-([a-z])/g;

  /**
   * Convert dashed string to camelCase
   * @param {string} str - String to convert
   * @returns {string} - camelCase string
   */
  function camelCase(str) {
    return str
      .replace(rmsPrefix, 'ms-')
      .replace(rdashAlpha, (all, letter) => letter.toUpperCase());
  }

  /**
   * Remove whitespace from beginning and end of string
   * Handles special whitespace: NBSP (\xA0), ZWSP (\uFEFF)
   * @param {string} str - String to trim
   * @returns {string} - Trimmed string
   */
  function trim(str) {
    if (str == null) {
      return '';
    }
    // Handle special whitespace characters that String.trim() might not handle
    return (str + '').replace(/^[\s\uFEFF\xA0]+|[\s\uFEFF\xA0]+$/g, '');
  }

  // Wrapper elements for special tags that can't be direct children of div
  const wrapMap = {
    // Table elements need proper wrappers
    thead: ['table'],
    tbody: ['table'],
    tfoot: ['table'],
    colgroup: ['table'],
    caption: ['table'],
    tr: ['table', 'tbody'],
    th: ['table', 'tbody', 'tr'],
    td: ['table', 'tbody', 'tr'],
    col: ['table', 'colgroup'],
    // Option/optgroup need select
    option: ['select'],
    optgroup: ['select'],
    // Legend needs fieldset
    legend: ['fieldset']
  };

  // Default wrapper is just a div (no special handling needed)
  const defaultWrapper = [];

  /**
   * Get the wrapper needed for a tag
   * @param {string} tag - Tag name (lowercase)
   * @returns {string[]} - Array of wrapper tag names from outermost to innermost
   */
  function getWrapper(tag) {
    return wrapMap[tag.toLowerCase()] || defaultWrapper;
  }

  /**
   * Parse a string into an array of DOM nodes
   * @param {string} data - HTML string to parse
   * @param {Document|boolean} [context=document] - Document context or keepScripts boolean
   * @param {boolean} [keepScripts=false] - Include script elements
   * @returns {Array|null} - Array of DOM nodes or null
   */
  function parseHTML(data, context, keepScripts) {
    // Handle null, undefined, empty string
    if (!data || typeof data !== 'string') {
      return null;
    }
    
    // Handle arguments - context can be boolean (keepScripts) or Document
    if (typeof context === 'boolean') {
      keepScripts = context;
      context = document;
    }
    
    // Default context
    if (!context) {
      context = document;
    }
    
    // Throw if context is an element (not a document)
    if (context.nodeType === 1) {
      throw new Error('Context must be a document, not an element');
    }
    
    // Get the actual document from context
    const doc = context.ownerDocument || context;
    
    // Simple single tag: $('<div>')
    const singleTagMatch = data.match(/^<([a-z][^\/\0>:\x20\t\r\n\f]*)[\x20\t\r\n\f]*\/?>(?:<\/\1>|)$/i);
    if (singleTagMatch) {
      return [doc.createElement(singleTagMatch[1])];
    }
    
    // Detect the first tag in the HTML to determine if wrapping is needed
    const tagMatch = data.match(/^[\s]*<([a-z][^\s>\/]*)/i);
    const firstTag = tagMatch ? tagMatch[1].toLowerCase() : '';
    const wrapper = getWrapper(firstTag);
    
    // Create a document fragment to hold parsed content
    const fragment = doc.createDocumentFragment();
    let tmp = doc.createElement('div');
    
    // Build wrapper structure if needed
    if (wrapper.length) {
      // Build opening tags
      let html = '';
      for (let i = 0; i < wrapper.length; i++) {
        html += '<' + wrapper[i] + '>';
      }
      html += data;
      // Build closing tags in reverse
      for (let i = wrapper.length - 1; i >= 0; i--) {
        html += '</' + wrapper[i] + '>';
      }
      tmp.innerHTML = html;
      
      // Drill down to the innermost wrapper to get the actual content
      for (let i = 0; i < wrapper.length; i++) {
        tmp = tmp.firstElementChild;
      }
    } else {
      // Use innerHTML to parse (no special wrapper needed)
      tmp.innerHTML = data;
    }
    
    // Move nodes to fragment
    let node;
    while ((node = tmp.firstChild)) {
      fragment.appendChild(node);
    }
    
    const nodes = Array.from(fragment.childNodes);
    
    // Remove scripts if not keeping them
    if (!keepScripts) {
      const filtered = [];
      nodes.forEach(node => {
        if (node.nodeType === 1 && node.tagName === 'SCRIPT') {
          return; // skip script elements
        }
        if (node.nodeType === 1) {
          // Remove nested scripts
          const scripts = node.querySelectorAll ? node.querySelectorAll('script') : [];
          scripts.forEach(script => script.parentNode && script.parentNode.removeChild(script));
        }
        filtered.push(node);
      });
      return filtered;
    }
    
    return nodes;
  }

  /**
   * Parse JSON string into an object
   * @param {string} data - JSON string to parse
   * @returns {*} - Parsed value
   */
  function parseJSON(data) {
    return JSON.parse(data);
  }

  /**
   * Parse XML string into an XML document
   * @param {string} data - XML string to parse
   * @returns {Document|null} - XML document or null
   */
  function parseXML(data) {
    // Handle non-string inputs
    if (data == null || typeof data !== 'string') {
      return null;
    }
    
    // Handle empty string
    if (!data.trim()) {
      return null;
    }
    
    const parser = new DOMParser();
    const xml = parser.parseFromString(data, 'text/xml');
    
    // Check for parsing errors
    const parseError = xml.getElementsByTagName('parsererror');
    if (parseError.length) {
      throw new Error('Invalid XML: ' + data);
    }
    
    return xml;
  }

  /**
   * Encode a set of form elements or object as a URL-encoded string
   * @param {Object|Array} obj - Object or array to serialize
   * @param {boolean} [traditional=false] - Use traditional parameter serialization
   * @returns {string} - URL-encoded string
   */
  function param(obj, traditional = false) {
    const parts = [];
    
    function add(key, valueOrFunction) {
      // If value is a function, invoke it and use its return value
      const value = typeof valueOrFunction === 'function' 
        ? valueOrFunction() 
        : valueOrFunction;
      
      parts.push(
        encodeURIComponent(key) + '=' + 
        encodeURIComponent(value == null ? '' : value)
      );
    }
    
    function buildParams(prefix, obj, traditional) {
      if (Array.isArray(obj)) {
        obj.forEach((v, i) => {
          if (traditional || /\[\]$/.test(prefix)) {
            // Treat each array item as a scalar
            add(prefix, v);
          } else {
            // Item is non-scalar (array or object), encode its numeric index
            buildParams(
              prefix + '[' + (typeof v === 'object' && v != null ? i : '') + ']',
              v,
              traditional
            );
          }
        });
      } else if (!traditional && typeof obj === 'object' && obj !== null) {
        // Serialize object item
        for (const name in obj) {
          buildParams(prefix + '[' + name + ']', obj[name], traditional);
        }
      } else {
        // Serialize scalar item
        add(prefix, obj);
      }
    }
    
    // Serialize the top-level object
    if (Array.isArray(obj)) {
      // Serialize array items (assume they are {name, value} objects)
      obj.forEach(item => {
        add(item.name, item.value);
      });
    } else {
      for (const prefix in obj) {
        buildParams(prefix, obj[prefix], traditional);
      }
    }
    
    return parts.join('&');
  }

  /**
   * Throw an error with the given message
   * @param {string} msg - Error message
   */
  function error$1(msg) {
    throw new Error(msg);
  }

  /**
   * jQNext - Collection Class
   * The core jQuery-compatible collection object
   */


  // Reference to the jQNext function (will be set by jqnext.js)
  let jQNext$1 = null;

  /**
   * Set the jQNext reference
   * @param {Function} fn - The jQNext function
   */
  function setJQNext(fn) {
    jQNext$1 = fn;
  }

  /**
   * Push context onto stack and return new collection
   * @param {jQCollection} collection - Collection to add to stack
   * @param {jQCollection} prev - Previous collection
   * @returns {jQCollection}
   */
  function pushStack(collection, prev) {
    // Build a new jQCollection
    const ret = jQNext$1(collection);
    
    // Add the old object onto the stack
    ret.prevObject = prev;
    
    // Inherit context from previous collection (jQuery compatibility)
    if (prev && prev.context) {
      ret.context = prev.context;
    }
    
    return ret;
  }

  /**
   * jQuery-compatible collection class
   * Extends Array to provide jQuery-like functionality
   */
  class jQCollection {
    constructor() {
      // Internal array to store elements
      this._elements = [];
      this.length = 0;
      
      // Store reference to previous collection for .end()
      this.prevObject = null;
      
      // Store the selector string used to create this collection
      this.selector = '';
      
      // Store the context used - default to document (jQuery compatibility)
      this.context = typeof document !== 'undefined' ? document : null;
    }
    
    /**
     * Initialize the collection with elements
     * @param {string|Element|NodeList|Array|Function} selector
     * @param {Element|Document|jQCollection} context
     */
    init(selector, context = document) {
      // Normalize context to DOM element(s)
      // Handle: jQCollection, array of elements, single element
      let contextElem;
      if (context instanceof jQCollection) {
        contextElem = context[0];
      } else if (Array.isArray(context) || (context && typeof context.length === 'number' && context !== window && !context.nodeType && !isString(context))) {
        // It's an array or array-like (but not window or string) - extract first element
        contextElem = context[0];
      } else {
        contextElem = context;
      }
      
      // Store context as DOM element (jQuery compatibility)
      this.context = contextElem || document;
      
      // Handle empty or null selector
      if (!selector) {
        this.selector = '';
        return this;
      }
      
      // Handle DOM ready: $(function)
      if (isFunction(selector)) {
        // DOM is already loaded
        if (document.readyState === 'complete' ||
            (document.readyState !== 'loading' && !document.documentElement.doScroll)) {
          setTimeout(() => selector(jQNext$1), 0);
        } else {
          document.addEventListener('DOMContentLoaded', () => selector(jQNext$1), { once: true });
        }
        return this;
      }
      
      // Handle string selector
      if (isString(selector)) {
        // HTML string: $('<div>') - but check for second arg being props object
        if (selector[0] === '<' && selector[selector.length - 1] === '>' && selector.length >= 3) {
          // Parse HTML
          const doc = context && context.ownerDocument ? context.ownerDocument :
                      (context && context.nodeType === 9 ? context : document);
          const nodes = parseHTML(selector, doc, true);
          this._push(nodes || []);
          
          // Handle props object: $('<div/>', { class: 'foo', text: 'bar' })
          if (context && isPlainObject(context)) {
            this._applyProps(context);
          }
          
          return this;
        }
        
        // Store selector string
        this.selector = selector;
        
        // Handle invalid selector starting with # followed by non-word characters
        if (selector === '#' || /^#[^a-zA-Z]/.test(selector) && !/^#[a-zA-Z_]/.test(selector)) {
          return this; // Return empty collection for invalid selectors like '#'
        }
        
        // CSS selector
        try {
          const elements = querySelectorAllWithPseudo(selector, contextElem);
          this._push(elements);
        } catch (e) {
          // Invalid selector - return empty collection
        }
        return this;
      }
      
      // Handle Element
      if (selector.nodeType) {
        this[0] = selector;
        this.length = 1;
        this.context = selector;
        return this;
      }
      
      // Handle Window
      if (isWindow(selector)) {
        this[0] = selector;
        this.length = 1;
        this.context = selector;
        return this;
      }
      
      // Handle jQCollection - copy selector
      if (selector instanceof jQCollection) {
        this._push(selector.toArray());
        this.selector = selector.selector;
        this.context = selector.context || document;
        return this;
      }
      
      // Handle Array-like objects (NodeList, HTMLCollection, Array)
      if (isArrayLike(selector)) {
        this._push(Array.from(selector));
        // context remains document (set in constructor)
        return this;
      }
      
      return this;
    }
    
    /**
     * Apply props object to elements (quick setter support)
     * @private
     * @param {Object} props - Properties/methods to apply
     */
    _applyProps(props) {
      for (const key in props) {
        const value = props[key];
        
        // Special handling for certain properties
        if (key === 'text') {
          // Set text content
          this.each(function() {
            this.textContent = value;
          });
        } else if (key === 'html') {
          // Set HTML content
          this.each(function() {
            this.innerHTML = value;
          });
        } else if (key === 'class') {
          // Set class attribute
          this.each(function() {
            this.className = value;
          });
        } else if (key === 'id') {
          // Set id
          this.each(function() {
            this.id = value;
          });
        } else if (typeof this[key] === 'function') {
          // Call the method if it exists on the collection
          if (isFunction(value)) {
            this[key](value);
          } else if (isPlainObject(value)) {
            // For methods like css, attr - pass the object
            this[key](value);
          } else if (Array.isArray(value)) {
            this[key](...value);
          } else {
            this[key](value);
          }
        } else {
          // Set as attribute
          this.each(function() {
            this.setAttribute(key, value);
          });
        }
      }
    }
    
    /**
     * Push elements into the collection
     * @private
     * @param {Element[]} elements
     */
    _push(elements) {
      for (let i = 0; i < elements.length; i++) {
        this[i] = elements[i];
      }
      this.length = elements.length;
    }
    
    // ==========================================
    // ARRAY-LIKE METHODS
    // ==========================================
    
    /**
     * Iterate over elements
     * @param {Function} callback - Function(index, element)
     * @returns {jQCollection}
     */
    each(callback) {
      for (let i = 0; i < this.length; i++) {
        if (callback.call(this[i], i, this[i]) === false) {
          break;
        }
      }
      return this;
    }
    
    /**
     * Create a new collection with the results of calling a function on every element
     * @param {Function} callback - Function(index, element)
     * @returns {jQCollection}
     */
    map(callback) {
      const result = [];
      for (let i = 0; i < this.length; i++) {
        const value = callback.call(this[i], i, this[i]);
        if (value != null) {
          result.push(value);
        }
      }
      return pushStack(result.flat(), this);
    }
    
    /**
     * Get the element at index, or all elements as array
     * @param {number} [index]
     * @returns {Element|Element[]}
     */
    get(index) {
      if (index === undefined) {
        return this.toArray();
      }
      return index < 0 ? this[this.length + index] : this[index];
    }
    
    /**
     * Convert to array
     * @returns {Element[]}
     */
    toArray() {
      return Array.prototype.slice.call(this);
    }
    
    /**
     * Get the index of an element
     * @param {Element|string} elem - Element or selector
     * @returns {number}
     */
    index(elem) {
      // No argument: return index of first element in parent
      if (!elem) {
        const first = this[0];
        if (first && first.parentNode) {
          return Array.from(first.parentNode.children).indexOf(first);
        }
        return -1;
      }
      
      // Selector: return index of first match
      if (isString(elem)) {
        return Array.prototype.indexOf.call(jQNext$1(elem), this[0]);
      }
      
      // Element: return its index in the collection
      const element = elem instanceof jQCollection ? elem[0] : elem;
      return Array.prototype.indexOf.call(this, element);
    }
    
    /**
     * Reduce the set of elements to the one at the specified index
     * @param {number} index
     * @returns {jQCollection}
     */
    eq(index) {
      const len = this.length;
      const j = +index + (index < 0 ? len : 0);
      return pushStack(j >= 0 && j < len ? [this[j]] : [], this);
    }
    
    /**
     * Get the first element
     * @returns {jQCollection}
     */
    first() {
      return this.eq(0);
    }
    
    /**
     * Get the last element
     * @returns {jQCollection}
     */
    last() {
      return this.eq(-1);
    }
    
    /**
     * Get a subset of elements
     * @param {number} start
     * @param {number} [end]
     * @returns {jQCollection}
     */
    slice(start, end) {
      return pushStack(Array.prototype.slice.call(this, start, end), this);
    }
    
    /**
     * End the most recent filtering operation
     * @returns {jQCollection}
     */
    end() {
      return this.prevObject || jQNext$1();
    }
    
    /**
     * Add the previous set of elements to the current set
     * @param {string} [selector] - Optional selector to filter previous set
     * @returns {jQCollection}
     */
    addBack(selector) {
      return this.add(selector ? this.prevObject?.filter(selector) : this.prevObject);
    }
    
    /**
     * Create a new jQCollection with elements added
     * @param {string|Element|jQCollection} selector
     * @param {Element|Document} [context]
     * @returns {jQCollection}
     */
    add(selector, context) {
      return pushStack(
        uniqueSort(merge(this.get(), jQNext$1(selector, context))),
        this
      );
    }
    
    // ==========================================
    // SELECTION & FILTERING
    // ==========================================
    
    /**
     * Find descendant elements
     * @param {string} selector
     * @returns {jQCollection}
     */
    find(selector) {
      const result = [];
      
      for (let i = 0; i < this.length; i++) {
        const found = querySelectorAllWithPseudo(selector, this[i]);
        merge(result, found);
      }
      
      return pushStack(this.length > 1 ? uniqueSort(result) : result, this);
    }
    
    /**
     * Filter elements by selector, function, or element
     * @param {string|Function|Element|jQCollection} selector
     * @returns {jQCollection}
     */
    filter(selector) {
      return pushStack(winnow(this, selector, false), this);
    }
    
    /**
     * Remove elements that match
     * @param {string|Function|Element|jQCollection} selector
     * @returns {jQCollection}
     */
    not(selector) {
      return pushStack(winnow(this, selector, true), this);
    }
    
    /**
     * Check if any element matches selector
     * @param {string|Function|Element|jQCollection} selector
     * @returns {boolean}
     */
    is(selector) {
      return !!winnow(this, selector, false).length;
    }
    
    /**
     * Reduce to elements that have descendant matching selector
     * @param {string|Element} selector
     * @returns {jQCollection}
     */
    has(selector) {
      const targets = jQNext$1(selector, this);
      
      return this.filter(function() {
        for (let i = 0; i < targets.length; i++) {
          if (this.contains(targets[i])) {
            return true;
          }
        }
        return false;
      });
    }
    
    /**
     * Get all child nodes including text nodes
     * @returns {jQCollection}
     */
    contents() {
      const result = [];
      
      for (let i = 0; i < this.length; i++) {
        const elem = this[i];
        
        // Handle iframe
        if (elem.nodeName.toLowerCase() === 'iframe') {
          result.push(elem.contentDocument || elem.contentWindow.document);
        } else {
          merge(result, elem.childNodes);
        }
      }
      
      return pushStack(result, this);
    }
    
    // ==========================================
    // DATA
    // ==========================================
    
    /**
     * Get/set data on elements
     * @param {string|Object} [key]
     * @param {*} [value]
     * @returns {*|jQCollection}
     */
    data(key, value) {
      // Get all data
      if (key === undefined) {
        if (this[0]) {
          return getDataValue(this[0]);
        }
        // Return null for empty collection (jQuery compatibility)
        return null;
      }
      
      // Get single value
      if (value === undefined && !isPlainObject(key)) {
        if (this[0]) {
          return getDataValue(this[0], key);
        }
        return undefined;
      }
      
      // Set data
      return this.each(function() {
        setData(this, key, value);
      });
    }
    
    /**
     * Remove data from elements
     * @param {string|string[]} [key]
     * @returns {jQCollection}
     */
    removeData(key) {
      return this.each(function() {
        removeData(this, key);
      });
    }
    
    // ==========================================
    // INTERNAL HELPERS
    // ==========================================
    
    /**
     * Push elements onto the stack (jQuery internal)
     * @param {Element[]} elems
     * @returns {jQCollection}
     */
    pushStack(elems) {
      return pushStack(elems, this);
    }
    
    /**
     * Create a function bound to this object
     * Used internally for callbacks
     * @param {Function} fn
     * @returns {Function}
     */
    _bind(fn) {
      const collection = this;
      return function(...args) {
        return fn.apply(collection, args);
      };
    }
  }

  // Make it array-like for iteration
  jQCollection.prototype[Symbol.iterator] = function* () {
    for (let i = 0; i < this.length; i++) {
      yield this[i];
    }
  };

  /**
   * Filter/not helper - jQuery's winnow function
   * @param {jQCollection} elements
   * @param {*} qualifier
   * @param {boolean} not
   * @returns {Element[]}
   */
  function winnow(elements, qualifier, not) {
    // Handle null/undefined qualifier
    if (qualifier == null) {
      return not ? Array.prototype.slice.call(elements) : [];
    }
    
    // Ensure elements is array-like
    if (!elements || typeof elements.length !== 'number') {
      return [];
    }
    
    // Single element
    if (isElement(qualifier)) {
      return Array.prototype.filter.call(elements, elem =>
        (elem === qualifier) !== not
      );
    }
    
    // Function
    if (isFunction(qualifier)) {
      return Array.prototype.filter.call(elements, (elem, i) =>
        !!qualifier.call(elem, i, elem) !== not
      );
    }
    
    // Array of elements
    if (isArrayLike(qualifier) && !isString(qualifier)) {
      const qualArr = Array.from(qualifier);
      const qualSet = new Set(qualArr);
      return Array.prototype.filter.call(elements, elem =>
        qualSet.has(elem) !== not
      );
    }
    
    // Selector string
    if (isString(qualifier)) {
      const elemArray = Array.prototype.slice.call(elements);
      return elemArray.filter((elem, index) => {
        if (!elem || !elem.matches) return not;
        return matchesWithPseudo(elem, qualifier, index, elemArray) !== not;
      });
    }
    
    return [];
  }

  /**
   * jQNext - Deferred/Promise Utilities
   * jQuery-compatible Deferred implementation using native Promises
   */


  /**
   * Create a Callbacks list
   * @param {string} options - Space-separated list of options
   * @returns {Object} - Callbacks list object
   */
  function Callbacks(options = '') {
    const opts = {};
    options.split(/\s+/).forEach(flag => {
      if (flag) opts[flag] = true;
    });
    
    let list = [];
    let firing = false;
    let firingIndex = -1;
    let memory = null;
    let fired = false;
    let locked = false;
    
    const fire = function() {
      locked = locked || opts.once;
      fired = firing = true;
      
      for (; firingIndex < list.length; firingIndex++) {
        const fn = list[firingIndex];
        if (fn && typeof fn === 'function') {
          if (fn.apply(memory[0], memory[1]) === false && opts.stopOnFalse) {
            memory = false;
            break;
          }
        }
      }
      
      firing = false;
      
      if (locked) {
        if (memory) {
          list = [];
        } else {
          list = '';
        }
      }
    };
    
    const self = {
      add: function(...args) {
        if (list) {
          // Save starting position for memory-triggered fire
          const firingStart = list.length;
          
          const addToList = (arg) => {
            if (isFunction(arg)) {
              if (!opts.unique || !self.has(arg)) {
                list.push(arg);
              }
            } else if (Array.isArray(arg)) {
              arg.forEach(addToList);
            }
          };
          
          args.forEach(addToList);
          
          if (memory && !firing) {
            // Reset firingIndex to point just before the new callbacks
            // so the loop starts at the first newly added callback
            firingIndex = firingStart - 1;
            fire();
          }
        }
        return this;
      },
      
      remove: function(...args) {
        args.forEach(arg => {
          let index;
          while ((index = list.indexOf(arg)) > -1) {
            list.splice(index, 1);
            if (index <= firingIndex) {
              firingIndex--;
            }
          }
        });
        return this;
      },
      
      has: function(fn) {
        return fn ? list.indexOf(fn) > -1 : list.length > 0;
      },
      
      empty: function() {
        if (list) {
          list = [];
        }
        return this;
      },
      
      disable: function() {
        locked = list = memory = null;
        return this;
      },
      
      disabled: function() {
        return !list;
      },
      
      lock: function() {
        locked = true;
        if (!memory) {
          self.disable();
        }
        return this;
      },
      
      locked: function() {
        return !!locked;
      },
      
      fireWith: function(context, args) {
        if (list) {
          if (fired && !firing) {
            if (!opts.memory) {
              return this;
            }
          }
          
          memory = [context, args || []];
          firingIndex = -1;
          
          if (!firing) {
            fire();
          }
        }
        return this;
      },
      
      fire: function(...args) {
        self.fireWith(this, args);
        return this;
      },
      
      fired: function() {
        return !!fired;
      }
    };
    
    return self;
  }

  /**
   * Create a new Deferred object
   * @param {Function} [func] - Function to call with the deferred
   * @returns {Object} - Deferred object
   */
  function Deferred(func) {
    const tuples = [
      // action, add listener, callbacks, final state
      ['resolve', 'done', Callbacks('once memory'), 'resolved'],
      ['reject', 'fail', Callbacks('once memory'), 'rejected'],
      ['notify', 'progress', Callbacks('memory')]
    ];
    
    let state = 'pending';
    
    const promise = {
      state: function() {
        return state;
      },
      
      always: function(...fns) {
        deferred.done(...fns).fail(...fns);
        return this;
      },
      
      catch: function(fn) {
        return promise.then(null, fn);
      },
      
      pipe: function(/* fnDone, fnFail, fnProgress */) {
        // Deprecated in jQuery, but still supported
        return this.then.apply(this, arguments);
      },
      
      then: function(onFulfilled, onRejected, onProgress) {
        let maxDepth = 0;
        
        function resolve(depth, deferred, handler, special) {
          return function() {
            let context = this;
            let callArgs = Array.prototype.slice.call(arguments);
            
            function mightThrow() {
              let returned, then;
              
              // Support: Promises/A+ section 2.3.3.3.3
              if (depth < maxDepth) {
                return;
              }
              
              returned = handler.apply(context, callArgs);
              
              // Support: Promises/A+ section 2.3.1
              if (returned === deferred.promise()) {
                throw new TypeError('Thenable self-resolution');
              }
              
              // Support: Promises/A+ sections 2.3.3.1, 3.5
              then = returned &&
                (typeof returned === 'object' || typeof returned === 'function') &&
                returned.then;
              
              // Handle a returned thenable
              if (isFunction(then)) {
                // Special processors (notify) just wait for resolution
                if (special) {
                  then.call(
                    returned,
                    resolve(maxDepth, deferred, identity, special),
                    resolve(maxDepth, deferred, thrower, special)
                  );
                } else {
                  maxDepth++;
                  then.call(
                    returned,
                    resolve(maxDepth, deferred, identity, special),
                    resolve(maxDepth, deferred, thrower, special),
                    resolve(maxDepth, deferred, identity, deferred.notifyWith)
                  );
                }
              } else {
                if (handler !== identity) {
                  context = undefined;
                  callArgs = [returned];
                }
                (special || deferred.resolveWith)(context, callArgs);
              }
            }
            
            // Only normal processors (resolve) catch and reject exceptions
            const process = special
              ? mightThrow
              : function() {
                  try {
                    mightThrow();
                  } catch (e) {
                    if (depth + 1 >= maxDepth) {
                      context = undefined;
                      callArgs = [e];
                      deferred.rejectWith(context, callArgs);
                    }
                  }
                };
            
            // Execute the process
            if (depth) {
              process();
            } else {
              setTimeout(process);
            }
          };
        }
        
        return Deferred(function(newDefer) {
          // progress handlers
          tuples[2][2].add(
            resolve(0, newDefer, isFunction(onProgress) ? onProgress : identity, newDefer.notifyWith)
          );
          
          // done handlers
          tuples[0][2].add(
            resolve(0, newDefer, isFunction(onFulfilled) ? onFulfilled : identity)
          );
          
          // fail handlers
          tuples[1][2].add(
            resolve(0, newDefer, isFunction(onRejected) ? onRejected : thrower)
          );
        }).promise();
      },
      
      promise: function(obj) {
        return obj != null ? extend(obj, promise) : promise;
      }
    };
    
    const deferred = {};
    
    // Add list-specific methods
    tuples.forEach((tuple, i) => {
      const list = tuple[2];
      const stateString = tuple[3];
      
      // promise.progress = list.add
      // promise.done = list.add
      // promise.fail = list.add
      promise[tuple[1]] = list.add;
      
      // Handle state
      if (stateString) {
        list.add(
          function() {
            state = stateString;
          },
          // Disable opposite callback list
          tuples[i ^ 1][2].disable,
          // Lock progress callback
          tuples[2][2].lock
        );
      }
      
      list.add(tuple[4]);
      
      // deferred.resolve = function()
      // deferred.reject = function()
      // deferred.notify = function()
      deferred[tuple[0]] = function(...args) {
        deferred[tuple[0] + 'With'](this === deferred ? undefined : this, args);
        return this;
      };
      
      // deferred.resolveWith = list.fireWith
      // deferred.rejectWith = list.fireWith
      // deferred.notifyWith = list.fireWith
      deferred[tuple[0] + 'With'] = list.fireWith;
    });
    
    // Make the deferred a promise
    promise.promise(deferred);
    
    // Call given func if any
    if (func) {
      func.call(deferred, deferred);
    }
    
    return deferred;
  }

  /**
   * Resolve multiple deferreds/values
   * @param {...*} args - Deferreds or values
   * @returns {Promise} - Master promise
   */
  function when(...args) {
    const subordinates = args.slice();
    const length = subordinates.length;
    
    // The count of uncompleted subordinates
    let remaining = length !== 1 || (subordinates[0] && isFunction(subordinates[0].promise))
      ? length
      : 0;
    
    // The master Deferred
    const deferred = remaining === 1 ? subordinates[0] : Deferred();
    
    // Update function for resolve values
    const updateFunc = function(i, context, values) {
      return function(value) {
        context[i] = this;
        values[i] = arguments.length > 1 ? Array.from(arguments) : value;
        if (values === progressContexts) {
          deferred.notifyWith(context, values);
        } else if (!(--remaining)) {
          deferred.resolveWith(context, values);
        }
      };
    };
    
    let progressContexts, progressValues, resolveContexts, resolveValues;
    
    // Add listeners to Deferred subordinates
    if (length > 1) {
      progressContexts = new Array(length);
      progressValues = new Array(length);
      resolveContexts = new Array(length);
      resolveValues = new Array(length);
      
      for (let i = 0; i < length; i++) {
        if (subordinates[i] && isFunction(subordinates[i].promise)) {
          subordinates[i].promise()
            .progress(updateFunc(i, progressContexts, progressValues))
            .done(updateFunc(i, resolveContexts, resolveValues))
            .fail(deferred.reject);
        } else {
          --remaining;
        }
      }
    }
    
    // If we're not waiting on anything, resolve the master
    if (!remaining) {
      deferred.resolveWith(resolveContexts, resolveValues);
    }
    
    return deferred.promise();
  }

  // Helper functions
  function identity(v) {
    return v;
  }

  function thrower(ex) {
    throw ex;
  }

  /**
   * jQNext - DOM Traversal
   * Parent, children, sibling traversal methods
   */


  /**
   * Get the parent of each element, optionally filtered by selector
   * @param {jQCollection} collection
   * @param {string} [selector]
   * @returns {Element[]}
   */
  function parent(collection, selector) {
    const result = [];
    const seen = new Set();
    
    for (let i = 0; i < collection.length; i++) {
      const parent = collection[i].parentNode;
      if (parent && parent.nodeType === 1 && !seen.has(parent)) {
        seen.add(parent);
        if (!selector || matchesWithPseudo(parent, selector)) {
          result.push(parent);
        }
      }
    }
    
    return result;
  }

  /**
   * Get all ancestors of each element, optionally filtered
   * @param {jQCollection} collection
   * @param {string} [selector]
   * @returns {Element[]}
   */
  function parents(collection, selector) {
    const result = [];
    
    for (let i = 0; i < collection.length; i++) {
      let parent = collection[i].parentNode;
      while (parent && parent.nodeType === 1) {
        if (!selector || matchesWithPseudo(parent, selector)) {
          result.push(parent);
        }
        parent = parent.parentNode;
      }
    }
    
    return uniqueSort(result);
  }

  /**
   * Get ancestors up to (but not including) the element matched by selector
   * @param {jQCollection} collection
   * @param {string|Element} until
   * @param {string} [filter]
   * @returns {Element[]}
   */
  function parentsUntil(collection, until, filter) {
    const result = [];
    const untilElem = isString(until) ? null : until;
    
    for (let i = 0; i < collection.length; i++) {
      let parent = collection[i].parentNode;
      while (parent && parent.nodeType === 1) {
        // Check if we've reached the until element/selector
        if (untilElem) {
          if (parent === untilElem) break;
        } else if (until && matchesWithPseudo(parent, until)) {
          break;
        }
        
        if (!filter || matchesWithPseudo(parent, filter)) {
          result.push(parent);
        }
        parent = parent.parentNode;
      }
    }
    
    return uniqueSort(result);
  }

  /**
   * Get the closest ancestor matching the selector
   * @param {jQCollection} collection
   * @param {string} selector
   * @param {Element} [context]
   * @returns {Element[]}
   */
  function closest(collection, selector, context) {
    const result = [];
    const seen = new Set();
    
    for (let i = 0; i < collection.length; i++) {
      let elem = collection[i];
      
      while (elem && elem !== context) {
        if (elem.nodeType === 1 && matchesWithPseudo(elem, selector)) {
          if (!seen.has(elem)) {
            seen.add(elem);
            result.push(elem);
          }
          break;
        }
        elem = elem.parentNode;
      }
    }
    
    return result;
  }

  /**
   * Get the children of each element, optionally filtered
   * @param {jQCollection} collection
   * @param {string} [selector]
   * @returns {Element[]}
   */
  function children(collection, selector) {
    const result = [];
    
    for (let i = 0; i < collection.length; i++) {
      const kids = collection[i].children;
      for (let j = 0; j < kids.length; j++) {
        if (!selector || matchesWithPseudo(kids[j], selector)) {
          result.push(kids[j]);
        }
      }
    }
    
    return collection.length > 1 ? uniqueSort(result) : result;
  }

  /**
   * Get all siblings of each element
   * @param {jQCollection} collection
   * @param {string} [selector]
   * @returns {Element[]}
   */
  function siblings(collection, selector) {
    const result = [];
    const seen = new Set();
    
    for (let i = 0; i < collection.length; i++) {
      const elem = collection[i];
      const parent = elem.parentNode;
      
      if (parent) {
        const kids = parent.children;
        for (let j = 0; j < kids.length; j++) {
          if (kids[j] !== elem && !seen.has(kids[j])) {
            seen.add(kids[j]);
            if (!selector || matchesWithPseudo(kids[j], selector)) {
              result.push(kids[j]);
            }
          }
        }
      }
    }
    
    return result;
  }

  /**
   * Get the next sibling of each element
   * @param {jQCollection} collection
   * @param {string} [selector]
   * @returns {Element[]}
   */
  function next(collection, selector) {
    const result = [];
    
    for (let i = 0; i < collection.length; i++) {
      let sibling = collection[i].nextElementSibling;
      if (sibling) {
        if (!selector || matchesWithPseudo(sibling, selector)) {
          result.push(sibling);
        }
      }
    }
    
    return result;
  }

  /**
   * Get all following siblings
   * @param {jQCollection} collection
   * @param {string} [selector]
   * @returns {Element[]}
   */
  function nextAll(collection, selector) {
    const result = [];
    
    for (let i = 0; i < collection.length; i++) {
      let sibling = collection[i].nextElementSibling;
      while (sibling) {
        if (!selector || matchesWithPseudo(sibling, selector)) {
          result.push(sibling);
        }
        sibling = sibling.nextElementSibling;
      }
    }
    
    return collection.length > 1 ? uniqueSort(result) : result;
  }

  /**
   * Get all following siblings until the selector matches
   * @param {jQCollection} collection
   * @param {string|Element} until
   * @param {string} [filter]
   * @returns {Element[]}
   */
  function nextUntil(collection, until, filter) {
    const result = [];
    const untilElem = isElement(until) ? until : null;
    
    for (let i = 0; i < collection.length; i++) {
      let sibling = collection[i].nextElementSibling;
      while (sibling) {
        // Check if we've reached the until element/selector
        if (untilElem) {
          if (sibling === untilElem) break;
        } else if (until && matchesWithPseudo(sibling, until)) {
          break;
        }
        
        if (!filter || matchesWithPseudo(sibling, filter)) {
          result.push(sibling);
        }
        sibling = sibling.nextElementSibling;
      }
    }
    
    return collection.length > 1 ? uniqueSort(result) : result;
  }

  /**
   * Get the previous sibling of each element
   * @param {jQCollection} collection
   * @param {string} [selector]
   * @returns {Element[]}
   */
  function prev(collection, selector) {
    const result = [];
    
    for (let i = 0; i < collection.length; i++) {
      let sibling = collection[i].previousElementSibling;
      if (sibling) {
        if (!selector || matchesWithPseudo(sibling, selector)) {
          result.push(sibling);
        }
      }
    }
    
    return result;
  }

  /**
   * Get all preceding siblings
   * @param {jQCollection} collection
   * @param {string} [selector]
   * @returns {Element[]}
   */
  function prevAll(collection, selector) {
    const result = [];
    
    for (let i = 0; i < collection.length; i++) {
      let sibling = collection[i].previousElementSibling;
      while (sibling) {
        if (!selector || matchesWithPseudo(sibling, selector)) {
          result.push(sibling);
        }
        sibling = sibling.previousElementSibling;
      }
    }
    
    return collection.length > 1 ? uniqueSort(result) : result;
  }

  /**
   * Get all preceding siblings until the selector matches
   * @param {jQCollection} collection
   * @param {string|Element} until
   * @param {string} [filter]
   * @returns {Element[]}
   */
  function prevUntil(collection, until, filter) {
    const result = [];
    const untilElem = isElement(until) ? until : null;
    
    for (let i = 0; i < collection.length; i++) {
      let sibling = collection[i].previousElementSibling;
      while (sibling) {
        // Check if we've reached the until element/selector
        if (untilElem) {
          if (sibling === untilElem) break;
        } else if (until && matchesWithPseudo(sibling, until)) {
          break;
        }
        
        if (!filter || matchesWithPseudo(sibling, filter)) {
          result.push(sibling);
        }
        sibling = sibling.previousElementSibling;
      }
    }
    
    return collection.length > 1 ? uniqueSort(result) : result;
  }

  /**
   * Get the nearest positioned ancestor
   * @param {jQCollection} collection
   * @returns {Element[]}
   */
  function offsetParent(collection) {
    const result = [];
    
    for (let i = 0; i < collection.length; i++) {
      let offsetParent = collection[i].offsetParent || document.documentElement;
      
      while (offsetParent && 
             offsetParent !== document.documentElement && 
             getComputedStyle(offsetParent).position === 'static') {
        offsetParent = offsetParent.offsetParent;
      }
      
      result.push(offsetParent || document.documentElement);
    }
    
    return result;
  }

  /**
   * jQNext - Events Core
   * Event binding, delegation, and triggering with namespace support
   */


  // Event handler storage using WeakMap
  const handlersStorage = new WeakMap();

  // Special event types that need different handling
  const special = {
    // Focus/blur don't bubble, use focusin/focusout
    focus: {
      trigger: function() {
        if (this !== document.activeElement && this.focus) {
          this.focus();
          return false;
        }
      },
      delegateType: 'focusin'
    },
    blur: {
      trigger: function() {
        if (this === document.activeElement && this.blur) {
          this.blur();
          return false;
        }
      },
      delegateType: 'focusout'
    },
    // Click for checkbox/radio needs special handling
    click: {
      trigger: function() {
        if (this.type === 'checkbox' && this.click && this.nodeName.toLowerCase() === 'input') {
          this.click();
          return false;
        }
      },
      _default: function(event) {
        return event.target.nodeName.toLowerCase() === 'a';
      }
    },
    // Submit needs special handling to trigger native form submission
    submit: {
      trigger: function() {
        if (this.nodeName && this.nodeName.toLowerCase() === 'form' && typeof this.submit === 'function') {
          this.submit();
          return false;
        }
      },
      _default: function(event) {
        return event.target.nodeName && event.target.nodeName.toLowerCase() === 'form';
      }
    },
    // Mouseenter/leave don't bubble, simulate with mouseover/out
    mouseenter: {
      delegateType: 'mouseover',
      handle: function(event) {
        const related = event.relatedTarget;
        const target = event.currentTarget;
        
        if (!related || (related !== target && !target.contains(related))) {
          return event.handleObj.handler.apply(this, arguments);
        }
      }
    },
    mouseleave: {
      delegateType: 'mouseout',
      handle: function(event) {
        const related = event.relatedTarget;
        const target = event.currentTarget;
        
        if (!related || (related !== target && !target.contains(related))) {
          return event.handleObj.handler.apply(this, arguments);
        }
      }
    },
    // Focusin/focusout are handled natively in modern browsers
    focusin: {
      setup: function() {
        return false; // Use native
      }
    },
    focusout: {
      setup: function() {
        return false; // Use native
      }
    }
  };

  /**
   * Parse event type string with namespaces
   * @param {string} types - Event type(s) with optional namespaces (e.g., 'click.ns1.ns2')
   * @returns {Array} - Array of { type, namespaces } objects
   */
  function parseEventTypes(types) {
    const result = [];
    
    // Handle non-string types
    if (typeof types !== 'string') {
      if (types && typeof types === 'object' && types.type) {
        // It's an event object
        return [{ type: types.type, namespaces: [], namespace: '', origType: types.type }];
      }
      return result;
    }
    
    const typeArr = types.split(/\s+/).filter(Boolean);
    
    typeArr.forEach(type => {
      const parts = type.split('.');
      const eventType = parts[0];
      const namespaces = parts.slice(1).sort();
      
      result.push({
        type: eventType,
        namespaces,
        namespace: namespaces.join('.'),
        origType: type
      });
    });
    
    return result;
  }

  /**
   * Get or create handlers object for an element
   * @param {Element} elem
   * @returns {Object}
   */
  function getHandlers(elem) {
    let handlers = handlersStorage.get(elem);
    if (!handlers) {
      handlers = { events: {}, handle: null };
      handlersStorage.set(elem, handlers);
    }
    return handlers;
  }

  /**
   * Create a unified event handler function
   * @param {Element} elem
   * @returns {Function}
   */
  function createHandler(elem) {
    const handlers = getHandlers(elem);
    
    if (handlers.handle) {
      return handlers.handle;
    }
    
    handlers.handle = function(nativeEvent) {
      // Create jQuery-like event object
      const event = fixEvent(nativeEvent);
      
      // Get handlers for this event type
      const typeHandlers = handlers.events[event.type] || [];
      
      // Copy to avoid modification during iteration
      const handlersCopy = typeHandlers.slice();
      
      for (let i = 0; i < handlersCopy.length; i++) {
        const handleObj = handlersCopy[i];
        
        // Check namespace match
        if (event.namespace && !event.namespace.split('.').every(ns => 
          handleObj.namespace.includes(ns))) {
          continue;
        }
        
        // Check selector (delegation)
        let target;
        
        if (handleObj.selector) {
          // Find matching delegated target (use pseudo-aware matching)
          target = event.target;
          while (target && target !== elem) {
            if (target.nodeType === 1 && matchesWithPseudo(target, handleObj.selector)) {
              break;
            }
            target = target.parentNode;
          }
          
          if (target === elem) {
            continue; // No match found
          }
          
          event.currentTarget = target;
        } else {
          // For non-delegated events, this should be the element the handler is bound to
          target = elem;
          event.currentTarget = elem;
        }
        
        event.handleObj = handleObj;
        event.data = handleObj.data;
        
        // Call the handler
        let result;
        
        // Build arguments: event + any extra args from trigger
        const extraArgs = event._extraArgs || [];
        const args = [event].concat(extraArgs);
        
        // Check for special handler
        const specialHandle = special[handleObj.origType]?.handle;
        if (specialHandle) {
          result = specialHandle.apply(target || elem, args);
        }
        
        if (result === undefined) {
          result = handleObj.handler.apply(target || elem, args);
        }
        
        if (result !== undefined) {
          event.result = result;
          if (result === false) {
            event.preventDefault();
            event.stopPropagation();
          }
        }
        
        if (event.isImmediatePropagationStopped()) {
          break;
        }
      }
      
      return event.result;
    };
    
    return handlers.handle;
  }

  /**
   * Fix native event to jQuery-like event
   * @param {Event} nativeEvent
   * @returns {Object}
   */
  function fixEvent(nativeEvent) {
    // If already fixed, return
    if (nativeEvent._fixed) {
      return nativeEvent;
    }
    
    const event = {
      originalEvent: nativeEvent,
      _fixed: true,
      type: nativeEvent.type,
      target: nativeEvent.target,
      currentTarget: nativeEvent.currentTarget,
      relatedTarget: nativeEvent.relatedTarget,
      timeStamp: nativeEvent.timeStamp || Date.now(),
      namespace: '',
      result: undefined,
      handleObj: null,
      data: null,
      
      // Copy common properties
      button: nativeEvent.button,
      buttons: nativeEvent.buttons,
      which: nativeEvent.which || nativeEvent.keyCode || nativeEvent.charCode,
      keyCode: nativeEvent.keyCode,
      charCode: nativeEvent.charCode,
      key: nativeEvent.key,
      code: nativeEvent.code,
      altKey: nativeEvent.altKey,
      ctrlKey: nativeEvent.ctrlKey,
      metaKey: nativeEvent.metaKey,
      shiftKey: nativeEvent.shiftKey,
      clientX: nativeEvent.clientX,
      clientY: nativeEvent.clientY,
      pageX: nativeEvent.pageX,
      pageY: nativeEvent.pageY,
      screenX: nativeEvent.screenX,
      screenY: nativeEvent.screenY,
      offsetX: nativeEvent.offsetX,
      offsetY: nativeEvent.offsetY,
      detail: nativeEvent.detail,
      
      // State
      _isDefaultPrevented: false,
      _isPropagationStopped: false,
      _isImmediatePropagationStopped: false,
      
      // Methods
      preventDefault: function() {
        this._isDefaultPrevented = true;
        nativeEvent.preventDefault();
      },
      stopPropagation: function() {
        this._isPropagationStopped = true;
        nativeEvent.stopPropagation();
      },
      stopImmediatePropagation: function() {
        this._isImmediatePropagationStopped = true;
        this._isPropagationStopped = true;
        nativeEvent.stopImmediatePropagation();
      },
      isDefaultPrevented: function() {
        return this._isDefaultPrevented || nativeEvent.defaultPrevented;
      },
      isPropagationStopped: function() {
        return this._isPropagationStopped;
      },
      isImmediatePropagationStopped: function() {
        return this._isImmediatePropagationStopped;
      }
    };
    
    // Calculate pageX/pageY if missing
    if (event.pageX == null && nativeEvent.clientX != null) {
      const doc = nativeEvent.target?.ownerDocument || document;
      const docElem = doc.documentElement;
      const body = doc.body;
      
      event.pageX = nativeEvent.clientX + 
        (docElem?.scrollLeft || body?.scrollLeft || 0) - 
        (docElem?.clientLeft || body?.clientLeft || 0);
      event.pageY = nativeEvent.clientY + 
        (docElem?.scrollTop || body?.scrollTop || 0) - 
        (docElem?.clientTop || body?.clientTop || 0);
    }
    
    // Add which for click events
    if (!event.which && nativeEvent.button !== undefined) {
      event.which = (nativeEvent.button & 1 ? 1 : 
                     (nativeEvent.button & 2 ? 3 : 
                     (nativeEvent.button & 4 ? 2 : 0)));
    }
    
    return event;
  }

  /**
   * Bind event handler(s)
   * @param {jQCollection} collection
   * @param {string} types - Event type(s)
   * @param {string|Object|Function} selector - Selector for delegation, or data, or handler
   * @param {Object|Function} [data] - Data to pass to handler, or handler
   * @param {Function} [fn] - Handler function
   * @param {boolean} [one=false] - Only trigger once
   * @returns {jQCollection}
   */
  function on(collection, types, selector, data, fn, one = false) {
    // Handle object signature: on({ type: handler }, selector, data)
    if (isPlainObject(types)) {
      if (isString(selector)) {
        // on({ type: handler }, selector)
        data = data || null;
      } else {
        // on({ type: handler }, data)
        data = selector;
        selector = undefined;
      }
      
      for (const type in types) {
        on(collection, type, selector, data, types[type], one);
      }
      return collection;
    }
    
    // Normalize arguments
    if (data == null && fn == null) {
      // on(types, fn)
      fn = selector;
      data = selector = undefined;
    } else if (fn == null) {
      if (isString(selector)) {
        // on(types, selector, fn)
        fn = data;
        data = undefined;
      } else {
        // on(types, data, fn)
        fn = data;
        data = selector;
        selector = undefined;
      }
    }
    
    if (fn === false) {
      fn = returnFalse$1;
    } else if (!fn) {
      return collection;
    }
    
    // Handle one-time binding
    if (one) {
      const origFn = fn;
      fn = function(event) {
        off(collection, event);
        return origFn.apply(this, arguments);
      };
      fn.guid = origFn.guid || (origFn.guid = on.guid++);
    }
    
    return collection.each(function() {
      addHandler(this, types, fn, data, selector);
    });
  }

  on.guid = 1;

  /**
   * Add handler to element
   */
  function addHandler(elem, types, handler, data, selector) {
    const parsedTypes = parseEventTypes(types);
    const handlers = getHandlers(elem);
    const elemHandle = createHandler(elem);
    
    // Assign guid to handler if not present
    if (!handler.guid) {
      handler.guid = on.guid++;
    }
    
    parsedTypes.forEach(({ type, namespaces, namespace, origType }) => {
      // Get special handling
      const specialType = special[type];
      
      // Determine the actual event type to listen for
      const bindType = selector && specialType?.delegateType || type;
      
      // Create handler object
      const handleObj = {
        type: bindType,
        origType: type,
        handler,
        data,
        selector,
        namespace,
        namespaces,
        guid: handler.guid
      };
      
      // Call special add callback (used by plugins like jquery.hotkeys)
      // This allows plugins to modify handleObj (e.g., wrap the handler)
      specialType?.add?.call(elem, handleObj);
      
      // Initialize handlers array for this type if needed
      if (!handlers.events[bindType]) {
        handlers.events[bindType] = [];
        
        // Check for special setup
        if (!specialType?.setup?.call(elem, data, namespaces, elemHandle)) {
          // Use addEventListener
          elem.addEventListener(bindType, elemHandle, false);
        }
      }
      
      handlers.events[bindType].push(handleObj);
    });
  }

  /**
   * Remove event handler(s)
   * @param {jQCollection} collection
   * @param {string|Object} [types]
   * @param {string|Function} [selector]
   * @param {Function} [fn]
   * @returns {jQCollection}
   */
  function off(collection, types, selector, fn) {
    // Handle object signature
    if (types && types.handleObj) {
      // off(event) - called from one-time handler
      const event = types;
      // Directly call removeHandler instead of recursively calling off
      // since we don't have a real collection with .each()
      removeHandler(event.currentTarget, event.handleObj.origType,
          event.handleObj.handler, event.handleObj.selector);
      return collection;
    }
    
    if (isPlainObject(types)) {
      for (const type in types) {
        off(collection, type, selector, types[type]);
      }
      return collection;
    }
    
    // Normalize arguments
    if (selector === false || isFunction(selector)) {
      fn = selector;
      selector = undefined;
    }
    
    if (fn === false) {
      fn = returnFalse$1;
    }
    
    return collection.each(function() {
      removeHandler(this, types, fn, selector);
    });
  }

  /**
   * Remove handler from element
   */
  function removeHandler(elem, types, handler, selector) {
    const handlers = handlersStorage.get(elem);
    if (!handlers) return;
    
    // If no types specified, remove all
    if (!types) {
      for (const type in handlers.events) {
        removeByType(elem, handlers, type, handler, selector);
      }
      return;
    }
    
    const parsedTypes = parseEventTypes(types);
    
    parsedTypes.forEach(({ type, namespace }) => {
      // Remove for specific type or all types if type is empty
      const typesToRemove = type ? [type] : Object.keys(handlers.events);
      
      typesToRemove.forEach(t => {
        removeByType(elem, handlers, t, handler, selector, namespace);
      });
    });
  }

  /**
   * Remove handlers by type
   */
  function removeByType(elem, handlers, type, handler, selector, namespace) {
    const events = handlers.events[type];
    if (!events) return;
    
    const remaining = events.filter(handleObj => {
      // Check if this handler should be removed
      if (handler && handleObj.guid !== handler.guid) {
        return true;
      }
      if (selector && handleObj.selector !== selector) {
        return true;
      }
      if (namespace) {
        const nsArray = namespace.split('.');
        if (!nsArray.every(ns => handleObj.namespaces.includes(ns))) {
          return true;
        }
      }
      return false;
    });
    
    handlers.events[type] = remaining;
    
    // Remove listener if no handlers left
    if (!remaining.length) {
      const specialType = special[type];
      
      if (!specialType?.teardown?.call(elem, namespace, handlers.handle)) {
        elem.removeEventListener(type, handlers.handle, false);
      }
      
      delete handlers.events[type];
    }
  }

  /**
   * Bind one-time event handler
   * @param {jQCollection} collection
   * @param {string} types
   * @param {string|Object|Function} selector
   * @param {Object|Function} [data]
   * @param {Function} [fn]
   * @returns {jQCollection}
   */
  function one(collection, types, selector, data, fn) {
    return on(collection, types, selector, data, fn, true);
  }

  /**
   * Trigger an event
   * @param {jQCollection} collection
   * @param {string|Event} event
   * @param {*} [data]
   * @returns {jQCollection}
   */
  function trigger(collection, event, data) {
    return collection.each(function() {
      triggerEvent(this, event, data, true);
    });
  }

  /**
   * Trigger handler without bubbling
   * @param {jQCollection} collection
   * @param {string|Event} event
   * @param {*} [data]
   * @returns {*}
   */
  function triggerHandler(collection, event, data) {
    const elem = collection[0];
    if (elem) {
      return triggerEvent(elem, event, data, false);
    }
  }

  /**
   * Core trigger function
   */
  function triggerEvent(elem, event, data, propagate) {
    const eventType = isString(event) ? event : event.type;
    const parsedTypes = parseEventTypes(eventType);
    
    if (!parsedTypes.length) return;
    
    const { type, namespace, origType } = parsedTypes[0];
    
    // Check special trigger
    const specialTrigger = special[type]?.trigger;
    if (specialTrigger?.call(elem, data) === false) {
      return;
    }
    
    // Create event object
    let eventObj;
    
    // Check if it's a jQuery-like event (has isDefaultPrevented method)
    const isJQueryEvent = event && typeof event.isDefaultPrevented === 'function';
    
    if (isJQueryEvent) {
      // Already a jQuery-like event object, use it directly
      eventObj = event;
      // Ensure target is set
      if (!eventObj.target) {
        eventObj.target = elem;
      }
    } else if (isPlainObject(event) || event instanceof Event) {
      eventObj = fixEvent(event instanceof Event ? event : { type, target: elem, ...event });
    } else {
      eventObj = fixEvent(new CustomEvent(type, {
        bubbles: propagate,
        cancelable: true,
        detail: data
      }));
    }
    
    eventObj.type = type;
    eventObj.namespace = namespace;
    
    // Ensure target is always set (CustomEvent doesn't have target until dispatched)
    if (!eventObj.target) {
      eventObj.target = elem;
    }
    
    // Store extra arguments for handlers (jQuery compatibility)
    // data can be an array that should be spread as extra args
    eventObj._extraArgs = data != null ? (Array.isArray(data) ? data : [data]) : [];
    
    // Trigger on element
    const handlers = handlersStorage.get(elem);
    if (handlers?.handle) {
      handlers.handle(eventObj);
    }
    
    // Propagate to parent if needed
    if (propagate && !eventObj.isPropagationStopped() && elem.parentNode) {
      triggerEvent(elem.parentNode, eventObj, data, true);
    }
    
    // Trigger native event if applicable
    if (propagate && !eventObj.isDefaultPrevented()) {
      const nativeEventName = 'on' + type;
      if (elem[nativeEventName] && isFunction(elem[type])) {
        // Temporarily prevent re-triggering
        const old = elem[nativeEventName];
        elem[nativeEventName] = null;
        elem[type]();
        elem[nativeEventName] = old;
      }
    }
    
    return eventObj.result;
  }

  /**
   * Helper function that returns false
   */
  function returnFalse$1() {
    return false;
  }

  /**
   * Clone event handlers from one element to another
   * @param {Element} source - Source element
   * @param {Element} dest - Destination element
   */
  function cloneHandlers(source, dest) {
    const sourceHandlers = handlersStorage.get(source);
    if (!sourceHandlers || !sourceHandlers.events) return;
    
    // Get or create handlers for dest
    const destHandlers = getHandlers(dest);
    const destHandle = createHandler(dest);
    
    // Clone each event type
    for (const type in sourceHandlers.events) {
      const typeHandlers = sourceHandlers.events[type];
      
      if (!destHandlers.events[type]) {
        destHandlers.events[type] = [];
        // Add event listener on dest
        dest.addEventListener(type, destHandle, false);
      }
      
      // Clone each handler object
      typeHandlers.forEach(handleObj => {
        const clonedHandleObj = {
          type: handleObj.type,
          origType: handleObj.origType,
          handler: handleObj.handler,
          data: handleObj.data,
          selector: handleObj.selector,
          namespace: handleObj.namespace,
          namespaces: handleObj.namespaces ? handleObj.namespaces.slice() : [],
          guid: handleObj.guid
        };
        
        destHandlers.events[type].push(clonedHandleObj);
      });
    }
  }

  /**
   * jQNext - DOM Manipulation
   * Insert, remove, wrap, clone methods
   */


  /**
   * Get the document for an element
   * @param {Element} elem
   * @returns {Document}
   */
  function getDocument(elem) {
    return elem.ownerDocument || elem;
  }

  /**
   * Convert argument to nodes
   * @param {string|Element|NodeList|Array} content
   * @param {Document} doc
   * @returns {Node[]}
   */
  function toNodes(content, doc = document) {
    if (isString(content)) {
      return parseHTML(content, doc, true);
    }
    if (content instanceof Node) {
      return [content];
    }
    // Handle jQuery-like collections (array-like with elements)
    if (content && content.length !== undefined) {
      const arr = [];
      for (let i = 0; i < content.length; i++) {
        const item = content[i];
        if (item instanceof Node) {
          arr.push(item);
        }
      }
      // Only return nodes that are valid - don't include non-Nodes
      return arr;
    }
    return [];
  }

  /**
   * Get/set innerHTML
   * @param {jQCollection} collection
   * @param {string|Function} [value]
   * @returns {string|jQCollection}
   */
  function html(collection, value) {
    // Getter
    if (value === undefined) {
      const elem = collection[0];
      return elem ? elem.innerHTML : undefined;
    }
    
    // Setter
    return collection.each(function(i) {
      const oldHtml = this.innerHTML;
      
      // Clean up events/data on children
      cleanData(Array.from(this.getElementsByTagName('*')));
      
      // Set new content
      const newValue = isFunction(value) ? value.call(this, i, oldHtml) : value;
      
      // Handle jQuery-like collections (object with length and elements)
      if (newValue && typeof newValue === 'object' && newValue.length !== undefined && !(newValue instanceof Node)) {
        // It's a collection - empty and append each element
        this.textContent = '';
        for (let j = 0; j < newValue.length; j++) {
          const node = newValue[j];
          if (node instanceof Node) {
            this.appendChild(node.cloneNode ? node.cloneNode(true) : node);
          }
        }
        return;
      }
      
      try {
        this.innerHTML = newValue;
      } catch (e) {
        // Fall back to DOM manipulation for problematic HTML
        this.textContent = '';
        const nodes = parseHTML(newValue, getDocument(this), true);
        nodes.forEach(node => this.appendChild(node));
      }
    });
  }

  /**
   * Get/set textContent
   * @param {jQCollection} collection
   * @param {string|Function} [value]
   * @returns {string|jQCollection}
   */
  function text(collection, value) {
    // Getter
    if (value === undefined) {
      let result = '';
      for (let i = 0; i < collection.length; i++) {
        const elem = collection[i];
        const nodeType = elem.nodeType;
        
        if (nodeType === 1 || nodeType === 9 || nodeType === 11) {
          result += elem.textContent;
        } else if (nodeType === 3 || nodeType === 4) {
          result += elem.nodeValue;
        }
      }
      return result;
    }
    
    // Setter
    return collection.each(function(i) {
      if (this.nodeType === 1 || this.nodeType === 11 || this.nodeType === 9) {
        const newValue = isFunction(value) ? value.call(this, i, this.textContent) : value;
        this.textContent = newValue;
      }
    });
  }

  /**
   * Append content to each element
   * @param {jQCollection} collection
   * @param {...*} content - Content to append
   * @returns {jQCollection}
   */
  function append(collection, ...content) {
    return domManip(collection, content, function(elem) {
      if (this.nodeType === 1 || this.nodeType === 11 || this.nodeType === 9) {
        this.appendChild(elem);
      }
    });
  }

  /**
   * Prepend content to each element
   * @param {jQCollection} collection
   * @param {...*} content
   * @returns {jQCollection}
   */
  function prepend(collection, ...content) {
    return domManip(collection, content, function(elem) {
      if (this.nodeType === 1 || this.nodeType === 11 || this.nodeType === 9) {
        this.insertBefore(elem, this.firstChild);
      }
    });
  }

  /**
   * Insert content before each element
   * @param {jQCollection} collection
   * @param {...*} content
   * @returns {jQCollection}
   */
  function before(collection, ...content) {
    return domManip(collection, content, function(elem) {
      if (this.parentNode) {
        this.parentNode.insertBefore(elem, this);
      }
    });
  }

  /**
   * Insert content after each element
   * @param {jQCollection} collection
   * @param {...*} content
   * @returns {jQCollection}
   */
  function after(collection, ...content) {
    return domManip(collection, content, function(elem) {
      if (this.parentNode) {
        this.parentNode.insertBefore(elem, this.nextSibling);
      }
    });
  }

  /**
   * DOM manipulation core function
   * @param {jQCollection} collection
   * @param {Array} args
   * @param {Function} callback
   * @returns {jQCollection}
   */
  function domManip(collection, args, callback) {
    const doc = getDocument(collection[0] || document);
    
    // Pre-parse non-function arguments into nodes (will be cloned per element)
    const staticArgs = [];
    const funcArgs = [];
    
    args.forEach((arg, idx) => {
      if (isFunction(arg)) {
        funcArgs.push({ idx, fn: arg });
      } else {
        staticArgs.push({ idx, nodes: toNodes(arg, doc) });
      }
    });
    
    const len = collection.length;
    
    collection.each(function(i) {
      const isLast = i === len - 1;
      
      // Build nodes array in argument order
      const allNodes = [];
      
      // Process static args - clone for all except last element
      staticArgs.forEach(({ nodes }) => {
        nodes.forEach(node => {
          allNodes.push(isLast ? node : node.cloneNode(true));
        });
      });
      
      // Process function args - always fresh nodes per element
      funcArgs.forEach(({ fn }) => {
        const result = fn.call(this, i, this.innerHTML);
        const resultNodes = toNodes(result, doc);
        // Function results are always used directly (fresh per element)
        allNodes.push(...resultNodes);
      });
      
      // Insert all nodes
      allNodes.forEach(node => {
        callback.call(this, node);
      });
    });
    
    return collection;
  }

  /**
   * Append elements to target
   * @param {jQCollection} collection
   * @param {string|Element|jQCollection} target
   * @returns {jQCollection}
   */
  function appendTo(collection, target, jQNext) {
    jQNext(target).append(collection);
    return collection;
  }

  /**
   * Prepend elements to target
   * @param {jQCollection} collection
   * @param {string|Element|jQCollection} target
   * @returns {jQCollection}
   */
  function prependTo(collection, target, jQNext) {
    jQNext(target).prepend(collection);
    return collection;
  }

  /**
   * Insert elements before target
   * @param {jQCollection} collection
   * @param {string|Element|jQCollection} target
   * @returns {jQCollection}
   */
  function insertBefore(collection, target, jQNext) {
    jQNext(target).before(collection);
    return collection;
  }

  /**
   * Insert elements after target
   * @param {jQCollection} collection
   * @param {string|Element|jQCollection} target
   * @returns {jQCollection}
   */
  function insertAfter(collection, target, jQNext) {
    jQNext(target).after(collection);
    return collection;
  }

  /**
   * Wrap each element with content
   * @param {jQCollection} collection
   * @param {string|Element|Function} wrapper
   * @returns {jQCollection}
   */
  function wrap(collection, wrapper, jQNext) {
    const isFunc = isFunction(wrapper);
    
    return collection.each(function(i) {
      const wrapperElem = isFunc ? wrapper.call(this, i) : wrapper;
      const wrap = jQNext(wrapperElem).clone()[0];
      
      if (this.parentNode) {
        this.parentNode.insertBefore(wrap, this);
      }
      
      // Find the deepest child of the wrapper
      let target = wrap;
      while (target.firstElementChild) {
        target = target.firstElementChild;
      }
      
      target.appendChild(this);
    });
  }

  /**
   * Wrap all elements together
   * @param {jQCollection} collection
   * @param {string|Element} wrapper
   * @returns {jQCollection}
   */
  function wrapAll(collection, wrapper, jQNext) {
    if (!collection.length) return collection;
    
    const wrap = jQNext(wrapper).clone()[0];
    
    // Insert wrapper before first element
    if (collection[0].parentNode) {
      collection[0].parentNode.insertBefore(wrap, collection[0]);
    }
    
    // Find deepest child
    let target = wrap;
    while (target.firstElementChild) {
      target = target.firstElementChild;
    }
    
    // Move all elements into wrapper
    collection.each(function() {
      target.appendChild(this);
    });
    
    return collection;
  }

  /**
   * Wrap the inner contents of each element
   * @param {jQCollection} collection
   * @param {string|Element|Function} wrapper
   * @returns {jQCollection}
   */
  function wrapInner(collection, wrapper, jQNext) {
    const isFunc = isFunction(wrapper);
    
    return collection.each(function(i) {
      const self = jQNext(this);
      const contents = self.contents();
      
      if (contents.length) {
        contents.wrapAll(isFunc ? wrapper.call(this, i) : wrapper);
      } else {
        self.append(isFunc ? wrapper.call(this, i) : wrapper);
      }
    });
  }

  /**
   * Remove the parent wrapper from elements
   * @param {jQCollection} collection
   * @param {string} [selector]
   * @returns {jQCollection}
   */
  function unwrap(collection, selector) {
    collection.parent(selector).not('body').each(function() {
      const parent = this.parentNode;
      if (parent) {
        while (this.firstChild) {
          parent.insertBefore(this.firstChild, this);
        }
        parent.removeChild(this);
      }
    });
    
    return collection;
  }

  /**
   * Remove all children
   * @param {jQCollection} collection
   * @returns {jQCollection}
   */
  function empty(collection) {
    return collection.each(function() {
      // Clean up data on children
      cleanData(Array.from(this.getElementsByTagName('*')));
      
      // Remove children
      while (this.firstChild) {
        this.removeChild(this.firstChild);
      }
    });
  }

  /**
   * Remove elements from the DOM
   * @param {jQCollection} collection
   * @param {string} [selector]
   * @returns {jQCollection}
   */
  function remove(collection, selector) {
    for (let i = 0; i < collection.length; i++) {
      const elem = collection[i];
      
      // Skip if selector provided and doesn't match (use pseudo-aware matching)
      if (selector && !matchesWithPseudo(elem, selector)) {
        continue;
      }
      
      // Clean up data and events
      cleanData([elem]);
      cleanData(Array.from(elem.getElementsByTagName('*')));
      
      // Remove from DOM
      if (elem.parentNode) {
        elem.parentNode.removeChild(elem);
      }
    }
    
    return collection;
  }

  /**
   * Remove elements but keep data and events
   * @param {jQCollection} collection
   * @param {string} [selector]
   * @returns {jQCollection}
   */
  function detach(collection, selector) {
    for (let i = 0; i < collection.length; i++) {
      const elem = collection[i];
      
      if (selector && !matchesWithPseudo(elem, selector)) {
        continue;
      }
      
      if (elem.parentNode) {
        elem.parentNode.removeChild(elem);
      }
    }
    
    return collection;
  }

  /**
   * Replace elements with new content
   * @param {jQCollection} collection
   * @param {string|Element|Function} newContent
   * @returns {jQCollection}
   */
  function replaceWith(collection, newContent, jQNext) {
    const isFunc = isFunction(newContent);
    
    return collection.each(function(i) {
      const content = isFunc ? newContent.call(this, i, this) : newContent;
      const nodes = toNodes(content, getDocument(this));
      
      if (this.parentNode) {
        // Clean up
        cleanData([this]);
        cleanData(Array.from(this.getElementsByTagName('*')));
        
        // Insert new content
        nodes.forEach((node, j) => {
          if (j === 0) {
            this.parentNode.replaceChild(node, this);
          } else {
            this.parentNode.insertBefore(node, nodes[j - 1].nextSibling);
          }
        });
      }
    });
  }

  /**
   * Replace target elements with these elements
   * @param {jQCollection} collection
   * @param {string|Element} target
   * @returns {jQCollection}
   */
  function replaceAll(collection, target, jQNext) {
    jQNext(target).replaceWith(collection);
    return collection;
  }

  /**
   * Clone elements
   * @param {jQCollection} collection
   * @param {boolean} [withDataAndEvents=false]
   * @param {boolean} [deepWithDataAndEvents=withDataAndEvents]
   * @returns {jQCollection}
   */
  function clone(collection, withDataAndEvents = false, deepWithDataAndEvents = withDataAndEvents, jQNext) {
    const result = [];
    
    for (let i = 0; i < collection.length; i++) {
      const elem = collection[i];
      const cloned = elem.cloneNode(true);
      
      // Copy data and events if requested
      if (withDataAndEvents) {
        // Copy data from source element
        const sourceData = getDataValue(elem);
        if (sourceData && Object.keys(sourceData).length > 0) {
          for (const key in sourceData) {
            setData(cloned, key, sourceData[key]);
          }
        }
        
        // Copy event handlers from source element
        cloneHandlers(elem, cloned);
        
        // Handle deep cloning for descendants
        if (deepWithDataAndEvents) {
          const sourceDescendants = elem.querySelectorAll('*');
          const clonedDescendants = cloned.querySelectorAll('*');
          
          for (let j = 0; j < sourceDescendants.length; j++) {
            const srcDesc = sourceDescendants[j];
            const clonedDesc = clonedDescendants[j];
            
            // Copy data
            const descData = getDataValue(srcDesc);
            if (descData && Object.keys(descData).length > 0) {
              for (const key in descData) {
                setData(clonedDesc, key, descData[key]);
              }
            }
            
            // Copy event handlers
            cloneHandlers(srcDesc, clonedDesc);
          }
        }
      }
      
      result.push(cloned);
    }
    
    return jQNext(result);
  }

  /**
   * jQNext - DOM Attributes
   * Attribute, property, and value manipulation
   */


  // Properties that should use .prop() instead of .attr()
  const propFix = {
    'for': 'htmlFor',
    'class': 'className',
    'tabindex': 'tabIndex',
    'readonly': 'readOnly',
    'maxlength': 'maxLength',
    'cellspacing': 'cellSpacing',
    'cellpadding': 'cellPadding',
    'rowspan': 'rowSpan',
    'colspan': 'colSpan',
    'usemap': 'useMap',
    'frameborder': 'frameBorder',
    'contenteditable': 'contentEditable'
  };

  // Boolean attributes
  const booleanAttrs = new Set([
    'checked', 'selected', 'async', 'autofocus', 'autoplay', 'controls',
    'defer', 'disabled', 'hidden', 'ismap', 'loop', 'multiple', 'muted',
    'open', 'readonly', 'required', 'scoped', 'novalidate', 'reversed',
    'allowfullscreen', 'contenteditable', 'draggable', 'spellcheck'
  ]);

  /**
   * Get/set attribute
   * @param {jQCollection} collection
   * @param {string|Object} name - Attribute name or object of name-value pairs
   * @param {*} [value] - Attribute value
   * @returns {*|jQCollection}
   */
  function attr(collection, name, value) {
    // Handle attr() with no arguments - returns undefined (jQuery compatibility)
    if (name === undefined) {
      return undefined;
    }
    
    // Get attribute value
    if (isString(name) && value === undefined) {
      const elem = collection[0];
      if (!elem || elem.nodeType !== 1) {
        return undefined;
      }
      
      const val = elem.getAttribute(name);
      
      // Handle boolean attributes
      if (booleanAttrs.has(name.toLowerCase())) {
        return val !== null ? name.toLowerCase() : undefined;
      }
      
      // Return undefined for non-existent attributes (jQuery compatibility)
      // Native getAttribute returns null, but jQuery returns undefined
      return val === null ? undefined : val;
    }
    
    // Set attribute(s)
    return collection.each(function(i) {
      if (this.nodeType !== 1) return;
      
      if (typeof name === 'object') {
        // Set multiple attributes
        for (const key in name) {
          setAttr(this, key, name[key], i);
        }
      } else {
        setAttr(this, name, value, i);
      }
    });
  }

  /**
   * Set single attribute on element
   */
  function setAttr(elem, name, value, index) {
    const val = isFunction(value) ? value.call(elem, index, elem.getAttribute(name)) : value;
    
    if (val === null || val === undefined) {
      elem.removeAttribute(name);
    } else if (booleanAttrs.has(name.toLowerCase())) {
      // Boolean attribute
      if (val) {
        elem.setAttribute(name, name.toLowerCase());
      } else {
        elem.removeAttribute(name);
      }
    } else {
      elem.setAttribute(name, val);
    }
  }

  /**
   * Remove attribute
   * @param {jQCollection} collection
   * @param {string} name - Attribute name(s), space-separated
   * @returns {jQCollection}
   */
  function removeAttr(collection, name) {
    const names = name.split(/\s+/);
    
    return collection.each(function() {
      if (this.nodeType === 1) {
        names.forEach(n => this.removeAttribute(n));
      }
    });
  }

  /**
   * Get/set property
   * @param {jQCollection} collection
   * @param {string|Object} name
   * @param {*} [value]
   * @returns {*|jQCollection}
   */
  function prop(collection, name, value) {
    const propName = propFix[name] || name;
    
    // Getter
    if (isString(name) && value === undefined) {
      const elem = collection[0];
      return elem ? elem[propName] : undefined;
    }
    
    // Setter
    return collection.each(function(i) {
      if (typeof name === 'object') {
        for (const key in name) {
          const pName = propFix[key] || key;
          this[pName] = name[key];
        }
      } else {
        const val = isFunction(value) ? value.call(this, i, this[propName]) : value;
        this[propName] = val;
      }
    });
  }

  /**
   * Remove property
   * @param {jQCollection} collection
   * @param {string} name
   * @returns {jQCollection}
   */
  function removeProp(collection, name) {
    const propName = propFix[name] || name;
    
    return collection.each(function() {
      try {
        this[propName] = undefined;
        delete this[propName];
      } catch (e) {
        // Some properties can't be deleted
      }
    });
  }

  /**
   * Get/set value for form elements
   * @param {jQCollection} collection
   * @param {*} [value]
   * @returns {*|jQCollection}
   */
  function val(collection, value) {
    // Getter
    if (value === undefined) {
      const elem = collection[0];
      if (!elem) return undefined;
      
      // Select element
      if (elem.nodeName.toLowerCase() === 'select') {
        const options = elem.options;
        const index = elem.selectedIndex;
        const one = elem.type === 'select-one';
        const values = one ? null : [];
        
        if (index < 0) {
          return one ? '' : [];
        }
        
        const max = one ? index + 1 : options.length;
        let i = one ? index : 0;
        
        for (; i < max; i++) {
          const option = options[i];
          
          if (option.selected && !option.disabled) {
            const optValue = option.value;
            
            if (one) {
              return optValue;
            }
            
            values.push(optValue);
          }
        }
        
        return values;
      }
      
      // Checkbox/radio
      if (elem.type === 'checkbox' || elem.type === 'radio') {
        return elem.value !== 'on' ? elem.value : elem.getAttribute('value') || 'on';
      }
      
      // Other inputs
      const ret = elem.value;
      return typeof ret === 'string' ? ret.replace(/\r/g, '') : ret == null ? '' : ret;
    }
    
    // Setter
    return collection.each(function(i) {
      if (this.nodeType !== 1) return;
      
      let val = isFunction(value) ? value.call(this, i, this.value) : value;
      
      if (val == null) {
        val = '';
      } else if (typeof val === 'number') {
        val = String(val);
      } else if (isArray(val)) {
        val = val.map(v => v == null ? '' : String(v));
      }
      
      const nodeName = this.nodeName.toLowerCase();
      
      // Select element
      if (nodeName === 'select') {
        const values = isArray(val) ? val : [val];
        const options = this.options;
        
        for (let j = 0; j < options.length; j++) {
          const option = options[j];
          option.selected = values.includes(option.value);
        }
        
        if (!values.length) {
          this.selectedIndex = -1;
        }
      }
      // Checkbox/radio
      else if (this.type === 'checkbox' || this.type === 'radio') {
        this.checked = isArray(val) ? val.includes(this.value) : val === this.value;
      }
      // Other inputs
      else {
        this.value = val;
      }
    });
  }

  /**
   * Add class(es) to elements
   * @param {jQCollection} collection
   * @param {string|Function} className
   * @returns {jQCollection}
   */
  function addClass(collection, className) {
    return collection.each(function(i) {
      if (this.nodeType !== 1) return;
      
      const classes = isFunction(className) 
        ? className.call(this, i, this.className)
        : className;
      
      if (isString(classes)) {
        const classNames = classes.split(/\s+/).filter(Boolean);
        this.classList.add(...classNames);
      }
    });
  }

  /**
   * Remove class(es) from elements
   * @param {jQCollection} collection
   * @param {string|Function} [className]
   * @returns {jQCollection}
   */
  function removeClass(collection, className) {
    return collection.each(function(i) {
      if (this.nodeType !== 1) return;
      
      // Remove all classes if no argument
      if (className === undefined) {
        this.className = '';
        return;
      }
      
      const classes = isFunction(className)
        ? className.call(this, i, this.className)
        : className;
      
      if (isString(classes)) {
        const classNames = classes.split(/\s+/).filter(Boolean);
        this.classList.remove(...classNames);
      }
    });
  }

  /**
   * Toggle class(es) on elements
   * @param {jQCollection} collection
   * @param {string|Function} className
   * @param {boolean} [state]
   * @returns {jQCollection}
   */
  function toggleClass(collection, className, state) {
    return collection.each(function(i) {
      if (this.nodeType !== 1) return;
      
      const classes = isFunction(className)
        ? className.call(this, i, this.className, state)
        : className;
      
      if (isString(classes)) {
        const classNames = classes.split(/\s+/).filter(Boolean);
        classNames.forEach(name => {
          if (state === undefined) {
            this.classList.toggle(name);
          } else if (state) {
            this.classList.add(name);
          } else {
            this.classList.remove(name);
          }
        });
      }
    });
  }

  /**
   * Check if any element has the class
   * @param {jQCollection} collection
   * @param {string} className
   * @returns {boolean}
   */
  function hasClass(collection, className) {
    for (let i = 0; i < collection.length; i++) {
      if (collection[i].nodeType === 1 && collection[i].classList.contains(className)) {
        return true;
      }
    }
    return false;
  }

  /**
   * jQNext - CSS Module
   * Style manipulation, dimensions, and positioning
   */


  // CSS properties that should not have 'px' appended
  const cssNumber$1 = new Set([
    'animationIterationCount', 'columnCount', 'fillOpacity', 'flexGrow',
    'flexShrink', 'fontWeight', 'gridArea', 'gridColumn', 'gridColumnEnd',
    'gridColumnStart', 'gridRow', 'gridRowEnd', 'gridRowStart', 'lineHeight',
    'opacity', 'order', 'orphans', 'widows', 'zIndex', 'zoom'
  ]);

  // CSS properties that need vendor prefixes
  const vendorPrefixes = ['webkit', 'moz', 'ms', 'o'];

  // CSS Hooks storage (for jQuery UI compatibility)
  const cssHooks = {};

  /**
   * Get computed style for an element
   * @param {Element} elem
   * @returns {CSSStyleDeclaration}
   */
  function getStyles(elem) {
    if (!elem || !elem.ownerDocument || !elem.ownerDocument.defaultView) {
      return {};
    }
    return elem.ownerDocument.defaultView.getComputedStyle(elem, null);
  }

  /**
   * Normalize CSS property name
   * @param {string} name
   * @returns {string}
   */
  function vendorPropName(name) {
    const camelName = camelCase(name);
    
    // Check if it works directly
    if (camelName in document.documentElement.style) {
      return camelName;
    }
    
    // Try vendor prefixes
    const capName = camelName[0].toUpperCase() + camelName.slice(1);
    for (const prefix of vendorPrefixes) {
      const prefixed = prefix + capName;
      if (prefixed in document.documentElement.style) {
        return prefixed;
      }
    }
    
    return camelName;
  }

  /**
   * Adjust the CSS value (add 'px' if needed)
   * @param {string} prop
   * @param {*} value
   * @returns {string}
   */
  function adjustCSS(prop, value) {
    if (value === '' || value === null || value === undefined) {
      return '';
    }
    
    // Numbers that need 'px'
    if (isNumeric(value) && !cssNumber$1.has(prop)) {
      return value + 'px';
    }
    
    return String(value);
  }

  /**
   * Get/set CSS properties
   * @param {jQCollection} collection
   * @param {string|Object} name
   * @param {*} [value]
   * @returns {*|jQCollection}
   */
  function css(collection, name, value) {
    // Get computed style
    if (isString(name) && value === undefined) {
      const elem = collection[0];
      if (!elem || elem.nodeType !== 1) {
        return undefined;
      }
      
      const prop = vendorPropName(name);
      const computed = getStyles(elem);
      
      // Return computed style (jQuery behavior - always returns computed values)
      return computed.getPropertyValue(name) || computed[prop] || '';
    }
    
    // Set styles
    return collection.each(function(i) {
      if (this.nodeType !== 1) return;
      
      if (typeof name === 'object') {
        // Set multiple properties
        for (const key in name) {
          setCSS(this, key, name[key], i);
        }
      } else {
        setCSS(this, name, value, i);
      }
    });
  }

  /**
   * Set a single CSS property
   */
  function setCSS(elem, name, value, index) {
    const prop = vendorPropName(name);
    let val = isFunction(value) 
      ? value.call(elem, index, css({ 0: elem, length: 1 }, name))
      : value;
    
    // Handle removing style
    if (val === null || val === undefined || val === '') {
      elem.style[prop] = '';
      return;
    }
    
    // Adjust value (add 'px' etc.)
    val = adjustCSS(prop, val);
    
    elem.style[prop] = val;
  }

  /**
   * Get width of element
   * @param {jQCollection} collection
   * @param {*} [value]
   * @returns {number|jQCollection}
   */
  function width(collection, value) {
    return dimension(collection, 'width', value);
  }

  /**
   * Get height of element
   * @param {jQCollection} collection
   * @param {*} [value]
   * @returns {number|jQCollection}
   */
  function height(collection, value) {
    return dimension(collection, 'height', value);
  }

  /**
   * Get inner width (includes padding)
   * @param {jQCollection} collection
   * @param {*} [value]
   * @returns {number|jQCollection}
   */
  function innerWidth(collection, value) {
    return dimension(collection, 'width', value, 'inner');
  }

  /**
   * Get inner height (includes padding)
   * @param {jQCollection} collection
   * @param {*} [value]
   * @returns {number|jQCollection}
   */
  function innerHeight(collection, value) {
    return dimension(collection, 'height', value, 'inner');
  }

  /**
   * Get outer width (includes padding and border, optionally margin)
   * @param {jQCollection} collection
   * @param {boolean|*} [includeMargin]
   * @returns {number|jQCollection}
   */
  function outerWidth(collection, includeMargin) {
    // Handle setter
    if (typeof includeMargin !== 'boolean' && includeMargin !== undefined) {
      return dimension(collection, 'width', includeMargin, 'outer');
    }
    return dimension(collection, 'width', undefined, includeMargin ? 'outerMargin' : 'outer');
  }

  /**
   * Get outer height (includes padding and border, optionally margin)
   * @param {jQCollection} collection
   * @param {boolean|*} [includeMargin]
   * @returns {number|jQCollection}
   */
  function outerHeight(collection, includeMargin) {
    // Handle setter
    if (typeof includeMargin !== 'boolean' && includeMargin !== undefined) {
      return dimension(collection, 'height', includeMargin, 'outer');
    }
    return dimension(collection, 'height', undefined, includeMargin ? 'outerMargin' : 'outer');
  }

  /**
   * Core dimension function
   * @param {jQCollection} collection
   * @param {string} dim - 'width' or 'height'
   * @param {*} [value]
   * @param {string} [extra] - 'inner', 'outer', 'outerMargin'
   * @returns {number|jQCollection}
   */
  function dimension(collection, dim, value, extra) {
    const elem = collection[0];
    
    // Getter
    if (value === undefined) {
      if (!elem) return undefined;
      
      // Window
      if (isWindow(elem)) {
        return dim === 'width'
          ? elem.innerWidth
          : elem.innerHeight;
      }
      
      // Document
      if (elem.nodeType === 9) {
        const doc = elem.documentElement;
        return Math.max(
          elem.body[`scroll${dim === 'width' ? 'Width' : 'Height'}`],
          doc[`scroll${dim === 'width' ? 'Width' : 'Height'}`],
          elem.body[`offset${dim === 'width' ? 'Width' : 'Height'}`],
          doc[`offset${dim === 'width' ? 'Width' : 'Height'}`],
          doc[`client${dim === 'width' ? 'Width' : 'Height'}`]
        );
      }
      
      // Element
      const rect = elem.getBoundingClientRect();
      const computed = getStyles(elem);
      let result = rect[dim];
      
      if (!extra) {
        // Content only (subtract padding and border)
        if (dim === 'width') {
          result -= parseFloat(computed.paddingLeft) || 0;
          result -= parseFloat(computed.paddingRight) || 0;
          result -= parseFloat(computed.borderLeftWidth) || 0;
          result -= parseFloat(computed.borderRightWidth) || 0;
        } else {
          result -= parseFloat(computed.paddingTop) || 0;
          result -= parseFloat(computed.paddingBottom) || 0;
          result -= parseFloat(computed.borderTopWidth) || 0;
          result -= parseFloat(computed.borderBottomWidth) || 0;
        }
      } else if (extra === 'inner') {
        // Content + padding (subtract border)
        if (dim === 'width') {
          result -= parseFloat(computed.borderLeftWidth) || 0;
          result -= parseFloat(computed.borderRightWidth) || 0;
        } else {
          result -= parseFloat(computed.borderTopWidth) || 0;
          result -= parseFloat(computed.borderBottomWidth) || 0;
        }
      } else if (extra === 'outerMargin') {
        // Content + padding + border + margin
        if (dim === 'width') {
          result += parseFloat(computed.marginLeft) || 0;
          result += parseFloat(computed.marginRight) || 0;
        } else {
          result += parseFloat(computed.marginTop) || 0;
          result += parseFloat(computed.marginBottom) || 0;
        }
      }
      // 'outer' = content + padding + border (the default getBoundingClientRect)
      
      return Math.round(result);
    }
    
    // Setter
    return collection.each(function(i) {
      if (this.nodeType !== 1) return;
      
      let val = isFunction(value)
        ? value.call(this, i, dimension(collection, dim))
        : value;
      
      if (val === null || val === undefined) {
        return;
      }
      
      if (isNumeric(val)) {
        const computed = getStyles(this);
        
        // Adjust for box-sizing
        if (computed.boxSizing === 'border-box') {
          if (extra === 'inner' || !extra) {
            // Add padding and border
            if (dim === 'width') {
              val += parseFloat(computed.paddingLeft) || 0;
              val += parseFloat(computed.paddingRight) || 0;
              val += parseFloat(computed.borderLeftWidth) || 0;
              val += parseFloat(computed.borderRightWidth) || 0;
            } else {
              val += parseFloat(computed.paddingTop) || 0;
              val += parseFloat(computed.paddingBottom) || 0;
              val += parseFloat(computed.borderTopWidth) || 0;
              val += parseFloat(computed.borderBottomWidth) || 0;
            }
          }
        }
        
        val = val + 'px';
      }
      
      this.style[dim] = val;
    });
  }

  /**
   * Get offset (position relative to document)
   * @param {jQCollection} collection
   * @param {Object} [coordinates]
   * @returns {Object|jQCollection}
   */
  function offset(collection, coordinates) {
    // Setter
    if (coordinates !== undefined) {
      return collection.each(function(i) {
        setOffset(this, coordinates, i);
      });
    }
    
    // Getter
    const elem = collection[0];
    if (!elem || elem.nodeType !== 1) {
      return undefined;
    }
    
    // Return zeros for disconnected elements
    if (!elem.getClientRects().length) {
      return { top: 0, left: 0 };
    }
    
    const rect = elem.getBoundingClientRect();
    const doc = elem.ownerDocument;
    const docElem = doc.documentElement;
    const win = doc.defaultView;
    
    return {
      top: rect.top + win.pageYOffset - docElem.clientTop,
      left: rect.left + win.pageXOffset - docElem.clientLeft
    };
  }

  /**
   * Set element offset
   */
  function setOffset(elem, options, i) {
    const curPosition = css({ 0: elem, length: 1 }, 'position');
    
    // Set position if static
    if (curPosition === 'static') {
      elem.style.position = 'relative';
    }
    
    const curOffset = offset({ 0: elem, length: 1 });
    const curCSSTop = css({ 0: elem, length: 1 }, 'top');
    const curCSSLeft = css({ 0: elem, length: 1 }, 'left');
    
    const calculatePosition = (curPosition === 'absolute' || curPosition === 'fixed') &&
      (curCSSTop + curCSSLeft).indexOf('auto') > -1;
    
    let curTop, curLeft;
    
    if (calculatePosition) {
      const curPos = position({ 0: elem, length: 1 });
      curTop = curPos.top;
      curLeft = curPos.left;
    } else {
      curTop = parseFloat(curCSSTop) || 0;
      curLeft = parseFloat(curCSSLeft) || 0;
    }
    
    const props = isFunction(options) ? options.call(elem, i, curOffset) : options;
    
    if (props.top != null) {
      elem.style.top = (props.top - curOffset.top + curTop) + 'px';
    }
    if (props.left != null) {
      elem.style.left = (props.left - curOffset.left + curLeft) + 'px';
    }
  }

  /**
   * Get position (relative to offset parent)
   * @param {jQCollection} collection
   * @returns {Object}
   */
  function position(collection) {
    const elem = collection[0];
    if (!elem || elem.nodeType !== 1) {
      return undefined;
    }
    
    let offsetParent = elem.offsetParent || document.documentElement;
    
    // Account for offset parent being body/html
    while (offsetParent && 
           offsetParent !== document.documentElement && 
           css({ 0: offsetParent, length: 1 }, 'position') === 'static') {
      offsetParent = offsetParent.offsetParent;
    }
    offsetParent = offsetParent || document.documentElement;
    
    const elemOffset = offset(collection);
    const parentOffset = offsetParent === document.documentElement
      ? { top: 0, left: 0 }
      : offset({ 0: offsetParent, length: 1 });
    
    const computed = getStyles(elem);
    
    // Subtract element margins
    elemOffset.top -= parseFloat(computed.marginTop) || 0;
    elemOffset.left -= parseFloat(computed.marginLeft) || 0;
    
    // Add offset parent borders
    const parentComputed = getStyles(offsetParent);
    parentOffset.top += parseFloat(parentComputed.borderTopWidth) || 0;
    parentOffset.left += parseFloat(parentComputed.borderLeftWidth) || 0;
    
    return {
      top: elemOffset.top - parentOffset.top,
      left: elemOffset.left - parentOffset.left
    };
  }

  /**
   * Get/set scroll top
   * @param {jQCollection} collection
   * @param {number} [value]
   * @returns {number|jQCollection}
   */
  function scrollTop(collection, value) {
    return scrollProp(collection, 'top', value);
  }

  /**
   * Get/set scroll left
   * @param {jQCollection} collection
   * @param {number} [value]
   * @returns {number|jQCollection}
   */
  function scrollLeft(collection, value) {
    return scrollProp(collection, 'left', value);
  }

  /**
   * Core scroll property function
   */
  function scrollProp(collection, prop, value) {
    const scrollPropName = prop === 'top' ? 'scrollTop' : 'scrollLeft';
    const pagePropName = prop === 'top' ? 'pageYOffset' : 'pageXOffset';
    
    // Getter
    if (value === undefined) {
      const elem = collection[0];
      if (!elem) return undefined;
      
      if (isWindow(elem)) {
        return elem[pagePropName];
      }
      
      return elem[scrollPropName];
    }
    
    // Setter
    return collection.each(function() {
      if (isWindow(this)) {
        const scrollX = prop === 'left' ? value : this.pageXOffset;
        const scrollY = prop === 'top' ? value : this.pageYOffset;
        this.scrollTo(scrollX, scrollY);
      } else {
        this[scrollPropName] = value;
      }
    });
  }

  /**
   * jQNext - Event Shortcuts
   * Shorthand event methods (click, focus, etc.)
   */


  /**
   * Create event shortcut method
   * @param {string} type - Event type
   * @returns {Function}
   */
  function createShortcut(type) {
    return function(data, fn) {
      // Trigger if no arguments
      if (arguments.length === 0) {
        return trigger(this, type);
      }
      
      // Bind handler
      if (typeof data === 'function') {
        fn = data;
        data = undefined;
      }
      
      return on(this, type, null, data, fn);
    };
  }

  // Standard DOM events
  const blur = createShortcut('blur');
  const focus = createShortcut('focus');
  const focusin = createShortcut('focusin');
  const focusout = createShortcut('focusout');
  const load$1 = createShortcut('load');
  const resize = createShortcut('resize');
  const scroll = createShortcut('scroll');
  const unload = createShortcut('unload');
  const click = createShortcut('click');
  const dblclick = createShortcut('dblclick');
  const mousedown = createShortcut('mousedown');
  const mouseup = createShortcut('mouseup');
  const mousemove = createShortcut('mousemove');
  const mouseover = createShortcut('mouseover');
  const mouseout = createShortcut('mouseout');
  const mouseenter = createShortcut('mouseenter');
  const mouseleave = createShortcut('mouseleave');
  const change = createShortcut('change');
  const select = createShortcut('select');
  const submit = createShortcut('submit');
  const keydown = createShortcut('keydown');
  const keypress = createShortcut('keypress');
  const keyup = createShortcut('keyup');
  const error = createShortcut('error');
  const contextmenu = createShortcut('contextmenu');

  /**
   * Bind handlers for mouseenter and mouseleave
   * @param {Function} handlerIn - Handler for mouseenter
   * @param {Function} [handlerOut] - Handler for mouseleave
   * @returns {jQCollection}
   */
  function hover(handlerIn, handlerOut) {
    return this.mouseenter(handlerIn).mouseleave(handlerOut || handlerIn);
  }

  // Deprecated methods (still supported for compatibility)

  /**
   * Bind event (deprecated - use on)
   */
  function bind(types, data, fn) {
    return on(this, types, null, data, fn);
  }

  /**
   * Unbind event (deprecated - use off)
   */
  function unbind(types, fn) {
    return off(this, types, null, fn);
  }

  /**
   * Delegate event (deprecated - use on)
   */
  function delegate(selector, types, data, fn) {
    return on(this, types, selector, data, fn);
  }

  /**
   * Undelegate event (deprecated - use off)
   */
  function undelegate(selector, types, fn) {
    // No selector = remove all
    if (arguments.length === 0) {
      return off(this, '**');
    }
    
    return off(this, types, selector, fn);
  }

  /**
   * jQNext - Effects Core
   * Animation using Web Animation API
   */


  // Animation speeds
  const speeds = {
    slow: 600,
    fast: 200,
    _default: 400
  };

  // Global animation settings
  const fx = {
    off: false,
    interval: 13, // Legacy, not used with Web Animation API
    speeds
  };

  // Easing functions mapping (jQuery to CSS)
  const easingMap = {
    linear: 'linear',
    swing: 'ease-in-out',
    easeInQuad: 'cubic-bezier(0.55, 0.085, 0.68, 0.53)',
    easeOutQuad: 'cubic-bezier(0.25, 0.46, 0.45, 0.94)',
    easeInOutQuad: 'cubic-bezier(0.455, 0.03, 0.515, 0.955)',
    easeInCubic: 'cubic-bezier(0.55, 0.055, 0.675, 0.19)',
    easeOutCubic: 'cubic-bezier(0.215, 0.61, 0.355, 1)',
    easeInOutCubic: 'cubic-bezier(0.645, 0.045, 0.355, 1)',
    easeInQuart: 'cubic-bezier(0.895, 0.03, 0.685, 0.22)',
    easeOutQuart: 'cubic-bezier(0.165, 0.84, 0.44, 1)',
    easeInOutQuart: 'cubic-bezier(0.77, 0, 0.175, 1)',
    easeInQuint: 'cubic-bezier(0.755, 0.05, 0.855, 0.06)',
    easeOutQuint: 'cubic-bezier(0.23, 1, 0.32, 1)',
    easeInOutQuint: 'cubic-bezier(0.86, 0, 0.07, 1)',
    easeInSine: 'cubic-bezier(0.47, 0, 0.745, 0.715)',
    easeOutSine: 'cubic-bezier(0.39, 0.575, 0.565, 1)',
    easeInOutSine: 'cubic-bezier(0.445, 0.05, 0.55, 0.95)',
    easeInExpo: 'cubic-bezier(0.95, 0.05, 0.795, 0.035)',
    easeOutExpo: 'cubic-bezier(0.19, 1, 0.22, 1)',
    easeInOutExpo: 'cubic-bezier(1, 0, 0, 1)',
    easeInCirc: 'cubic-bezier(0.6, 0.04, 0.98, 0.335)',
    easeOutCirc: 'cubic-bezier(0.075, 0.82, 0.165, 1)',
    easeInOutCirc: 'cubic-bezier(0.785, 0.135, 0.15, 0.86)',
    easeInBack: 'cubic-bezier(0.6, -0.28, 0.735, 0.045)',
    easeOutBack: 'cubic-bezier(0.175, 0.885, 0.32, 1.275)',
    easeInOutBack: 'cubic-bezier(0.68, -0.55, 0.265, 1.55)'
  };

  // CSS properties that don't need 'px'
  const cssNumber = new Set([
    'columnCount', 'fillOpacity', 'flexGrow', 'flexShrink',
    'fontWeight', 'lineHeight', 'opacity', 'order', 'orphans',
    'widows', 'zIndex', 'zoom'
  ]);

  /**
   * Normalize duration value
   * @param {number|string} duration
   * @returns {number}
   */
  function normalizeDuration(duration) {
    if (typeof duration === 'number') {
      return duration;
    }
    if (speeds[duration]) {
      return speeds[duration];
    }
    return speeds._default;
  }

  /**
   * Normalize easing value
   * @param {string} easing
   * @returns {string}
   */
  function normalizeEasing(easing = 'swing') {
    return easingMap[easing] || easing;
  }

  /**
   * Core animate function using Web Animation API
   * @param {jQCollection} collection
   * @param {Object} properties - CSS properties to animate
   * @param {number|string|Object} duration - Duration or options
   * @param {string|Function} easing - Easing or callback
   * @param {Function} [callback] - Complete callback
   * @returns {jQCollection}
   */
  function animate(collection, properties, duration, easing, callback) {
    // Handle options object
    let options = {};
    
    if (isPlainObject(duration)) {
      options = { ...duration };
    } else {
      // Normalize arguments
      if (isFunction(easing)) {
        callback = easing;
        easing = undefined;
      } else if (isFunction(duration)) {
        callback = duration;
        duration = undefined;
      }
      
      options = {
        duration: normalizeDuration(duration),
        easing: normalizeEasing(easing),
        complete: callback
      };
    }
    
    // Normalize options
    options.duration = normalizeDuration(options.duration);
    options.easing = normalizeEasing(options.easing);
    
    // Handle fx.off
    if (fx.off) {
      options.duration = 0;
    }
    
    // Handle objects without .each() method
    if (!collection || typeof collection.each !== 'function') {
      // If it's a single element, animate it directly
      if (collection && collection.nodeType) {
        animateElement(collection, properties, options);
        return collection;
      }
      // If it's array-like, iterate manually
      if (collection && typeof collection.length === 'number') {
        for (let i = 0; i < collection.length; i++) {
          if (collection[i] && collection[i].nodeType) {
            animateElement(collection[i], properties, options);
          }
        }
        return collection;
      }
      return collection;
    }
    
    return collection.each(function() {
      animateElement(this, properties, options);
    });
  }

  /**
   * Animate a single element
   */
  function animateElement(elem, properties, options) {
    // Get or create animation queue
    let queue = getInternalData(elem, 'fxqueue') || [];
    
    const animationTask = () => {
      return runAnimation(elem, properties, options);
    };
    
    if (options.queue === false) {
      // Run immediately
      animationTask();
    } else {
      // Add to queue
      queue.push(animationTask);
      setInternalData(elem, 'fxqueue', queue);
      
      // Start queue if not running
      if (queue.length === 1) {
        processQueue(elem);
      }
    }
  }

  /**
   * Process animation queue
   */
  function processQueue(elem) {
    const queue = getInternalData(elem, 'fxqueue');
    
    if (!queue || !queue.length) {
      removeInternalData(elem, 'fxqueue');
      return;
    }
    
    const task = queue[0];
    const promise = task();
    
    if (promise && promise.then) {
      promise.then(() => {
        queue.shift();
        setInternalData(elem, 'fxqueue', queue);
        processQueue(elem);
      });
    } else {
      queue.shift();
      processQueue(elem);
    }
  }

  /**
   * Run animation on element
   */
  function runAnimation(elem, properties, options) {
    const deferred = Deferred();
    const computed = getComputedStyle(elem);
    
    // Build keyframes
    const from = {};
    const to = {};
    
    for (const prop in properties) {
      const camelProp = camelCase(prop);
      let targetValue = properties[prop];
      
      // Handle relative values (+=, -=)
      const currentValue = parseFloat(computed[camelProp]) || 0;
      
      if (isString(targetValue)) {
        const match = targetValue.match(/^([+-]=)(.+)$/);
        if (match) {
          const modifier = match[1];
          const delta = parseFloat(match[2]) || 0;
          targetValue = modifier === '+=' ? currentValue + delta : currentValue - delta;
        }
      }
      
      // Get current computed value
      from[camelProp] = computed[camelProp];
      
      // Normalize target value
      if (isNumeric(targetValue) && !cssNumber.has(camelProp)) {
        to[camelProp] = targetValue + 'px';
      } else {
        to[camelProp] = targetValue;
      }
    }
    
    // Handle show/hide/toggle special values
    const keyframes = [from, to];
    
    // Use Web Animation API
    const animation = elem.animate(keyframes, {
      duration: options.duration,
      easing: options.easing,
      fill: 'forwards'
    });
    
    // Store animation for stop/finish
    const animations = getInternalData(elem, 'animations') || [];
    animations.push(animation);
    setInternalData(elem, 'animations', animations);
    
    animation.onfinish = () => {
      // Apply final values to style
      for (const prop in to) {
        elem.style[prop] = to[prop];
      }
      
      // Remove from animations list
      const anims = getInternalData(elem, 'animations') || [];
      const idx = anims.indexOf(animation);
      if (idx > -1) anims.splice(idx, 1);
      setInternalData(elem, 'animations', anims);
      
      // Call complete callback
      if (options.complete) {
        options.complete.call(elem);
      }
      
      // Call step callback (final)
      if (options.step) {
        options.step.call(elem, 1, { elem, prop: '', now: 1, end: 1 });
      }
      
      deferred.resolveWith(elem, [animation, true]);
    };
    
    animation.oncancel = () => {
      deferred.rejectWith(elem, [animation, false]);
    };
    
    return deferred.promise();
  }

  /**
   * Stop animations
   * @param {jQCollection} collection
   * @param {boolean} [clearQueue=false]
   * @param {boolean} [jumpToEnd=false]
   * @returns {jQCollection}
   */
  function stop(collection, clearQueue = false, jumpToEnd = false) {
    return collection.each(function() {
      const animations = getInternalData(this, 'animations') || [];
      
      animations.forEach(anim => {
        if (jumpToEnd) {
          anim.finish();
        } else {
          anim.cancel();
        }
      });
      
      setInternalData(this, 'animations', []);
      
      if (clearQueue) {
        setInternalData(this, 'fxqueue', []);
      }
    });
  }

  /**
   * Finish all animations (jump to end)
   * @param {jQCollection} collection
   * @param {string} [queue]
   * @returns {jQCollection}
   */
  function finish(collection, queue) {
    return collection.each(function() {
      // Clear queue
      setInternalData(this, 'fxqueue', []);
      
      // Finish all animations
      const animations = getInternalData(this, 'animations') || [];
      animations.forEach(anim => anim.finish());
      setInternalData(this, 'animations', []);
    });
  }

  /**
   * Delay the queue
   * @param {jQCollection} collection
   * @param {number} time
   * @param {string} [type]
   * @returns {jQCollection}
   */
  function delay(collection, time, type) {
    const duration = normalizeDuration(time);
    
    return collection.each(function() {
      let queue = getInternalData(this, 'fxqueue') || [];
      
      queue.push(() => {
        return new Promise(resolve => setTimeout(resolve, duration));
      });
      
      setInternalData(this, 'fxqueue', queue);
      
      if (queue.length === 1) {
        processQueue(this);
      }
    });
  }

  /**
   * Get/set the queue
   * @param {jQCollection} collection
   * @param {string|Array|Function} [type]
   * @param {Array|Function} [data]
   * @returns {Array|jQCollection}
   */
  function queue(collection, type, data) {
    // Getter
    if (type === undefined || isString(type) && data === undefined) {
      const elem = collection[0];
      if (!elem) return [];
      return getInternalData(elem, 'fxqueue') || [];
    }
    
    // Handle (type, data) and (data) signatures
    if (!isString(type)) {
      data = type;
      type = 'fx';
    }
    
    // Setter
    return collection.each(function() {
      let queue = getInternalData(this, 'fxqueue') || [];
      
      if (Array.isArray(data)) {
        queue = data.slice();
      } else if (isFunction(data)) {
        queue.push(data);
      }
      
      setInternalData(this, 'fxqueue', queue);
      
      if (queue.length === 1) {
        processQueue(this);
      }
    });
  }

  /**
   * Execute the next item in the queue
   * @param {jQCollection} collection
   * @param {string} [type]
   * @returns {jQCollection}
   */
  function dequeue(collection, type) {
    return collection.each(function() {
      const queue = getInternalData(this, 'fxqueue') || [];
      
      if (queue.length) {
        queue.shift();
        setInternalData(this, 'fxqueue', queue);
        processQueue(this);
      }
    });
  }

  /**
   * Clear the queue
   * @param {jQCollection} collection
   * @param {string} [type]
   * @returns {jQCollection}
   */
  function clearQueue(collection, type) {
    return collection.each(function() {
      setInternalData(this, 'fxqueue', []);
    });
  }

  /**
   * Get a promise resolved when all animations complete
   * @param {jQCollection} collection
   * @param {string} [type]
   * @param {Object} [target]
   * @returns {Promise}
   */
  function promise(collection, type, target) {
    const deferred = Deferred();
    
    let count = collection.length;
    if (count === 0) {
      deferred.resolveWith(collection);
      return deferred.promise(target);
    }
    
    collection.each(function() {
      const animations = getInternalData(this, 'animations') || [];
      const queue = getInternalData(this, 'fxqueue') || [];
      
      if (!animations.length && !queue.length) {
        count--;
        if (count === 0) {
          deferred.resolveWith(collection);
        }
        return;
      }
      
      // Wait for all animations to finish
      Promise.all(animations.map(a => 
        new Promise(resolve => {
          const orig = a.onfinish;
          a.onfinish = () => {
            if (orig) orig();
            resolve();
          };
        })
      )).then(() => {
        count--;
        if (count === 0) {
          deferred.resolveWith(collection);
        }
      });
    });
    
    return deferred.promise(target);
  }

  /**
   * jQNext - Show/Hide Effects
   * Show, hide, toggle, slide, and fade effects
   */


  /**
   * Get the default display value for an element
   */
  const displayCache = {};
  function getDefaultDisplay(elem) {
    const nodeName = elem.nodeName.toLowerCase();
    
    if (displayCache[nodeName]) {
      return displayCache[nodeName];
    }
    
    const temp = document.createElement(nodeName);
    document.body.appendChild(temp);
    const display = getComputedStyle(temp).display;
    document.body.removeChild(temp);
    
    displayCache[nodeName] = display === 'none' ? 'block' : display;
    return displayCache[nodeName];
  }

  /**
   * Check if element is hidden
   */
  function isHidden(elem) {
    return getComputedStyle(elem).display === 'none';
  }

  /**
   * Normalize show/hide options
   */
  function normalizeOptions(duration, easing, callback, useDefault = false) {
    let options = {};
    
    if (isPlainObject(duration)) {
      options = { ...duration };
    } else {
      if (isFunction(easing)) {
        callback = easing;
        easing = undefined;
      } else if (isFunction(duration)) {
        callback = duration;
        duration = undefined;
      }
      
      options = {
        duration,
        easing,
        complete: callback
      };
    }
    
    // Normalize duration
    // If no duration provided and useDefault is false, use 0 (instant)
    // If useDefault is true, use speeds._default
    if (options.duration === undefined) {
      options.duration = useDefault ? speeds._default : 0;
    } else if (isString(options.duration)) {
      options.duration = speeds[options.duration] || speeds._default;
    }
    
    // Handle fx.off
    if (fx.off) {
      options.duration = 0;
    }
    
    return options;
  }

  /**
   * Show elements with optional animation
   * @param {jQCollection} collection
   * @param {number|string|Object} [duration]
   * @param {string|Function} [easing]
   * @param {Function} [callback]
   * @returns {jQCollection}
   */
  function show(collection, duration, easing, callback) {
    const options = normalizeOptions(duration, easing, callback);
    
    // No animation
    if (!options.duration) {
      return collection.each(function() {
        if (isHidden(this)) {
          this.style.display = getInternalData(this, 'olddisplay') || getDefaultDisplay(this);
        }
        if (options.complete) {
          options.complete.call(this);
        }
      });
    }
    
    // With animation
    return collection.each(function() {
      if (!isHidden(this)) {
        if (options.complete) options.complete.call(this);
        return;
      }
      
      // Store original display
      const display = getInternalData(this, 'olddisplay') || getDefaultDisplay(this);
      
      // Set initial state
      this.style.overflow = 'hidden';
      this.style.display = display;
      
      // Get natural dimensions
      const targetHeight = this.offsetHeight;
      const targetWidth = this.offsetWidth;
      
      // Start from zero
      this.style.height = '0px';
      this.style.width = '0px';
      this.style.opacity = '0';
      
      // Animate to natural size
      animate({ 0: this, length: 1 }, {
        height: targetHeight,
        width: targetWidth,
        opacity: 1
      }, {
        duration: options.duration,
        easing: options.easing,
        complete: () => {
          this.style.overflow = '';
          this.style.height = '';
          this.style.width = '';
          if (options.complete) options.complete.call(this);
        }
      });
    });
  }

  /**
   * Hide elements with optional animation
   * @param {jQCollection} collection
   * @param {number|string|Object} [duration]
   * @param {string|Function} [easing]
   * @param {Function} [callback]
   * @returns {jQCollection}
   */
  function hide(collection, duration, easing, callback) {
    const options = normalizeOptions(duration, easing, callback);
    
    // No animation
    if (!options.duration) {
      return collection.each(function() {
        if (!isHidden(this)) {
          // Store current display
          const display = getComputedStyle(this).display;
          if (display !== 'none') {
            setInternalData(this, 'olddisplay', display);
          }
          this.style.display = 'none';
        }
        if (options.complete) {
          options.complete.call(this);
        }
      });
    }
    
    // With animation
    return collection.each(function() {
      if (isHidden(this)) {
        if (options.complete) options.complete.call(this);
        return;
      }
      
      // Store original display
      const display = getComputedStyle(this).display;
      if (display !== 'none') {
        setInternalData(this, 'olddisplay', display);
      }
      
      this.style.overflow = 'hidden';
      
      animate({ 0: this, length: 1 }, {
        height: 0,
        width: 0,
        opacity: 0
      }, {
        duration: options.duration,
        easing: options.easing,
        complete: () => {
          this.style.display = 'none';
          this.style.overflow = '';
          this.style.height = '';
          this.style.width = '';
          this.style.opacity = '';
          if (options.complete) options.complete.call(this);
        }
      });
    });
  }

  /**
   * Toggle visibility with optional animation
   * @param {jQCollection} collection
   * @param {boolean|number|string|Object} [state]
   * @param {string|Function} [easing]
   * @param {Function} [callback]
   * @returns {jQCollection}
   */
  function toggle(collection, state, easing, callback) {
    // Handle boolean state
    if (typeof state === 'boolean') {
      return state ? show(collection) : hide(collection);
    }
    
    return collection.each(function() {
      if (isHidden(this)) {
        show({ 0: this, length: 1 }, state, easing, callback);
      } else {
        hide({ 0: this, length: 1 }, state, easing, callback);
      }
    });
  }

  /**
   * Slide down (show with height animation)
   * @param {jQCollection} collection
   * @param {number|string|Object} [duration]
   * @param {string|Function} [easing]
   * @param {Function} [callback]
   * @returns {jQCollection}
   */
  function slideDown(collection, duration, easing, callback) {
    const options = normalizeOptions(duration, easing, callback);
    
    return collection.each(function() {
      if (!isHidden(this)) {
        if (options.complete) options.complete.call(this);
        return;
      }
      
      const display = getInternalData(this, 'olddisplay') || getDefaultDisplay(this);
      
      // Show element to get natural height
      this.style.display = display;
      this.style.overflow = 'hidden';
      const targetHeight = this.offsetHeight;
      
      // Start from zero height
      this.style.height = '0px';
      
      animate({ 0: this, length: 1 }, {
        height: targetHeight
      }, {
        duration: options.duration,
        easing: options.easing,
        complete: () => {
          this.style.overflow = '';
          this.style.height = '';
          if (options.complete) options.complete.call(this);
        }
      });
    });
  }

  /**
   * Slide up (hide with height animation)
   * @param {jQCollection} collection
   * @param {number|string|Object} [duration]
   * @param {string|Function} [easing]
   * @param {Function} [callback]
   * @returns {jQCollection}
   */
  function slideUp(collection, duration, easing, callback) {
    const options = normalizeOptions(duration, easing, callback);
    
    return collection.each(function() {
      if (isHidden(this)) {
        if (options.complete) options.complete.call(this);
        return;
      }
      
      // Store original display
      const display = getComputedStyle(this).display;
      if (display !== 'none') {
        setInternalData(this, 'olddisplay', display);
      }
      
      this.style.overflow = 'hidden';
      
      animate({ 0: this, length: 1 }, {
        height: 0
      }, {
        duration: options.duration,
        easing: options.easing,
        complete: () => {
          this.style.display = 'none';
          this.style.overflow = '';
          this.style.height = '';
          if (options.complete) options.complete.call(this);
        }
      });
    });
  }

  /**
   * Toggle slide
   * @param {jQCollection} collection
   * @param {number|string|Object} [duration]
   * @param {string|Function} [easing]
   * @param {Function} [callback]
   * @returns {jQCollection}
   */
  function slideToggle(collection, duration, easing, callback) {
    return collection.each(function() {
      if (isHidden(this)) {
        slideDown({ 0: this, length: 1 }, duration, easing, callback);
      } else {
        slideUp({ 0: this, length: 1 }, duration, easing, callback);
      }
    });
  }

  /**
   * Fade in
   * @param {jQCollection} collection
   * @param {number|string|Object} [duration]
   * @param {string|Function} [easing]
   * @param {Function} [callback]
   * @returns {jQCollection}
   */
  function fadeIn(collection, duration, easing, callback) {
    const options = normalizeOptions(duration, easing, callback);
    
    return collection.each(function() {
      if (!isHidden(this) && getComputedStyle(this).opacity !== '0') {
        if (options.complete) options.complete.call(this);
        return;
      }
      
      const display = getInternalData(this, 'olddisplay') || getDefaultDisplay(this);
      
      this.style.display = display;
      this.style.opacity = '0';
      
      animate({ 0: this, length: 1 }, {
        opacity: 1
      }, {
        duration: options.duration,
        easing: options.easing,
        complete: () => {
          this.style.opacity = '';
          if (options.complete) options.complete.call(this);
        }
      });
    });
  }

  /**
   * Fade out
   * @param {jQCollection} collection
   * @param {number|string|Object} [duration]
   * @param {string|Function} [easing]
   * @param {Function} [callback]
   * @returns {jQCollection}
   */
  function fadeOut(collection, duration, easing, callback) {
    const options = normalizeOptions(duration, easing, callback);
    
    return collection.each(function() {
      if (isHidden(this)) {
        if (options.complete) options.complete.call(this);
        return;
      }
      
      // Store original display
      const display = getComputedStyle(this).display;
      if (display !== 'none') {
        setInternalData(this, 'olddisplay', display);
      }
      
      animate({ 0: this, length: 1 }, {
        opacity: 0
      }, {
        duration: options.duration,
        easing: options.easing,
        complete: () => {
          this.style.display = 'none';
          this.style.opacity = '';
          if (options.complete) options.complete.call(this);
        }
      });
    });
  }

  /**
   * Fade to specific opacity
   * @param {jQCollection} collection
   * @param {number|string} duration
   * @param {number} opacity
   * @param {Function} [callback]
   * @returns {jQCollection}
   */
  function fadeTo(collection, duration, opacity, callback) {
    const options = normalizeOptions(duration, undefined, callback);
    
    return collection.each(function() {
      // Show if hidden
      if (isHidden(this)) {
        this.style.opacity = '0';
        this.style.display = getInternalData(this, 'olddisplay') || getDefaultDisplay(this);
      }
      
      animate({ 0: this, length: 1 }, {
        opacity: opacity
      }, {
        duration: options.duration,
        easing: options.easing,
        complete: options.complete
      });
    });
  }

  /**
   * Toggle fade
   * @param {jQCollection} collection
   * @param {number|string|Object} [duration]
   * @param {string|Function} [easing]
   * @param {Function} [callback]
   * @returns {jQCollection}
   */
  function fadeToggle(collection, duration, easing, callback) {
    return collection.each(function() {
      if (isHidden(this) || getComputedStyle(this).opacity === '0') {
        fadeIn({ 0: this, length: 1 }, duration, easing, callback);
      } else {
        fadeOut({ 0: this, length: 1 }, duration, easing, callback);
      }
    });
  }

  /**
   * jQNext - AJAX Core
   * Modern AJAX using Fetch API with jQuery-compatible interface
   */


  // Default AJAX settings
  const ajaxSettings = {
    url: location.href,
    type: 'GET',
    contentType: 'application/x-www-form-urlencoded; charset=UTF-8',
    processData: true,
    async: true,
    accepts: {
      '*': '*/*',
      text: 'text/plain',
      html: 'text/html',
      xml: 'application/xml, text/xml',
      json: 'application/json, text/javascript',
      script: 'text/javascript, application/javascript'
    },
    dataType: null,
    timeout: 0,
    cache: true,
    crossDomain: false,
    headers: {},
    global: true
  };

  // Active request count
  let active = 0;

  /**
   * Setup default AJAX settings
   * @param {Object} settings
   */
  function ajaxSetup(settings) {
    extend(ajaxSettings, settings);
  }

  /**
   * AJAX prefilters
   */
  const prefilters = [];

  /**
   * Add AJAX prefilter
   * @param {string|Function} dataTypeOrHandler
   * @param {Function} [handler]
   */
  function ajaxPrefilter(dataTypeOrHandler, handler) {
    if (isFunction(dataTypeOrHandler)) {
      handler = dataTypeOrHandler;
      dataTypeOrHandler = '*';
    }
    prefilters.push({ dataType: dataTypeOrHandler, handler });
  }

  /**
   * Add AJAX transport
   * @param {string} dataType
   * @param {Function} handler
   */
  function ajaxTransport(dataType, handler) {
  }

  /**
   * Main AJAX function
   * @param {string|Object} url - URL or settings object
   * @param {Object} [settings] - AJAX settings
   * @returns {Object} - jqXHR object (Deferred-compatible)
   */
  function ajax(url, settings) {
    // Handle overloaded signature
    if (typeof url === 'object') {
      settings = url;
      url = settings.url;
    }
    
    // Merge settings with defaults
    const s = extend({}, ajaxSettings, settings);
    s.url = url || s.url;
    s.type = (s.type || s.method || 'GET').toUpperCase();
    
    // Process data types
    const dataTypes = (s.dataType || '*').toLowerCase().split(/\s+/);
    
    // Create jqXHR (Deferred-compatible) - MUST be before prefilters
    const deferred = Deferred();
    const jqXHR = deferred.promise({
      readyState: 0,
      status: 0,
      statusText: '',
      responseText: '',
      responseJSON: null,
      responseXML: null,
      
      getResponseHeader(name) {
        return this._responseHeaders?.[name.toLowerCase()];
      },
      
      getAllResponseHeaders() {
        if (!this._responseHeaders) return '';
        return Object.entries(this._responseHeaders)
          .map(([k, v]) => `${k}: ${v}`)
          .join('\r\n');
      },
      
      setRequestHeader(name, value) {
        if (this.readyState === 0) {
          s.headers[name] = value;
        }
        return this;
      },
      
      overrideMimeType(type) {
        s.mimeType = type;
        return this;
      },
      
      abort(statusText) {
        if (controller) {
          controller.abort();
        }
        done(0, statusText || 'abort');
        return this;
      }
    });
    
    // Run prefilters (after jqXHR is created)
    prefilters.forEach(({ dataType, handler }) => {
      if (dataType === '*' || dataTypes.includes(dataType)) {
        handler(s, settings || {}, jqXHR);
      }
    });
    
    // Callbacks
    jqXHR.success = jqXHR.done;
    jqXHR.error = jqXHR.fail;
    jqXHR.complete = jqXHR.always;
    
    // Abort controller
    let controller;
    
    // Process URL for cache busting
    let requestUrl = s.url;
    
    if (!s.cache && s.type === 'GET') {
      const timestamp = '_=' + Date.now();
      requestUrl += (requestUrl.indexOf('?') > -1 ? '&' : '?') + timestamp;
    }
    
    // Process data
    let requestData = s.data;
    
    if (requestData && s.processData && !isString(requestData)) {
      requestData = param(requestData);
    }
    
    // Append data to URL for GET requests
    if (requestData && s.type === 'GET') {
      requestUrl += (requestUrl.indexOf('?') > -1 ? '&' : '?') + requestData;
      requestData = null;
    }
    
    // Build fetch options
    const fetchOptions = {
      method: s.type,
      headers: new Headers(),
      credentials: s.xhrFields?.withCredentials ? 'include' : 'same-origin'
    };
    
    // Set headers
    if (s.contentType !== false && s.type !== 'GET') {
      fetchOptions.headers.set('Content-Type', s.contentType);
    }
    
    // Accept header based on dataType
    const accept = s.accepts[dataTypes[0]] || s.accepts['*'];
    fetchOptions.headers.set('Accept', accept);
    
    // X-Requested-With header
    if (!s.crossDomain) {
      fetchOptions.headers.set('X-Requested-With', 'XMLHttpRequest');
    }
    
    // Custom headers
    for (const header in s.headers) {
      fetchOptions.headers.set(header, s.headers[header]);
    }
    
    // Set body for non-GET requests
    if (requestData && s.type !== 'GET') {
      if (s.contentType && s.contentType.indexOf('json') > -1) {
        fetchOptions.body = isString(requestData) ? requestData : JSON.stringify(requestData);
      } else if (requestData instanceof FormData) {
        fetchOptions.body = requestData;
        // Let browser set content-type for FormData
        fetchOptions.headers.delete('Content-Type');
      } else {
        fetchOptions.body = requestData;
      }
    }
    
    // Timeout handling
    if (s.timeout > 0) {
      controller = new AbortController();
      fetchOptions.signal = controller.signal;
      
      setTimeout(() => {
        if (jqXHR.readyState < 4) {
          controller.abort();
          done(0, 'timeout');
        }
      }, s.timeout);
    }
    
    // Before send callback
    if (s.beforeSend) {
      if (s.beforeSend.call(s.context || s, jqXHR, s) === false) {
        return jqXHR;
      }
    }
    
    // Global ajaxStart
    if (s.global && active++ === 0) {
      triggerGlobal('ajaxStart');
    }
    
    // Global ajaxSend
    if (s.global) {
      triggerGlobal('ajaxSend', [jqXHR, s]);
    }
    
    jqXHR.readyState = 1;
    
    // Execute fetch
    fetch(requestUrl, fetchOptions)
      .then(response => {
        jqXHR.readyState = 2;
        jqXHR.status = response.status;
        jqXHR.statusText = response.statusText;
        
        // Store headers
        jqXHR._responseHeaders = {};
        response.headers.forEach((value, name) => {
          jqXHR._responseHeaders[name.toLowerCase()] = value;
        });
        
        // Check for HTTP errors
        if (!response.ok) {
          throw response;
        }
        
        // Parse response based on dataType
        const contentType = response.headers.get('Content-Type') || '';
        let dataType = dataTypes[0];
        
        // Auto-detect data type if not specified
        if (!dataType || dataType === '*') {
          if (contentType.indexOf('json') > -1) {
            dataType = 'json';
          } else if (contentType.indexOf('xml') > -1) {
            dataType = 'xml';
          } else if (contentType.indexOf('html') > -1) {
            dataType = 'html';
          } else {
            dataType = 'text';
          }
        }
        
        // Parse response
        if (dataType === 'json') {
          return response.json().then(data => {
            jqXHR.responseJSON = data;
            return data;
          });
        } else if (dataType === 'xml') {
          return response.text().then(text => {
            jqXHR.responseText = text;
            const parser = new DOMParser();
            jqXHR.responseXML = parser.parseFromString(text, 'text/xml');
            return jqXHR.responseXML;
          });
        } else {
          return response.text().then(text => {
            jqXHR.responseText = text;
            return text;
          });
        }
      })
      .then(data => {
        done(jqXHR.status, jqXHR.statusText, data);
      })
      .catch(error => {
        if (error.name === 'AbortError') {
          // Already handled by abort
          return;
        }
        
        jqXHR.status = error.status || 0;
        jqXHR.statusText = error.statusText || 'error';
        
        done(jqXHR.status, jqXHR.statusText, null, error);
      });
    
    /**
     * Complete the request
     */
    function done(status, statusText, data, error) {
      if (jqXHR.readyState === 4) return;
      
      jqXHR.readyState = 4;
      jqXHR.status = status;
      jqXHR.statusText = statusText;
      
      const isSuccess = status >= 200 && status < 300 || status === 304;
      
      if (isSuccess) {
        // Success callbacks
        if (s.success) {
          s.success.call(s.context || s, data, statusText, jqXHR);
        }
        deferred.resolveWith(s.context || s, [data, statusText, jqXHR]);
      } else {
        // Error callbacks
        if (s.error) {
          s.error.call(s.context || s, jqXHR, statusText, error);
        }
        deferred.rejectWith(s.context || s, [jqXHR, statusText, error]);
      }
      
      // Complete callbacks
      if (s.complete) {
        s.complete.call(s.context || s, jqXHR, statusText);
      }
      
      // Global events
      if (s.global) {
        triggerGlobal('ajaxComplete', [jqXHR, s]);
        
        if (isSuccess) {
          triggerGlobal('ajaxSuccess', [jqXHR, s, data]);
        } else {
          triggerGlobal('ajaxError', [jqXHR, s, error]);
        }
        
        if (--active === 0) {
          triggerGlobal('ajaxStop');
        }
      }
    }
    
    return jqXHR;
  }

  /**
   * Trigger global AJAX event
   */
  function triggerGlobal(type, args = []) {
    const event = new CustomEvent(type, {
      bubbles: true,
      cancelable: true,
      detail: args
    });
    document.dispatchEvent(event);
  }

  /**
   * Shorthand GET request
   * @param {string} url
   * @param {Object|Function} [data]
   * @param {Function} [success]
   * @param {string} [dataType]
   * @returns {Object} jqXHR
   */
  function get(url, data, success, dataType) {
    // Shift arguments if data is a function
    if (isFunction(data)) {
      dataType = dataType || success;
      success = data;
      data = undefined;
    }
    
    return ajax({
      url,
      data,
      success,
      dataType,
      type: 'GET'
    });
  }

  /**
   * Shorthand POST request
   * @param {string} url
   * @param {Object|Function} [data]
   * @param {Function} [success]
   * @param {string} [dataType]
   * @returns {Object} jqXHR
   */
  function post(url, data, success, dataType) {
    if (isFunction(data)) {
      dataType = dataType || success;
      success = data;
      data = undefined;
    }
    
    return ajax({
      url,
      data,
      success,
      dataType,
      type: 'POST'
    });
  }

  /**
   * Get JSON
   * @param {string} url
   * @param {Object|Function} [data]
   * @param {Function} [success]
   * @returns {Object} jqXHR
   */
  function getJSON(url, data, success) {
    if (isFunction(data)) {
      success = data;
      data = undefined;
    }
    
    return get(url, data, success, 'json');
  }

  /**
   * Load and execute script
   * @param {string} url
   * @param {Function} [success]
   * @returns {Object} jqXHR
   */
  function getScript(url, success) {
    return ajax({
      url,
      type: 'GET',
      dataType: 'script',
      cache: true,
      success
    }).then(script => {
      // Execute the script
      const scriptElem = document.createElement('script');
      scriptElem.text = script;
      document.head.appendChild(scriptElem).parentNode.removeChild(scriptElem);
      return script;
    });
  }

  /**
   * Load HTML into element
   * @param {jQCollection} collection
   * @param {string} url
   * @param {Object|Function} [data]
   * @param {Function} [complete]
   * @returns {jQCollection}
   */
  function load(collection, url, data, complete) {
    if (!collection.length) {
      return collection;
    }
    
    // Ensure url is a string
    if (typeof url !== 'string') {
      return collection;
    }
    
    // Handle argument shifting
    if (isFunction(data)) {
      complete = data;
      data = undefined;
    }
    
    // Check for selector in URL
    const selector = url.indexOf(' ') > -1
      ? url.slice(url.indexOf(' ') + 1)
      : null;
    const requestUrl = selector ? url.slice(0, url.indexOf(' ')) : url;
    
    ajax({
      url: requestUrl,
      type: data ? 'POST' : 'GET',
      dataType: 'html',
      data
    }).done((responseText) => {
      // If selector specified, extract matching content
      let content = responseText;
      
      if (selector) {
        const temp = document.createElement('div');
        temp.innerHTML = responseText;
        const found = temp.querySelectorAll(selector);
        content = '';
        found.forEach(el => content += el.innerHTML);
      }
      
      // Insert content
      collection.each(function() {
        this.innerHTML = content;
      });
      
      // Execute callback
      if (complete) {
        collection.each(function() {
          complete.call(this, responseText, 'success', null);
        });
      }
    }).fail((jqXHR, status, error) => {
      if (complete) {
        collection.each(function() {
          complete.call(this, jqXHR.responseText || '', status, jqXHR);
        });
      }
    });
    
    return collection;
  }

  /**
   * jQNext - Form Serialization
   * Serialize forms and form elements
   */


  /**
   * Elements that can be serialized
   */
  const rsubmittable = /^(?:input|select|textarea|keygen)/i;
  const rsubmitterTypes = /^(?:submit|button|image|reset|file)$/i;
  const rcheckableType = /^(?:checkbox|radio)$/i;

  /**
   * Get serializable form elements
   * @param {Element} form
   * @returns {Element[]}
   */
  function getSerializableElements(form) {
    const elements = [];
    
    // Handle form or collection of elements
    if (form.elements) {
      // It's a form
      const formElements = form.elements;
      for (let i = 0; i < formElements.length; i++) {
        elements.push(formElements[i]);
      }
    } else if (form.length !== undefined) {
      // It's a collection
      for (let i = 0; i < form.length; i++) {
        if (form[i].elements) {
          // Form element
          const formElements = form[i].elements;
          for (let j = 0; j < formElements.length; j++) {
            elements.push(formElements[j]);
          }
        } else {
          elements.push(form[i]);
        }
      }
    } else {
      elements.push(form);
    }
    
    return elements.filter(elem => {
      const type = elem.type;
      const name = elem.name;
      
      // Must have a name
      if (!name) return false;
      
      // Must not be disabled
      if (elem.disabled) return false;
      
      // Must match submittable pattern
      if (!rsubmittable.test(elem.nodeName)) return false;
      
      // Must not be submit/button/image/reset/file type
      if (rsubmitterTypes.test(type)) return false;
      
      // Checkboxes and radios must be checked
      if (rcheckableType.test(type) && !elem.checked) return false;
      
      return true;
    });
  }

  /**
   * Get the value of a form element
   * @param {Element} elem
   * @returns {string|string[]}
   */
  function getValue(elem) {
    const type = elem.type;
    
    // Select element
    if (elem.nodeName.toLowerCase() === 'select') {
      if (elem.multiple) {
        const values = [];
        const options = elem.options;
        for (let i = 0; i < options.length; i++) {
          if (options[i].selected) {
            values.push(options[i].value);
          }
        }
        return values;
      }
      return elem.value;
    }
    
    // Checkbox/radio
    if (rcheckableType.test(type)) {
      return elem.value;
    }
    
    // Normalize line endings
    return elem.value.replace(/\r?\n/g, '\r\n');
  }

  /**
   * Serialize form elements to array of {name, value} objects
   * @param {jQCollection} collection
   * @returns {Array}
   */
  function serializeArray(collection) {
    const result = [];
    
    // Get all elements to serialize
    const elements = [];
    for (let i = 0; i < collection.length; i++) {
      elements.push(...getSerializableElements(collection[i]));
    }
    
    // Build result array
    elements.forEach(elem => {
      const name = elem.name;
      const value = getValue(elem);
      
      if (Array.isArray(value)) {
        // Multiple select values
        value.forEach(v => {
          result.push({ name, value: v });
        });
      } else {
        result.push({ name, value });
      }
    });
    
    return result;
  }

  /**
   * Serialize form elements to URL-encoded string
   * @param {jQCollection} collection
   * @returns {string}
   */
  function serialize(collection) {
    return param(serializeArray(collection));
  }

  /**
   * jQNext - jQuery UI Compatibility Layer
   * Widget factory and UI utilities for jQuery UI 1.11.x support
   */


  /**
   * UI namespace
   */
  const ui = {
    version: '1.11.4-compat',
    
    // Key codes used by jQuery UI
    keyCode: {
      BACKSPACE: 8,
      COMMA: 188,
      DELETE: 46,
      DOWN: 40,
      END: 35,
      ENTER: 13,
      ESCAPE: 27,
      HOME: 36,
      LEFT: 37,
      PAGE_DOWN: 34,
      PAGE_UP: 33,
      PERIOD: 190,
      RIGHT: 39,
      SPACE: 32,
      TAB: 9,
      UP: 38
    },
    
    // Safe active element access
    safeActiveElement: function(document) {
      try {
        return document.activeElement;
      } catch (error) {
        return document.body;
      }
    },
    
    // Safe blur
    safeBlur: function(element) {
      if (element && element.nodeName.toLowerCase() !== 'body') {
        try {
          element.blur();
        } catch (error) {
          // Ignore errors
        }
      }
    }
  };

  /**
   * Widget factory storage
   */
  const widgetUuid = 0;

  /**
   * Base Widget class
   */
  class Widget {
    constructor() {
      this.widgetName = 'widget';
      this.widgetEventPrefix = '';
      this.defaultElement = '<div>';
      this.options = {
        disabled: false,
        create: null
      };
      this.element = null;
      this.uuid = widgetUuid;
      this.eventNamespace = '';
      this.bindings = null;
      this.hoverable = null;
      this.focusable = null;
    }
    
    _createWidget(options, element) {
      this.element = element instanceof Element ? element : element[0];
      this.uuid = widgetUuid++;
      this.eventNamespace = '.' + this.widgetName + this.uuid;
      this.bindings = [];
      this.hoverable = [];
      this.focusable = [];
      
      // Merge options
      this.options = extend(true, {},
        this.options,
        this._getCreateOptions(),
        options
      );
      
      // Store instance
      setData(this.element, 'ui-' + this.widgetName, this);
      
      this._create();
      this._trigger('create', null, this._getCreateEventData());
      this._init();
    }
    
    _getCreateOptions() {
      return {};
    }
    
    _getCreateEventData() {
      return {};
    }
    
    _create() {}
    
    _init() {}
    
    destroy() {
      this._destroy();
      
      // Remove data
      removeData(this.element, 'ui-' + this.widgetName);
      
      // Unbind events
      this.bindings.forEach(binding => {
        off({ 0: binding, length: 1 }, this.eventNamespace);
      });
      
      // Remove hover/focus classes
      this.hoverable.forEach(elem => {
        elem.classList.remove('ui-state-hover');
      });
      this.focusable.forEach(elem => {
        elem.classList.remove('ui-state-focus');
      });
    }
    
    _destroy() {}
    
    widget() {
      return this.element;
    }
    
    option(key, value) {
      if (arguments.length === 0) {
        return extend({}, this.options);
      }
      
      if (typeof key === 'string') {
        const parts = key.split('.');
        let curOption = this.options;
        
        // Getter
        if (value === undefined) {
          for (let i = 0; i < parts.length; i++) {
            curOption = curOption[parts[i]];
            if (curOption === undefined) {
              return undefined;
            }
          }
          return curOption;
        }
        
        // Setter
        const lastPart = parts.pop();
        for (let i = 0; i < parts.length; i++) {
          curOption = curOption[parts[i]] = curOption[parts[i]] || {};
        }
        curOption[lastPart] = value;
        this._setOption(lastPart, value);
      } else {
        // Object of options
        for (const k in key) {
          this._setOption(k, key[k]);
        }
      }
      
      return this;
    }
    
    _setOption(key, value) {
      this.options[key] = value;
      
      if (key === 'disabled') {
        this._toggleClass(this.widget(), null, 'ui-state-disabled', !!value);
        if (value) {
          this._removeClass(this.hoverable, null, 'ui-state-hover');
          this._removeClass(this.focusable, null, 'ui-state-focus');
        }
      }
      
      return this;
    }
    
    _setOptions(options) {
      for (const key in options) {
        this._setOption(key, options[key]);
      }
      return this;
    }
    
    enable() {
      return this._setOptions({ disabled: false });
    }
    
    disable() {
      return this._setOptions({ disabled: true });
    }
    
    _on(suppressDisabledCheck, element, handlers) {
      // Handle argument shifting
      if (typeof suppressDisabledCheck !== 'boolean') {
        handlers = element;
        element = suppressDisabledCheck;
        suppressDisabledCheck = false;
      }
      
      if (!handlers) {
        handlers = element;
        element = this.element;
      } else {
        element = element instanceof Element ? element : element[0] || element;
      }
      
      const instance = this;
      
      for (const event in handlers) {
        const handler = handlers[event];
        
        // Ensure event is a string
        const eventStr = String(event || '');
        
        // Add namespace
        const eventParts = eventStr.split(' ');
        const eventType = eventParts[0] + this.eventNamespace;
        const selector = eventParts.slice(1).join(' ') || undefined;
        
        const wrappedHandler = function(evt) {
          if (!suppressDisabledCheck && 
              (instance.options.disabled === true || 
               evt.currentTarget.classList.contains('ui-state-disabled'))) {
            return;
          }
          return (typeof handler === 'string' ? instance[handler] : handler)
            .apply(instance, arguments);
        };
        
        on({ 0: element, length: 1 }, eventType, selector, null, wrappedHandler);
        this.bindings.push(element);
      }
    }
    
    _off(element, eventName) {
      const elem = element instanceof Element ? element : element[0] || element;
      eventName = (eventName || '').split(' ')
        .map(e => e + this.eventNamespace)
        .join(' ');
      off({ 0: elem, length: 1 }, eventName);
    }
    
    _trigger(type, event, data) {
      const prop = this.options[type];
      data = data || {};
      
      // Create jQuery-like event
      const customEvent = new CustomEvent(this.widgetEventPrefix + type, {
        bubbles: true,
        cancelable: true,
        detail: data
      });
      
      // Add original event properties
      if (event) {
        customEvent.originalEvent = event;
      }
      
      this.element.dispatchEvent(customEvent);
      
      // Call callback
      if (isFunction(prop)) {
        return prop.call(this.element, customEvent, data) !== false && 
               !customEvent.defaultPrevented;
      }
      
      return !customEvent.defaultPrevented;
    }
    
    _delay(handler, delay) {
      const instance = this;
      return setTimeout(function() {
        return (typeof handler === 'string' ? instance[handler] : handler)
          .apply(instance, arguments);
      }, delay || 0);
    }
    
    _hoverable(element) {
      const elem = element instanceof Element ? element : element[0];
      this.hoverable.push(elem);
      
      this._on(elem, {
        mouseenter: function(event) {
          this._addClass(event.currentTarget, null, 'ui-state-hover');
        },
        mouseleave: function(event) {
          this._removeClass(event.currentTarget, null, 'ui-state-hover');
        }
      });
    }
    
    _focusable(element) {
      const elem = element instanceof Element ? element : element[0];
      this.focusable.push(elem);
      
      this._on(elem, {
        focusin: function(event) {
          this._addClass(event.currentTarget, null, 'ui-state-focus');
        },
        focusout: function(event) {
          this._removeClass(event.currentTarget, null, 'ui-state-focus');
        }
      });
    }
    
    _addClass(element, keys, extra) {
      const elem = element instanceof Element ? element : 
                   (element && element[0]) || this.element;
      const classes = [];
      
      if (keys) {
        keys.split(' ').forEach(key => {
          if (this.options.classes && this.options.classes[key]) {
            classes.push(this.options.classes[key]);
          }
          classes.push(key);
        });
      }
      
      if (extra) {
        classes.push(...extra.split(' '));
      }
      
      elem.classList.add(...classes.filter(Boolean));
    }
    
    _removeClass(element, keys, extra) {
      const elem = element instanceof Element ? element :
                   (element && element[0]) || this.element;
      const classes = [];
      
      if (keys) {
        keys.split(' ').forEach(key => {
          if (this.options.classes && this.options.classes[key]) {
            classes.push(this.options.classes[key]);
          }
          classes.push(key);
        });
      }
      
      if (extra) {
        classes.push(...extra.split(' '));
      }
      
      elem.classList.remove(...classes.filter(Boolean));
    }
    
    _toggleClass(element, keys, extra, add) {
      if (typeof add === 'boolean') {
        if (add) {
          this._addClass(element, keys, extra);
        } else {
          this._removeClass(element, keys, extra);
        }
      } else {
        const elem = element instanceof Element ? element :
                     (element && element[0]) || this.element;
        
        const classes = [];
        if (keys) classes.push(...keys.split(' '));
        if (extra) classes.push(...extra.split(' '));
        
        classes.filter(Boolean).forEach(cls => elem.classList.toggle(cls));
      }
    }
    
    _scrollParent(includeHidden) {
      const position = getComputedStyle(this.element).position;
      const excludeStaticParent = position === 'absolute';
      const overflowRegex = includeHidden ? /(auto|scroll|hidden)/ : /(auto|scroll)/;
      
      let scrollParent = this.element.parentElement;
      
      while (scrollParent) {
        const style = getComputedStyle(scrollParent);
        
        if (excludeStaticParent && style.position === 'static') {
          scrollParent = scrollParent.parentElement;
          continue;
        }
        
        if (overflowRegex.test(style.overflow + style.overflowY + style.overflowX)) {
          return scrollParent;
        }
        
        scrollParent = scrollParent.parentElement;
      }
      
      return document.scrollingElement || document.documentElement;
    }
  }

  /**
   * Widget factory function
   * Creates a new widget constructor and registers it as a jQuery plugin
   */
  function widget(name, base, prototype) {
    const namespace = name.split('.')[0];
    const widgetName = name.split('.')[1] || name;
    
    // Handle base argument
    if (!prototype) {
      prototype = base;
      base = Widget;
    }
    
    // Create widget constructor
    const WidgetConstructor = function(options, element) {
      // Allow instantiation without 'new'
      if (!(this instanceof WidgetConstructor)) {
        return new WidgetConstructor(options, element);
      }
      
      // Call parent constructor
      if (base !== Widget) {
        base.call(this);
      } else {
        Widget.call(this);
      }
      
      // Merge prototype
      for (const key in prototype) {
        if (key !== '_create' && key !== '_init' && key !== 'options') {
          this[key] = prototype[key];
        }
      }
      
      // Set widget name
      this.widgetName = widgetName;
      this.widgetEventPrefix = prototype.widgetEventPrefix || widgetName;
      
      // Merge options
      if (prototype.options) {
        this.options = extend(true, {}, this.options, prototype.options);
      }
      
      // Override _create and _init if provided
      if (prototype._create) {
        const parentCreate = this._create;
        this._create = function() {
          if (parentCreate) parentCreate.call(this);
          prototype._create.call(this);
        };
      }
      
      if (prototype._init) {
        const parentInit = this._init;
        this._init = function() {
          if (parentInit) parentInit.call(this);
          prototype._init.call(this);
        };
      }
      
      if (prototype._destroy) {
        const parentDestroy = this._destroy;
        this._destroy = function() {
          prototype._destroy.call(this);
          if (parentDestroy) parentDestroy.call(this);
        };
      }
      
      // Initialize if element provided
      if (arguments.length) {
        this._createWidget(options, element);
      }
    };
    
    // Inherit from base
    WidgetConstructor.prototype = Object.create(base.prototype);
    WidgetConstructor.prototype.constructor = WidgetConstructor;
    
    // Store constructor
    if (!ui[namespace]) {
      ui[namespace] = {};
    }
    ui[widgetName] = WidgetConstructor;
    
    return WidgetConstructor;
  }

  /**
   * Register widget as jQuery plugin
   * @param {Function} jQNext - The jQNext function
   * @param {string} name - Widget name
   * @param {Function} WidgetConstructor - Widget constructor
   */
  function registerPlugin(jQNext, name, WidgetConstructor) {
    const widgetName = name.split('.').pop();
    
    jQNext.fn[widgetName] = function(options, ...args) {
      const isMethodCall = typeof options === 'string';
      
      if (isMethodCall) {
        const methodName = options;
        let returnValue;
        
        this.each(function() {
          const instance = getDataValue(this, 'ui-' + widgetName);
          
          if (!instance) {
            console.error(`Cannot call methods on ${widgetName} prior to initialization`);
            return;
          }
          
          if (!isFunction(instance[methodName]) || methodName.charAt(0) === '_') {
            console.error(`No such method '${methodName}' for ${widgetName}`);
            return;
          }
          
          const result = instance[methodName](...args);
          
          if (result !== instance && result !== undefined) {
            returnValue = result;
            return false; // Break the loop
          }
        });
        
        return returnValue !== undefined ? returnValue : this;
      }
      
      // Initialize widget
      return this.each(function() {
        const existing = getDataValue(this, 'ui-' + widgetName);
        
        if (existing) {
          // Update options
          existing._setOptions(options || {});
          if (existing._init) {
            existing._init();
          }
        } else {
          // Create new instance
          new WidgetConstructor(options, this);
        }
      });
    };
  }

  /**
   * jQNext - Modern jQuery 2.x Compatible Library
   * 
   * A drop-in replacement for jQuery 2.2.5 using modern JavaScript internals.
   * Compatible with jQuery UI 1.11.x
   * 
   * @version 1.0.0
   * @author Ready Intelligence
   * @license MIT
   */


  /**
   * The main jQNext function
   * @param {string|Element|Function|NodeList|Array} selector
   * @param {Element|Document} [context]
   * @returns {jQCollection}
   */
  function jQNext(selector, context) {
    const collection = new jQCollection();
    collection.init(selector, context);
    return collection;
  }

  // Set reference in collection module
  setJQNext(jQNext);

  // Version
  jQNext.fn = jQNext.prototype = jQCollection.prototype;
  jQNext.fn.jquery = '2.2.5-jqnext';
  jQNext.fn.constructor = jQNext;

  // ==================================================
  // STATIC METHODS
  // ==================================================

  // Utilities
  jQNext.extend = extend;
  jQNext.each = each;
  jQNext.map = map;
  jQNext.grep = grep;
  jQNext.inArray = inArray;
  jQNext.merge = merge;
  jQNext.makeArray = makeArray;
  jQNext.proxy = proxy;
  jQNext.noop = noop;
  jQNext.now = now;
  jQNext.uniqueSort = uniqueSort;
  jQNext.unique = uniqueSort; // Alias
  jQNext.contains = contains;
  jQNext.globalEval = globalEval;

  // Type checking
  jQNext.type = type;
  jQNext.isArray = isArray;
  jQNext.isFunction = isFunction;
  jQNext.isWindow = isWindow;
  jQNext.isNumeric = isNumeric;
  jQNext.isPlainObject = isPlainObject;
  jQNext.isEmptyObject = isEmptyObject;

  // Check if a document is an XML document
  jQNext.isXMLDoc = function(elem) {
    // documentElement is verified for cases where it doesn't yet exist
    const namespace = elem && (elem.ownerDocument || elem).documentElement;
    return namespace ? namespace.nodeName !== 'HTML' : false;
  };

  // Check if an element has a specific node name (case-insensitive)
  jQNext.nodeName = function(elem, name) {
    return elem && elem.nodeName && elem.nodeName.toLowerCase() === name.toLowerCase();
  };

  // String utilities
  jQNext.camelCase = camelCase;
  jQNext.trim = trim;
  jQNext.parseHTML = parseHTML;
  jQNext.parseJSON = parseJSON;
  jQNext.parseXML = parseXML;
  jQNext.param = param;
  jQNext.error = error$1;

  // Deferred
  jQNext.Deferred = Deferred;
  jQNext.Callbacks = Callbacks;
  jQNext.when = when;

  // Data
  jQNext.expando = expando;
  jQNext.data = function(elem, name, value) {
    // Getter: $.data(elem, key)
    if (value === undefined && typeof name !== 'object') {
      return getDataValue(elem, name);
    }
    // Setter: $.data(elem, key, value) - returns value
    // Or: $.data(elem, obj) - returns obj
    setData(elem, name, value);
    return typeof name === 'object' ? name : value;
  };
  jQNext.removeData = function(elem, name) {
    removeData(elem, name);
    return undefined;
  };
  jQNext.hasData = hasData;
  jQNext._data = function(elem, name, value) {
    // Internal data (for jQuery internals/plugins)
    // Getter
    if (value === undefined && typeof name !== 'object') {
      return getDataValue(elem, '_' + name);
    }
    // Setter - returns value/obj
    setData(elem, '_' + name, value);
    return typeof name === 'object' ? name : value;
  };
  jQNext._removeData = function(elem, name) {
    removeData(elem, '_' + name);
    return undefined;
  };
  jQNext.cleanData = cleanData;

  // AJAX
  jQNext.ajax = ajax;
  jQNext.ajaxSetup = ajaxSetup;
  jQNext.ajaxPrefilter = ajaxPrefilter;
  jQNext.ajaxTransport = ajaxTransport;
  jQNext.ajaxSettings = ajaxSettings;
  jQNext.get = get;
  jQNext.post = post;
  jQNext.getJSON = getJSON;
  jQNext.getScript = getScript;

  // Animation
  jQNext.fx = fx;
  jQNext.fx.speeds = speeds;
  jQNext.fx.step = {}; // For jQuery UI color animation hooks
  jQNext.easing = {
    linear: function(p) { return p; },
    swing: function(p) { return 0.5 - Math.cos(p * Math.PI) / 2; }
  };
  jQNext.Animation = {}; // Compatibility stub
  jQNext.speed = function(speed, easing, fn) {
    const opt = speed && typeof speed === 'object' ? extend({}, speed) : {
      complete: fn || (!fn && easing) || (isFunction(speed) && speed),
      duration: speed,
      easing: fn && easing || easing && !isFunction(easing) && easing
    };
    opt.duration = typeof opt.duration === 'number' ? opt.duration :
      opt.duration in speeds ? speeds[opt.duration] : speeds._default;
    opt.old = opt.complete;
    opt.complete = function() {
      if (isFunction(opt.old)) {
        opt.old.call(this);
      }
    };
    return opt;
  };

  // Queue utilities (static)
  jQNext.queue = function(elem, type, data) {
    return queue({ 0: elem, length: 1 }, type, data);
  };
  jQNext.dequeue = function(elem, type) {
    return dequeue({ 0: elem, length: 1 });
  };

  // Event constructor - jQuery UI expects $.Event()
  jQNext.Event = function(type, props) {
    // Allow instantiation without 'new'
    if (!(this instanceof jQNext.Event)) {
      return new jQNext.Event(type, props);
    }
    
    // Handle event object passed as type
    if (type && type.type) {
      this.originalEvent = type;
      this.type = type.type;
      this.isDefaultPrevented = type.defaultPrevented ||
        (type.defaultPrevented === undefined && type.returnValue === false)
          ? returnTrue : returnFalse;
      this.target = type.target;
      this.currentTarget = type.currentTarget;
      this.relatedTarget = type.relatedTarget;
      this.timeStamp = type.timeStamp || Date.now();
    } else {
      this.type = type;
      this.timeStamp = Date.now();
    }
    
    // Copy properties
    if (props) {
      extend(this, props);
    }
    
    // State tracking
    this._isDefaultPrevented = false;
    this._isPropagationStopped = false;
    this._isImmediatePropagationStopped = false;
  };

  jQNext.Event.prototype = {
    constructor: jQNext.Event,
    isDefaultPrevented: function() { return this._isDefaultPrevented; },
    isPropagationStopped: function() { return this._isPropagationStopped; },
    isImmediatePropagationStopped: function() { return this._isImmediatePropagationStopped; },
    preventDefault: function() {
      this._isDefaultPrevented = true;
      if (this.originalEvent) {
        this.originalEvent.preventDefault();
      }
    },
    stopPropagation: function() {
      this._isPropagationStopped = true;
      if (this.originalEvent) {
        this.originalEvent.stopPropagation();
      }
    },
    stopImmediatePropagation: function() {
      this._isImmediatePropagationStopped = true;
      this._isPropagationStopped = true;
      if (this.originalEvent) {
        this.originalEvent.stopImmediatePropagation();
      }
    }
  };

  function returnTrue() { return true; }
  function returnFalse() { return false; }

  // Event special
  jQNext.event = {
    special,
    // Event properties that should be copied - excluded 'type' (handled separately per tests)
    props: ('altKey bubbles cancelable ctrlKey currentTarget detail eventPhase ' +
      'metaKey relatedTarget shiftKey target timeStamp view which').split(' '),
    fixHooks: {},
    fix: function(event) {
      if (event instanceof jQNext.Event) {
        return event;
      }
      return new jQNext.Event(event);
    },
    simulate: function(type, elem, event) {
      const e = extend(new jQNext.Event(type), event, {
        type,
        isSimulated: true
      });
      if (elem.dispatchEvent) {
        elem.dispatchEvent(new CustomEvent(type, { detail: e, bubbles: true, cancelable: true }));
      }
    }
  };

  // Expression/Sizzle compatibility
  jQNext.expr = {
    ':': pseudoSelectors,
    pseudos: pseudoSelectors,
    match: {},
    filter: {},
    // Filter functions used by jquery.tabbable.js and other plugins
    filters: {
      visible: function(elem) {
        return !!(elem.offsetWidth || elem.offsetHeight || elem.getClientRects().length);
      },
      hidden: function(elem) {
        return !jQNext.expr.filters.visible(elem);
      }
    },
    // createPseudo wraps a factory function to be compatible with our pseudo-selector system
    // The factory takes the argument (e.g., "foo" from :hasData(foo)) and returns a filter function
    createPseudo: function(fn) {
      // Return a function that matches our pseudo signature (elem, index, collection, param)
      // but calls the factory pattern correctly
      var wrapped = function(elem, index, collection, param) {
        // Call the factory with the param to get the actual filter
        var filter = fn(param);
        // Call the filter with just the element (Sizzle/jQuery style)
        return filter(elem);
      };
      // Mark it as created via createPseudo so we know the signature
      wrapped._isCreatePseudo = true;
      return wrapped;
    }
  };
  jQNext.find = function(selector, context, results) {
    results = results || [];
    const found = querySelectorAllWithPseudo(selector, context);
    merge(results, found);
    return results;
  };
  // Sizzle/selector engine compatibility - compile function for pre-compiling selectors
  jQNext.find.compile = function(selector) {
    // Return a function that performs the selection (simplified Sizzle compatibility)
    return function(context, results) {
      return jQNext.find(selector, context, results);
    };
  };
  // matchesSelector for element matching
  jQNext.find.matchesSelector = function(elem, selector) {
    return matchesWithPseudo(elem, selector);
  };
  jQNext.find.matches = function(selector, elements) {
    return elements.filter(elem => matchesWithPseudo(elem, selector));
  };

  // Static CSS method (for plugins like jquery.tabbable.js)
  jQNext.css = function(elem, name, extra, styles) {
    return css({ 0: elem, length: 1 }, name);
  };

  // Static attr method (for plugins like jquery.tabbable.js)
  jQNext.attr = function(elem, name, value) {
    // Getter
    if (value === undefined) {
      if (!elem || elem.nodeType === 3 || elem.nodeType === 8 || !elem.getAttribute) {
        return undefined;
      }
      const val = elem.getAttribute(name);
      return val === null ? undefined : val;
    }
    // Setter
    elem.setAttribute(name, value);
    return value;
  };

  // CSS Hooks (for jQuery UI color animation etc.)
  jQNext.cssHooks = cssHooks;
  jQNext.cssNumber = {
    animationIterationCount: true,
    columnCount: true,
    fillOpacity: true,
    flexGrow: true,
    flexShrink: true,
    fontWeight: true,
    lineHeight: true,
    opacity: true,
    order: true,
    orphans: true,
    widows: true,
    zIndex: true,
    zoom: true
  };

  // Support (feature detection)
  jQNext.support = {
    ajax: true,
    cors: true,
    boxSizing: true,
    changeBubbles: true,
    focusin: true,
    optSelected: true,
    transition: true,
    // createHTMLDocument test - check if we can create an HTML document
    createHTMLDocument: (function() {
      try {
        return !!document.implementation.createHTMLDocument('');
      } catch (e) {
        return false;
      }
    })()
  };

  // jQuery UI
  jQNext.ui = ui;
  jQNext.widget = function(name, base, prototype) {
    const Constructor = widget(name, base, prototype);
    registerPlugin(jQNext, name, Constructor);
    return Constructor;
  };
  jQNext.Widget = Widget;

  // noConflict
  const _jQuery = typeof window !== 'undefined' ? window.jQuery : undefined;
  const _$ = typeof window !== 'undefined' ? window.$ : undefined;

  jQNext.noConflict = function(deep) {
    if (typeof window !== 'undefined') {
      if (window.$ === jQNext) {
        window.$ = _$;
      }
      if (deep && window.jQuery === jQNext) {
        window.jQuery = _jQuery;
      }
    }
    return jQNext;
  };

  // Ready state
  jQNext.isReady = false;
  jQNext.readyWait = 1;
  jQNext.ready = Deferred();
  jQNext.holdReady = function(hold) {
    if (hold) {
      jQNext.readyWait++;
    } else {
      // Trigger ready if all holds released
      if (--jQNext.readyWait === 0) {
        jQNext.isReady = true;
        jQNext.ready.resolveWith(document, [jQNext]);
      }
    }
  };

  if (document.readyState === 'complete' ||
      (document.readyState !== 'loading' && !document.documentElement.doScroll)) {
    setTimeout(() => {
      jQNext.isReady = true;
      jQNext.ready.resolveWith(document, [jQNext]);
    });
  } else {
    document.addEventListener('DOMContentLoaded', function() {
      jQNext.isReady = true;
      jQNext.ready.resolveWith(document, [jQNext]);
    });
  }

  // ==================================================
  // PROTOTYPE METHODS
  // ==================================================

  // Extend the prototype
  extend(jQNext.fn, {
    // Core
    jquery: '2.2.5-jqnext',
    length: 0,
    
    // Convert to array
    toArray: function() {
      return Array.prototype.slice.call(this);
    },
    
    // Get element(s)
    get: function(index) {
      return index === undefined 
        ? this.toArray() 
        : (index < 0 ? this[this.length + index] : this[index]);
    },
    
    // Size (deprecated but needed for compat)
    size: function() {
      return this.length;
    },
    
    // Traversal
    parent: function(selector) {
      return this.pushStack(parent(this, selector));
    },
    parents: function(selector) {
      return this.pushStack(parents(this, selector));
    },
    parentsUntil: function(until, filter) {
      return this.pushStack(parentsUntil(this, until, filter));
    },
    closest: function(selector, context) {
      return this.pushStack(closest(this, selector, context));
    },
    children: function(selector) {
      return this.pushStack(children(this, selector));
    },
    siblings: function(selector) {
      return this.pushStack(siblings(this, selector));
    },
    next: function(selector) {
      return this.pushStack(next(this, selector));
    },
    nextAll: function(selector) {
      return this.pushStack(nextAll(this, selector));
    },
    nextUntil: function(until, filter) {
      return this.pushStack(nextUntil(this, until, filter));
    },
    prev: function(selector) {
      return this.pushStack(prev(this, selector));
    },
    prevAll: function(selector) {
      return this.pushStack(prevAll(this, selector));
    },
    prevUntil: function(until, filter) {
      return this.pushStack(prevUntil(this, until, filter));
    },
    offsetParent: function() {
      return this.pushStack(offsetParent(this));
    },
    
    // Manipulation
    html: function(value) {
      return html(this, value);
    },
    text: function(value) {
      return text(this, value);
    },
    append: function(...content) {
      return append(this, ...content);
    },
    prepend: function(...content) {
      return prepend(this, ...content);
    },
    before: function(...content) {
      return before(this, ...content);
    },
    after: function(...content) {
      return after(this, ...content);
    },
    appendTo: function(target) {
      return appendTo(this, target, jQNext);
    },
    prependTo: function(target) {
      return prependTo(this, target, jQNext);
    },
    insertBefore: function(target) {
      return insertBefore(this, target, jQNext);
    },
    insertAfter: function(target) {
      return insertAfter(this, target, jQNext);
    },
    wrap: function(wrapper) {
      return wrap(this, wrapper, jQNext);
    },
    wrapAll: function(wrapper) {
      return wrapAll(this, wrapper, jQNext);
    },
    wrapInner: function(wrapper) {
      return wrapInner(this, wrapper, jQNext);
    },
    unwrap: function(selector) {
      return unwrap(this, selector);
    },
    empty: function() {
      return empty(this);
    },
    remove: function(selector) {
      return remove(this, selector);
    },
    detach: function(selector) {
      return detach(this, selector);
    },
    replaceWith: function(content) {
      return replaceWith(this, content);
    },
    replaceAll: function(target) {
      return replaceAll(this, target, jQNext);
    },
    clone: function(withDataAndEvents, deepWithDataAndEvents) {
      return clone(this, withDataAndEvents, deepWithDataAndEvents, jQNext);
    },
    
    // Attributes
    attr: function(name, value) {
      return attr(this, name, value);
    },
    removeAttr: function(name) {
      return removeAttr(this, name);
    },
    prop: function(name, value) {
      return prop(this, name, value);
    },
    removeProp: function(name) {
      return removeProp(this, name);
    },
    val: function(value) {
      return val(this, value);
    },
    addClass: function(className) {
      return addClass(this, className);
    },
    removeClass: function(className) {
      return removeClass(this, className);
    },
    toggleClass: function(className, state) {
      return toggleClass(this, className, state);
    },
    hasClass: function(className) {
      return hasClass(this, className);
    },
    
    // CSS
    css: function(name, value) {
      return css(this, name, value);
    },
    width: function(value) {
      return width(this, value);
    },
    height: function(value) {
      return height(this, value);
    },
    innerWidth: function(value) {
      return innerWidth(this, value);
    },
    innerHeight: function(value) {
      return innerHeight(this, value);
    },
    outerWidth: function(includeMargin) {
      return outerWidth(this, includeMargin);
    },
    outerHeight: function(includeMargin) {
      return outerHeight(this, includeMargin);
    },
    offset: function(coordinates) {
      return offset(this, coordinates);
    },
    position: function() {
      return position(this);
    },
    scrollTop: function(value) {
      return scrollTop(this, value);
    },
    scrollLeft: function(value) {
      return scrollLeft(this, value);
    },
    
    // Events
    on: function(types, selector, data, fn) {
      return on(this, types, selector, data, fn);
    },
    off: function(types, selector, fn) {
      return off(this, types, selector, fn);
    },
    one: function(types, selector, data, fn) {
      return one(this, types, selector, data, fn);
    },
    trigger: function(event, data) {
      return trigger(this, event, data);
    },
    triggerHandler: function(event, data) {
      return triggerHandler(this, event, data);
    },
    
    // Event shortcuts
    blur: blur,
    focus: focus,
    focusin: focusin,
    focusout: focusout,
    load: load$1,
    resize: resize,
    scroll: scroll,
    unload: unload,
    click: click,
    dblclick: dblclick,
    mousedown: mousedown,
    mouseup: mouseup,
    mousemove: mousemove,
    mouseover: mouseover,
    mouseout: mouseout,
    mouseenter: mouseenter,
    mouseleave: mouseleave,
    change: change,
    select: select,
    submit: submit,
    keydown: keydown,
    keypress: keypress,
    keyup: keyup,
    error: error,
    contextmenu: contextmenu,
    hover: hover,
    bind: bind,
    unbind: unbind,
    delegate: delegate,
    undelegate: undelegate,
    
    // Effects - show/hide
    show: function(duration, easing, callback) {
      return show(this, duration, easing, callback);
    },
    hide: function(duration, easing, callback) {
      return hide(this, duration, easing, callback);
    },
    toggle: function(state, easing, callback) {
      return toggle(this, state, easing, callback);
    },
    
    // Effects - slide
    slideDown: function(duration, easing, callback) {
      return slideDown(this, duration, easing, callback);
    },
    slideUp: function(duration, easing, callback) {
      return slideUp(this, duration, easing, callback);
    },
    slideToggle: function(duration, easing, callback) {
      return slideToggle(this, duration, easing, callback);
    },
    
    // Effects - fade
    fadeIn: function(duration, easing, callback) {
      return fadeIn(this, duration, easing, callback);
    },
    fadeOut: function(duration, easing, callback) {
      return fadeOut(this, duration, easing, callback);
    },
    fadeTo: function(duration, opacity, callback) {
      return fadeTo(this, duration, opacity, callback);
    },
    fadeToggle: function(duration, easing, callback) {
      return fadeToggle(this, duration, easing, callback);
    },
    
    // Effects - animation
    animate: function(properties, duration, easing, callback) {
      return animate(this, properties, duration, easing, callback);
    },
    stop: function(clearQueue, jumpToEnd) {
      return stop(this, clearQueue, jumpToEnd);
    },
    finish: function(queue) {
      return finish(this);
    },
    delay: function(time, type) {
      return delay(this, time);
    },
    queue: function(type, data) {
      return queue(this, type, data);
    },
    dequeue: function(type) {
      return dequeue(this);
    },
    clearQueue: function(type) {
      return clearQueue(this);
    },
    promise: function(type, target) {
      return promise(this, type, target);
    },
    
    // AJAX
    load: function(url, data, complete) {
      return load(this, url, data, complete);
    },
    serialize: function() {
      return serialize(this);
    },
    serializeArray: function() {
      return serializeArray(this);
    },
    
    // AJAX events
    ajaxComplete: function(handler) {
      return this.on('ajaxComplete', handler);
    },
    ajaxError: function(handler) {
      return this.on('ajaxError', handler);
    },
    ajaxSend: function(handler) {
      return this.on('ajaxSend', handler);
    },
    ajaxStart: function(handler) {
      return this.on('ajaxStart', handler);
    },
    ajaxStop: function(handler) {
      return this.on('ajaxStop', handler);
    },
    ajaxSuccess: function(handler) {
      return this.on('ajaxSuccess', handler);
    },
    
    // Ready shortcut
    ready: function(fn) {
      jQNext.ready.then(fn);
      return this;
    }
  });

  // Extend function for prototype
  jQNext.fn.extend = function(obj) {
    return extend(jQNext.fn, obj);
  };

  // Global export
  if (typeof window !== 'undefined') {
    window.jQuery = jQNext;
    window.$ = jQNext;
    
    // Preside compatibility
    window.presideJQuery = jQNext;
    window.jQNext = jQNext;
  }

  return jQNext;

}));

// Global aliases for jQuery compatibility
if (typeof window !== 'undefined') {
  window.$ = window.jQuery;
  window.jQNext = window.jQuery;
}
//# sourceMappingURL=jqnext.js.map
