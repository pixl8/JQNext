/**
 * jQNext - jQuery UI Compatibility Layer
 * Widget factory and UI utilities for jQuery UI 1.11.x support
 */

import { isFunction, isPlainObject, isArray } from '../utilities/type.js';
import { extend, each } from '../utilities/objects.js';
import { setData, getDataValue, removeData } from '../core/data.js';
import { on, off, trigger } from '../events/core.js';

/**
 * UI namespace
 */
export const ui = {
  version: '1.11.4-compat',
  
  // Key codes used by jQuery UI
  keyCode: {
    BACKSPACE: 8,
    COMMA: 188,
    DELETE: 46,
    DOWN: 40,
    END: 35,
    ENTER: 13,
    ESCAPE: 27,
    HOME: 36,
    LEFT: 37,
    PAGE_DOWN: 34,
    PAGE_UP: 33,
    PERIOD: 190,
    RIGHT: 39,
    SPACE: 32,
    TAB: 9,
    UP: 38
  },
  
  // Safe active element access
  safeActiveElement: function(document) {
    try {
      return document.activeElement;
    } catch (error) {
      return document.body;
    }
  },
  
  // Safe blur
  safeBlur: function(element) {
    if (element && element.nodeName.toLowerCase() !== 'body') {
      try {
        element.blur();
      } catch (error) {
        // Ignore errors
      }
    }
  }
};

/**
 * Widget factory storage
 */
const widgetUuid = 0;
const widgetSlice = Array.prototype.slice;

/**
 * Base Widget class
 */
export class Widget {
  constructor() {
    this.widgetName = 'widget';
    this.widgetEventPrefix = '';
    this.defaultElement = '<div>';
    this.options = {
      disabled: false,
      create: null
    };
    this.element = null;
    this.uuid = widgetUuid;
    this.eventNamespace = '';
    this.bindings = null;
    this.hoverable = null;
    this.focusable = null;
  }
  
  _createWidget(options, element) {
    this.element = element instanceof Element ? element : element[0];
    this.uuid = widgetUuid++;
    this.eventNamespace = '.' + this.widgetName + this.uuid;
    this.bindings = [];
    this.hoverable = [];
    this.focusable = [];
    
    // Merge options
    this.options = extend(true, {},
      this.options,
      this._getCreateOptions(),
      options
    );
    
    // Store instance
    setData(this.element, 'ui-' + this.widgetName, this);
    
    this._create();
    this._trigger('create', null, this._getCreateEventData());
    this._init();
  }
  
  _getCreateOptions() {
    return {};
  }
  
  _getCreateEventData() {
    return {};
  }
  
  _create() {}
  
  _init() {}
  
  destroy() {
    this._destroy();
    
    // Remove data
    removeData(this.element, 'ui-' + this.widgetName);
    
    // Unbind events
    this.bindings.forEach(binding => {
      off({ 0: binding, length: 1 }, this.eventNamespace);
    });
    
    // Remove hover/focus classes
    this.hoverable.forEach(elem => {
      elem.classList.remove('ui-state-hover');
    });
    this.focusable.forEach(elem => {
      elem.classList.remove('ui-state-focus');
    });
  }
  
  _destroy() {}
  
  widget() {
    return this.element;
  }
  
  option(key, value) {
    if (arguments.length === 0) {
      return extend({}, this.options);
    }
    
    if (typeof key === 'string') {
      const parts = key.split('.');
      let curOption = this.options;
      
      // Getter
      if (value === undefined) {
        for (let i = 0; i < parts.length; i++) {
          curOption = curOption[parts[i]];
          if (curOption === undefined) {
            return undefined;
          }
        }
        return curOption;
      }
      
      // Setter
      const lastPart = parts.pop();
      for (let i = 0; i < parts.length; i++) {
        curOption = curOption[parts[i]] = curOption[parts[i]] || {};
      }
      curOption[lastPart] = value;
      this._setOption(lastPart, value);
    } else {
      // Object of options
      for (const k in key) {
        this._setOption(k, key[k]);
      }
    }
    
    return this;
  }
  
  _setOption(key, value) {
    this.options[key] = value;
    
    if (key === 'disabled') {
      this._toggleClass(this.widget(), null, 'ui-state-disabled', !!value);
      if (value) {
        this._removeClass(this.hoverable, null, 'ui-state-hover');
        this._removeClass(this.focusable, null, 'ui-state-focus');
      }
    }
    
    return this;
  }
  
  _setOptions(options) {
    for (const key in options) {
      this._setOption(key, options[key]);
    }
    return this;
  }
  
  enable() {
    return this._setOptions({ disabled: false });
  }
  
  disable() {
    return this._setOptions({ disabled: true });
  }
  
