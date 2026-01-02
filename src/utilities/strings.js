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
export function camelCase(str) {
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
export function trim(str) {
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
export function parseHTML(data, context, keepScripts) {
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
export function parseJSON(data) {
  return JSON.parse(data);
}

/**
 * Parse XML string into an XML document
 * @param {string} data - XML string to parse
 * @returns {Document|null} - XML document or null
 */
export function parseXML(data) {
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
export function param(obj, traditional = false) {
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
export function error(msg) {
  throw new Error(msg);
}

export default {
  camelCase,
  trim,
  parseHTML,
  parseJSON,
  parseXML,
  param,
  error
};