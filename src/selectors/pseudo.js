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
export const pseudoSelectors = {
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
export function parsePseudos(selector) {
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
export function filterByPseudos(elements, pseudos) {
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
export function querySelectorAllWithPseudo(selector, context = document) {
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
    // If native fails (invalid selector), return empty silently (jQuery behavior)
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
export function matchesWithPseudo(elem, selector, index = 0, collection = null) {
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

export default {
  pseudoSelectors,
  parsePseudos,
  filterByPseudos,
  querySelectorAllWithPseudo,
  matchesWithPseudo
};