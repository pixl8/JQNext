/**
 * jQNext - DOM Manipulation
 * Insert, remove, wrap, clone methods
 */

import { isString, isFunction, isElement } from '../utilities/type.js';
import { parseHTML } from '../utilities/strings.js';
import { cleanData, getDataValue, setData } from '../core/data.js';
import { matchesWithPseudo } from '../selectors/pseudo.js';
import { cloneHandlers } from '../events/core.js';

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
 * Insert nodes relative to target
 * @param {Element} target
 * @param {Node[]} nodes
 * @param {string} position - 'beforebegin', 'afterbegin', 'beforeend', 'afterend'
 */
function insertNodes(target, nodes, position) {
  const parent = target.parentNode;
  
  nodes.forEach(node => {
    switch (position) {
      case 'beforebegin':
        parent.insertBefore(node, target);
        break;
      case 'afterbegin':
        target.insertBefore(node, target.firstChild);
        break;
      case 'beforeend':
        target.appendChild(node);
        break;
      case 'afterend':
        parent.insertBefore(node, target.nextSibling);
        break;
    }
  });
}

/**
 * Get/set innerHTML
 * @param {jQCollection} collection
 * @param {string|Function} [value]
 * @returns {string|jQCollection}
 */
export function html(collection, value) {
  // Getter
  if (value === undefined) {
    const elem = collection[0];
    return elem ? elem.innerHTML : undefined;
  }
  
  // Setter
  return collection.each(function(i) {
    const oldHtml = this.innerHTML;
    
    // Clean up events/data on children (only for elements/documents/fragments)
    if (this.nodeType === 1 || this.nodeType === 9 || this.nodeType === 11) {
      cleanData(Array.from(this.getElementsByTagName('*')));
    }
    
    // Set new content
    const newValue = isFunction(value) ? value.call(this, i, oldHtml) : value;
    
    // Handle jQuery-like collections (object with length and elements)
    if (newValue && typeof newValue === 'object' && newValue.length !== undefined && !(newValue instanceof Node)) {
      // It's a collection - empty and append each element (MOVE, not clone - jQuery behavior)
      this.textContent = '';
      for (let j = 0; j < newValue.length; j++) {
        const node = newValue[j];
        if (node instanceof Node) {
          this.appendChild(node);  // Move the original node, don't clone
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
export function text(collection, value) {
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
export function append(collection, ...content) {
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
export function prepend(collection, ...content) {
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
export function before(collection, ...content) {
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
export function after(collection, ...content) {
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
export function appendTo(collection, target, jQNext) {
  jQNext(target).append(collection);
  return collection;
}

/**
 * Prepend elements to target
 * @param {jQCollection} collection
 * @param {string|Element|jQCollection} target
 * @returns {jQCollection}
 */
export function prependTo(collection, target, jQNext) {
  jQNext(target).prepend(collection);
  return collection;
}

/**
 * Insert elements before target
 * @param {jQCollection} collection
 * @param {string|Element|jQCollection} target
 * @returns {jQCollection}
 */
export function insertBefore(collection, target, jQNext) {
  jQNext(target).before(collection);
  return collection;
}

/**
 * Insert elements after target
 * @param {jQCollection} collection
 * @param {string|Element|jQCollection} target
 * @returns {jQCollection}
 */
export function insertAfter(collection, target, jQNext) {
  jQNext(target).after(collection);
  return collection;
}

/**
 * Wrap each element with content
 * @param {jQCollection} collection
 * @param {string|Element|Function} wrapper
 * @returns {jQCollection}
 */
export function wrap(collection, wrapper, jQNext) {
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
export function wrapAll(collection, wrapper, jQNext) {
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
export function wrapInner(collection, wrapper, jQNext) {
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
export function unwrap(collection, selector) {
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
export function empty(collection) {
  return collection.each(function() {
    // Clean up data on children (only for elements/documents/fragments)
    if (this.nodeType === 1 || this.nodeType === 9 || this.nodeType === 11) {
      cleanData(Array.from(this.getElementsByTagName('*')));
    }
    
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
export function remove(collection, selector) {
  for (let i = 0; i < collection.length; i++) {
    const elem = collection[i];
    
    // Skip if selector provided and doesn't match (use pseudo-aware matching)
    if (selector && !matchesWithPseudo(elem, selector)) {
      continue;
    }
    
    // Clean up data and events
    cleanData([elem]);
    if (elem.nodeType === 1 || elem.nodeType === 9 || elem.nodeType === 11) {
      cleanData(Array.from(elem.getElementsByTagName('*')));
    }
    
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
export function detach(collection, selector) {
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
export function replaceWith(collection, newContent, jQNext) {
  const isFunc = isFunction(newContent);
  
  return collection.each(function(i) {
    const content = isFunc ? newContent.call(this, i, this) : newContent;
    const nodes = toNodes(content, getDocument(this));
    
    if (this.parentNode) {
      // Clean up
      cleanData([this]);
      if (this.nodeType === 1 || this.nodeType === 9 || this.nodeType === 11) {
        cleanData(Array.from(this.getElementsByTagName('*')));
      }
      
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
export function replaceAll(collection, target, jQNext) {
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
export function clone(collection, withDataAndEvents = false, deepWithDataAndEvents = withDataAndEvents, jQNext) {
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

export default {
  html,
  text,
  append,
  prepend,
  before,
  after,
  appendTo,
  prependTo,
  insertBefore,
  insertAfter,
  wrap,
  wrapAll,
  wrapInner,
  unwrap,
  empty,
  remove,
  detach,
  replaceWith,
  replaceAll,
  clone
};