/**
 * jQNext - CSS Module
 * Style manipulation, dimensions, and positioning
 */

import { isFunction, isString, isNumeric, isWindow } from '../utilities/type.js';
import { camelCase } from '../utilities/strings.js';

// CSS properties that should not have 'px' appended
const cssNumber = new Set([
  'animationIterationCount', 'columnCount', 'fillOpacity', 'flexGrow',
  'flexShrink', 'fontWeight', 'gridArea', 'gridColumn', 'gridColumnEnd',
  'gridColumnStart', 'gridRow', 'gridRowEnd', 'gridRowStart', 'lineHeight',
  'opacity', 'order', 'orphans', 'widows', 'zIndex', 'zoom'
]);

// CSS properties that need vendor prefixes
const vendorPrefixes = ['webkit', 'moz', 'ms', 'o'];

// CSS Hooks storage (for jQuery UI compatibility)
export const cssHooks = {};

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
  if (isNumeric(value) && !cssNumber.has(prop)) {
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
export function css(collection, name, value) {
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
export function width(collection, value) {
  return dimension(collection, 'width', value);
}

/**
 * Get height of element
 * @param {jQCollection} collection
 * @param {*} [value]
 * @returns {number|jQCollection}
 */
export function height(collection, value) {
  return dimension(collection, 'height', value);
}

/**
 * Get inner width (includes padding)
 * @param {jQCollection} collection
 * @param {*} [value]
 * @returns {number|jQCollection}
 */
export function innerWidth(collection, value) {
  return dimension(collection, 'width', value, 'inner');
}

/**
 * Get inner height (includes padding)
 * @param {jQCollection} collection
 * @param {*} [value]
 * @returns {number|jQCollection}
 */
export function innerHeight(collection, value) {
  return dimension(collection, 'height', value, 'inner');
}

/**
 * Get outer width (includes padding and border, optionally margin)
 * @param {jQCollection} collection
 * @param {boolean|*} [includeMargin]
 * @returns {number|jQCollection}
 */
export function outerWidth(collection, includeMargin) {
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
export function outerHeight(collection, includeMargin) {
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
export function offset(collection, coordinates) {
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
export function position(collection) {
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
export function scrollTop(collection, value) {
  return scrollProp(collection, 'top', value);
}

/**
 * Get/set scroll left
 * @param {jQCollection} collection
 * @param {number} [value]
 * @returns {number|jQCollection}
 */
export function scrollLeft(collection, value) {
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
 * Show elements
 * @param {jQCollection} collection
 * @returns {jQCollection}
 */
export function show(collection) {
  return collection.each(function() {
    if (this.style.display === 'none') {
      this.style.display = '';
    }
    
    // Check if still hidden by stylesheet
    if (getStyles(this).display === 'none') {
      this.style.display = getDefaultDisplay(this);
    }
  });
}

/**
 * Hide elements
 * @param {jQCollection} collection
 * @returns {jQCollection}
 */
export function hide(collection) {
  return collection.each(function() {
    this.style.display = 'none';
  });
}

/**
 * Toggle visibility
 * @param {jQCollection} collection
 * @param {boolean} [state]
 * @returns {jQCollection}
 */
export function toggle(collection, state) {
  return collection.each(function() {
    const isHidden = getStyles(this).display === 'none';
    const shouldShow = state === undefined ? isHidden : state;
    
    if (shouldShow) {
      show({ 0: this, length: 1 });
    } else {
      hide({ 0: this, length: 1 });
    }
  });
}

/**
 * Get default display value for element
 */
const displayCache = {};
function getDefaultDisplay(elem) {
  const nodeName = elem.nodeName.toLowerCase();
  
  if (displayCache[nodeName]) {
    return displayCache[nodeName];
  }
  
  // Create temp element to check default display
  const temp = document.createElement(nodeName);
  document.body.appendChild(temp);
  const display = getStyles(temp).display;
  document.body.removeChild(temp);
  
  displayCache[nodeName] = display === 'none' ? 'block' : display;
  return displayCache[nodeName];
}

export default {
  css,
  width,
  height,
  innerWidth,
  innerHeight,
  outerWidth,
  outerHeight,
  offset,
  position,
  scrollTop,
  scrollLeft,
  show,
  hide,
  toggle
};