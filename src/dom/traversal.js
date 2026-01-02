/**
 * jQNext - DOM Traversal
 * Parent, children, sibling traversal methods
 */

import { isString, isElement } from '../utilities/type.js';
import { uniqueSort } from '../utilities/objects.js';
import { matchesWithPseudo } from '../selectors/pseudo.js';

/**
 * Get the parent of each element, optionally filtered by selector
 * @param {jQCollection} collection
 * @param {string} [selector]
 * @returns {Element[]}
 */
export function parent(collection, selector) {
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
export function parents(collection, selector) {
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
export function parentsUntil(collection, until, filter) {
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
export function closest(collection, selector, context) {
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
export function children(collection, selector) {
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
export function siblings(collection, selector) {
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
export function next(collection, selector) {
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
export function nextAll(collection, selector) {
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
export function nextUntil(collection, until, filter) {
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
export function prev(collection, selector) {
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
export function prevAll(collection, selector) {
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
export function prevUntil(collection, until, filter) {
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
export function offsetParent(collection) {
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

export default {
  parent,
  parents,
  parentsUntil,
  closest,
  children,
  siblings,
  next,
  nextAll,
  nextUntil,
  prev,
  prevAll,
  prevUntil,
  offsetParent
};