  _on(suppressDisabledCheck, element, handlers) {
    // Handle argument shifting
    if (typeof suppressDisabledCheck !== 'boolean') {
      handlers = element;
      element = suppressDisabledCheck;
      suppressDisabledCheck = false;
    }
    
    if (!handlers) {
      handlers = element;
      element = this.element;
    } else {
      element = element instanceof Element ? element : element[0] || element;
    }
    
    const instance = this;
    
    for (const event in handlers) {
      const handler = handlers[event];
      
      // Ensure event is a string
      const eventStr = String(event || '');
      
      // Add namespace
      const eventParts = eventStr.split(' ');
      const eventType = eventParts[0] + this.eventNamespace;
      const selector = eventParts.slice(1).join(' ') || undefined;
      
      const wrappedHandler = function(evt) {
        if (!suppressDisabledCheck && 
            (instance.options.disabled === true || 
             evt.currentTarget.classList.contains('ui-state-disabled'))) {
          return;
        }
        return (typeof handler === 'string' ? instance[handler] : handler)
          .apply(instance, arguments);
      };
      
      on({ 0: element, length: 1 }, eventType, selector, null, wrappedHandler);
      this.bindings.push(element);
    }
  }
  
  _off(element, eventName) {
    const elem = element instanceof Element ? element : element[0] || element;
    eventName = (eventName || '').split(' ')
      .map(e => e + this.eventNamespace)
      .join(' ');
    off({ 0: elem, length: 1 }, eventName);
  }
  
  _trigger(type, event, data) {
    const prop = this.options[type];
    data = data || {};
    
    // Create jQuery-like event
    const customEvent = new CustomEvent(this.widgetEventPrefix + type, {
      bubbles: true,
      cancelable: true,
      detail: data
    });
    
    // Add original event properties
    if (event) {
      customEvent.originalEvent = event;
    }
    
    this.element.dispatchEvent(customEvent);
    
    // Call callback
    if (isFunction(prop)) {
      return prop.call(this.element, customEvent, data) !== false && 
             !customEvent.defaultPrevented;
    }
    
    return !customEvent.defaultPrevented;
  }
  
  _delay(handler, delay) {
    const instance = this;
    return setTimeout(function() {
      return (typeof handler === 'string' ? instance[handler] : handler)
        .apply(instance, arguments);
    }, delay || 0);
  }
  
  _hoverable(element) {
    const elem = element instanceof Element ? element : element[0];
    this.hoverable.push(elem);
    
    this._on(elem, {
      mouseenter: function(event) {
        this._addClass(event.currentTarget, null, 'ui-state-hover');
      },
      mouseleave: function(event) {
        this._removeClass(event.currentTarget, null, 'ui-state-hover');
      }
    });
  }
  
  _focusable(element) {
    const elem = element instanceof Element ? element : element[0];
    this.focusable.push(elem);
    
    this._on(elem, {
      focusin: function(event) {
        this._addClass(event.currentTarget, null, 'ui-state-focus');
      },
      focusout: function(event) {
        this._removeClass(event.currentTarget, null, 'ui-state-focus');
      }
    });
  }
  
  _addClass(element, keys, extra) {
    const elem = element instanceof Element ? element : 
                 (element && element[0]) || this.element;
    const classes = [];
    
    if (keys) {
      keys.split(' ').forEach(key => {
        if (this.options.classes && this.options.classes[key]) {
          classes.push(this.options.classes[key]);
        }
        classes.push(key);
      });
    }
    
    if (extra) {
      classes.push(...extra.split(' '));
    }
    
    elem.classList.add(...classes.filter(Boolean));
  }
  
  _removeClass(element, keys, extra) {
    const elem = element instanceof Element ? element :
                 (element && element[0]) || this.element;
    const classes = [];
    
    if (keys) {
      keys.split(' ').forEach(key => {
        if (this.options.classes && this.options.classes[key]) {
          classes.push(this.options.classes[key]);
        }
        classes.push(key);
      });
    }
    
    if (extra) {
      classes.push(...extra.split(' '));
    }
    
    elem.classList.remove(...classes.filter(Boolean));
  }
  
  _toggleClass(element, keys, extra, add) {
    if (typeof add === 'boolean') {
      if (add) {
        this._addClass(element, keys, extra);
      } else {
        this._removeClass(element, keys, extra);
      }
    } else {
      const elem = element instanceof Element ? element :
                   (element && element[0]) || this.element;
      
      const classes = [];
      if (keys) classes.push(...keys.split(' '));
      if (extra) classes.push(...extra.split(' '));
      
      classes.filter(Boolean).forEach(cls => elem.classList.toggle(cls));
    }
  }
  
