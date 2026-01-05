/**
 * jQNext - Show/Hide Effects
 * Show, hide, toggle, slide, and fade effects
 */

import { isFunction, isString, isPlainObject } from '../utilities/type.js';
import { animate, speeds, fx } from './core.js';
import { getInternalData, setInternalData } from '../core/data.js';

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
 * Helper: Show a single element
 */
function showElement(elem, duration, easing, callback) {
  const options = normalizeOptions(duration, easing, callback);
  
  if (!options.duration) {
    if (isHidden(elem)) {
      elem.style.display = getInternalData(elem, 'olddisplay') || getDefaultDisplay(elem);
    }
    if (options.complete) options.complete.call(elem);
    return;
  }
  
  if (!isHidden(elem)) {
    if (options.complete) options.complete.call(elem);
    return;
  }
  
  const display = getInternalData(elem, 'olddisplay') || getDefaultDisplay(elem);
  elem.style.overflow = 'hidden';
  elem.style.display = display;
  const targetHeight = elem.offsetHeight;
  const targetWidth = elem.offsetWidth;
  elem.style.height = '0px';
  elem.style.width = '0px';
  elem.style.opacity = '0';
  
  animate({ 0: elem, length: 1 }, {
    height: targetHeight,
    width: targetWidth,
    opacity: 1
  }, {
    duration: options.duration,
    easing: options.easing,
    complete: () => {
      elem.style.overflow = '';
      elem.style.height = '';
      elem.style.width = '';
      if (options.complete) options.complete.call(elem);
    }
  });
}

/**
 * Helper: Hide a single element
 */
function hideElement(elem, duration, easing, callback) {
  const options = normalizeOptions(duration, easing, callback);
  
  if (!options.duration) {
    if (!isHidden(elem)) {
      const display = getComputedStyle(elem).display;
      if (display !== 'none') {
        setInternalData(elem, 'olddisplay', display);
      }
      elem.style.display = 'none';
    }
    if (options.complete) options.complete.call(elem);
    return;
  }
  
  if (isHidden(elem)) {
    if (options.complete) options.complete.call(elem);
    return;
  }
  
  const display = getComputedStyle(elem).display;
  if (display !== 'none') {
    setInternalData(elem, 'olddisplay', display);
  }
  elem.style.overflow = 'hidden';
  
  animate({ 0: elem, length: 1 }, {
    height: 0,
    width: 0,
    opacity: 0
  }, {
    duration: options.duration,
    easing: options.easing,
    complete: () => {
      elem.style.display = 'none';
      elem.style.overflow = '';
      elem.style.height = '';
      elem.style.width = '';
      elem.style.opacity = '';
      if (options.complete) options.complete.call(elem);
    }
  });
}

/**
 * Helper: Slide down a single element
 */
function slideDownElement(elem, duration, easing, callback) {
  const options = normalizeOptions(duration, easing, callback);
  
  if (!isHidden(elem)) {
    if (options.complete) options.complete.call(elem);
    return;
  }
  
  const display = getInternalData(elem, 'olddisplay') || getDefaultDisplay(elem);
  elem.style.display = display;
  elem.style.overflow = 'hidden';
  const targetHeight = elem.offsetHeight;
  elem.style.height = '0px';
  
  animate({ 0: elem, length: 1 }, {
    height: targetHeight
  }, {
    duration: options.duration,
    easing: options.easing,
    complete: () => {
      elem.style.overflow = '';
      elem.style.height = '';
      if (options.complete) options.complete.call(elem);
    }
  });
}

/**
 * Helper: Slide up a single element
 */
function slideUpElement(elem, duration, easing, callback) {
  const options = normalizeOptions(duration, easing, callback);
  
  if (isHidden(elem)) {
    if (options.complete) options.complete.call(elem);
    return;
  }
  
  const display = getComputedStyle(elem).display;
  if (display !== 'none') {
    setInternalData(elem, 'olddisplay', display);
  }
  elem.style.overflow = 'hidden';
  
  animate({ 0: elem, length: 1 }, {
    height: 0
  }, {
    duration: options.duration,
    easing: options.easing,
    complete: () => {
      elem.style.display = 'none';
      elem.style.overflow = '';
      elem.style.height = '';
      if (options.complete) options.complete.call(elem);
    }
  });
}

/**
 * Helper: Fade in a single element
 */
function fadeInElement(elem, duration, easing, callback) {
  const options = normalizeOptions(duration, easing, callback);
  
  if (!isHidden(elem) && getComputedStyle(elem).opacity !== '0') {
    if (options.complete) options.complete.call(elem);
    return;
  }
  
  const display = getInternalData(elem, 'olddisplay') || getDefaultDisplay(elem);
  elem.style.display = display;
  elem.style.opacity = '0';
  
  animate({ 0: elem, length: 1 }, {
    opacity: 1
  }, {
    duration: options.duration,
    easing: options.easing,
    complete: () => {
      elem.style.opacity = '';
      if (options.complete) options.complete.call(elem);
    }
  });
}

/**
 * Helper: Fade out a single element
 */
function fadeOutElement(elem, duration, easing, callback) {
  const options = normalizeOptions(duration, easing, callback);
  
  if (isHidden(elem)) {
    if (options.complete) options.complete.call(elem);
    return;
  }
  
  const display = getComputedStyle(elem).display;
  if (display !== 'none') {
    setInternalData(elem, 'olddisplay', display);
  }
  
  animate({ 0: elem, length: 1 }, {
    opacity: 0
  }, {
    duration: options.duration,
    easing: options.easing,
    complete: () => {
      elem.style.display = 'none';
      elem.style.opacity = '';
      if (options.complete) options.complete.call(elem);
    }
  });
}

/**
 * Show elements with optional animation
 * @param {jQCollection} collection
 * @param {number|string|Object} [duration]
 * @param {string|Function} [easing]
 * @param {Function} [callback]
 * @returns {jQCollection}
 */
export function show(collection, duration, easing, callback) {
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
export function hide(collection, duration, easing, callback) {
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
export function toggle(collection, state, easing, callback) {
  // Handle boolean state
  if (typeof state === 'boolean') {
    return state ? show(collection) : hide(collection);
  }
  
  return collection.each(function() {
    const elem = this;
    if (isHidden(elem)) {
      showElement(elem, state, easing, callback);
    } else {
      hideElement(elem, state, easing, callback);
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
export function slideDown(collection, duration, easing, callback) {
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
export function slideUp(collection, duration, easing, callback) {
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
export function slideToggle(collection, duration, easing, callback) {
  return collection.each(function() {
    const elem = this;
    if (isHidden(elem)) {
      slideDownElement(elem, duration, easing, callback);
    } else {
      slideUpElement(elem, duration, easing, callback);
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
export function fadeIn(collection, duration, easing, callback) {
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
export function fadeOut(collection, duration, easing, callback) {
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
export function fadeTo(collection, duration, opacity, callback) {
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
export function fadeToggle(collection, duration, easing, callback) {
  return collection.each(function() {
    const elem = this;
    if (isHidden(elem) || getComputedStyle(elem).opacity === '0') {
      fadeInElement(elem, duration, easing, callback);
    } else {
      fadeOutElement(elem, duration, easing, callback);
    }
  });
}

export default {
  show,
  hide,
  toggle,
  slideDown,
  slideUp,
  slideToggle,
  fadeIn,
  fadeOut,
  fadeTo,
  fadeToggle
};