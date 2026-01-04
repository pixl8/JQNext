/**
 * jQNext - Collection Class
 * The core jQuery-compatible collection object
 */

import { querySelectorAllWithPseudo, matchesWithPseudo } from '../selectors/pseudo.js';
import { setData, getDataValue, removeData, cleanData, expando } from './data.js';
import { isFunction, isArrayLike, isWindow, isString, isPlainObject, isElement } from '../utilities/type.js';
import { extend, merge, makeArray, uniqueSort } from '../utilities/objects.js';
import { parseHTML } from '../utilities/strings.js';

// Reference to the jQNext function (will be set by jqnext.js)
let jQNext = null;

/**
 * Set the jQNext reference
 * @param {Function} fn - The jQNext function
 */
export function setJQNext(fn) {
  jQNext = fn;
}

/**
 * Push context onto stack and return new collection
 * @param {jQCollection} collection - Collection to add to stack
 * @param {jQCollection} prev - Previous collection
 * @returns {jQCollection}
 */
function pushStack(collection, prev) {
  // Build a new jQCollection
  const ret = jQNext(collection);
  
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
export class jQCollection {
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
        setTimeout(() => selector(jQNext), 0);
      } else {
        document.addEventListener('DOMContentLoaded', () => selector(jQNext), { once: true });
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
      return Array.prototype.indexOf.call(jQNext(elem), this[0]);
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
    return this.prevObject || jQNext();
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
      uniqueSort(merge(this.get(), jQNext(selector, context))),
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
    const targets = jQNext(selector, this);
    
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

export default jQCollection;