  _scrollParent(includeHidden) {
    const position = getComputedStyle(this.element).position;
    const excludeStaticParent = position === 'absolute';
    const overflowRegex = includeHidden ? /(auto|scroll|hidden)/ : /(auto|scroll)/;
    
    let scrollParent = this.element.parentElement;
    
    while (scrollParent) {
      const style = getComputedStyle(scrollParent);
      
      if (excludeStaticParent && style.position === 'static') {
        scrollParent = scrollParent.parentElement;
        continue;
      }
      
      if (overflowRegex.test(style.overflow + style.overflowY + style.overflowX)) {
        return scrollParent;
      }
      
      scrollParent = scrollParent.parentElement;
    }
    
    return document.scrollingElement || document.documentElement;
  }
}

/**
 * Widget factory function
 * Creates a new widget constructor and registers it as a jQuery plugin
 */
export function widget(name, base, prototype) {
  const fullName = name;
  const namespace = name.split('.')[0];
  const widgetName = name.split('.')[1] || name;
  
  // Handle base argument
  if (!prototype) {
    prototype = base;
    base = Widget;
  }
  
  // Create widget constructor
  const WidgetConstructor = function(options, element) {
    // Allow instantiation without 'new'
    if (!(this instanceof WidgetConstructor)) {
      return new WidgetConstructor(options, element);
    }
    
    // Call parent constructor
    if (base !== Widget) {
      base.call(this);
    } else {
      Widget.call(this);
    }
    
    // Merge prototype
    for (const key in prototype) {
      if (key !== '_create' && key !== '_init' && key !== 'options') {
        this[key] = prototype[key];
      }
    }
    
    // Set widget name
    this.widgetName = widgetName;
    this.widgetEventPrefix = prototype.widgetEventPrefix || widgetName;
    
    // Merge options
    if (prototype.options) {
      this.options = extend(true, {}, this.options, prototype.options);
    }
    
    // Override _create and _init if provided
    if (prototype._create) {
      const parentCreate = this._create;
      this._create = function() {
        if (parentCreate) parentCreate.call(this);
        prototype._create.call(this);
      };
    }
    
    if (prototype._init) {
      const parentInit = this._init;
      this._init = function() {
        if (parentInit) parentInit.call(this);
        prototype._init.call(this);
      };
    }
    
    if (prototype._destroy) {
      const parentDestroy = this._destroy;
      this._destroy = function() {
        prototype._destroy.call(this);
        if (parentDestroy) parentDestroy.call(this);
      };
    }
    
    // Initialize if element provided
    if (arguments.length) {
      this._createWidget(options, element);
    }
  };
  
  // Inherit from base
  WidgetConstructor.prototype = Object.create(base.prototype);
  WidgetConstructor.prototype.constructor = WidgetConstructor;
  
  // Store constructor
  if (!ui[namespace]) {
    ui[namespace] = {};
  }
  ui[widgetName] = WidgetConstructor;
  
  return WidgetConstructor;
}

/**
 * Register widget as jQuery plugin
 * @param {Function} jQNext - The jQNext function
 * @param {string} name - Widget name
 * @param {Function} WidgetConstructor - Widget constructor
 */
export function registerPlugin(jQNext, name, WidgetConstructor) {
  const widgetName = name.split('.').pop();
  
  jQNext.fn[widgetName] = function(options, ...args) {
    const isMethodCall = typeof options === 'string';
    
    if (isMethodCall) {
      const methodName = options;
      let returnValue;
      
      this.each(function() {
        const instance = getDataValue(this, 'ui-' + widgetName);
        
        if (!instance) {
          console.error(`Cannot call methods on ${widgetName} prior to initialization`);
          return;
        }
        
        if (!isFunction(instance[methodName]) || methodName.charAt(0) === '_') {
          console.error(`No such method '${methodName}' for ${widgetName}`);
          return;
        }
        
        const result = instance[methodName](...args);
        
        if (result !== instance && result !== undefined) {
          returnValue = result;
          return false; // Break the loop
        }
      });
      
      return returnValue !== undefined ? returnValue : this;
    }
    
    // Initialize widget
    return this.each(function() {
      const existing = getDataValue(this, 'ui-' + widgetName);
      
      if (existing) {
        // Update options
        existing._setOptions(options || {});
        if (existing._init) {
          existing._init();
        }
      } else {
        // Create new instance
        new WidgetConstructor(options, this);
      }
    });
  };
}

/**
 * Plugin for adding UI support
 */
export const plugin = {
  add: function(module, option, set) {
    // Plugin extension point
  },
  
  call: function(instance, name, args, allowDisconnected) {
    const set = instance.plugins[name];
    
    if (!set) return;
    
    if (!allowDisconnected && 
        (!instance.element || !instance.element.parentNode || 
         instance.element.parentNode.nodeType === 11)) {
      return;
    }
    
    set.forEach(([proto, fn]) => {
      if (instance.options[proto]) {
        fn.apply(instance.element, args);
      }
    });
  }
};

export default {
  ui,
  widget,
  Widget,
  registerPlugin,
  plugin
};