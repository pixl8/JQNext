/**
 * jQNext - Effects Core
 * Animation using Web Animation API
 */

import { isFunction, isNumeric, isPlainObject, isString } from '../utilities/type.js';
import { getInternalData, setInternalData, removeInternalData } from '../core/data.js';
import { Deferred } from '../utilities/deferred.js';
import { camelCase } from '../utilities/strings.js';

// Animation speeds
export const speeds = {
  slow: 600,
  fast: 200,
  _default: 400
};

// Global animation settings
export const fx = {
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
 * Get computed style value
 */
function getStyle(elem, prop) {
  return getComputedStyle(elem).getPropertyValue(prop);
}

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
export function animate(collection, properties, duration, easing, callback) {
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
export function stop(collection, clearQueue = false, jumpToEnd = false) {
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
export function finish(collection, queue) {
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
export function delay(collection, time, type) {
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
export function queue(collection, type, data) {
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
export function dequeue(collection, type) {
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
export function clearQueue(collection, type) {
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
export function promise(collection, type, target) {
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

export default {
  animate,
  stop,
  finish,
  delay,
  queue,
  dequeue,
  clearQueue,
  promise,
  fx,
  speeds
};