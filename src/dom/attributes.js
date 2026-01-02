/**
 * jQNext - DOM Attributes
 * Attribute, property, and value manipulation
 */

import { isFunction, isString, isArray } from '../utilities/type.js';
import { camelCase } from '../utilities/strings.js';

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
export function attr(collection, name, value) {
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
export function removeAttr(collection, name) {
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
export function prop(collection, name, value) {
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
export function removeProp(collection, name) {
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
export function val(collection, value) {
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
export function addClass(collection, className) {
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
export function removeClass(collection, className) {
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
export function toggleClass(collection, className, state) {
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
export function hasClass(collection, className) {
  for (let i = 0; i < collection.length; i++) {
    if (collection[i].nodeType === 1 && collection[i].classList.contains(className)) {
      return true;
    }
  }
  return false;
}

export default {
  attr,
  removeAttr,
  prop,
  removeProp,
  val,
  addClass,
  removeClass,
  toggleClass,
  hasClass
};