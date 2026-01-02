/**
 * jQNext - Events Core
 * Event binding, delegation, and triggering with namespace support
 */

import { isFunction, isString, isPlainObject } from '../utilities/type.js';
import { setInternalData, getInternalData, removeInternalData } from '../core/data.js';
import { matchesWithPseudo } from '../selectors/pseudo.js';

// Event handler storage using WeakMap
const handlersStorage = new WeakMap();

// Special event types that need different handling
export const special = {
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
export function parseEventTypes(types) {
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
      let target = event.target;
      
      if (handleObj.selector) {
        // Find matching delegated target (use pseudo-aware matching)
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
export function on(collection, types, selector, data, fn, one = false) {
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
    fn = returnFalse;
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
export function off(collection, types, selector, fn) {
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
    fn = returnFalse;
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
export function one(collection, types, selector, data, fn) {
  return on(collection, types, selector, data, fn, true);
}

/**
 * Trigger an event
 * @param {jQCollection} collection
 * @param {string|Event} event
 * @param {*} [data]
 * @returns {jQCollection}
 */
export function trigger(collection, event, data) {
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
export function triggerHandler(collection, event, data) {
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
function returnFalse() {
  return false;
}

/**
 * Helper function that returns true
 */
function returnTrue() {
  return true;
}

export default {
  on,
  off,
  one,
  trigger,
  triggerHandler,
  special,
  parseEventTypes
};