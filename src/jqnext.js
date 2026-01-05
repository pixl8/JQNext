/**
 * jQNext - Modern jQuery 2.x Compatible Library
 * 
 * A drop-in replacement for jQuery 2.2.5 using modern JavaScript internals.
 * Compatible with jQuery UI 1.11.x
 * 
 * @version 1.0.0
 * @author Ready Intelligence
 * @license MIT
 */

// Core
import { jQCollection, setJQNext } from './core/collection.js';
import { expando, setData, getDataValue, removeData, hasData, cleanData } from './core/data.js';

// Utilities
import {
  type, isArray, isFunction, isWindow, isDocument, isElement,
  isNumeric, isPlainObject, isEmptyObject, isArrayLike, isString
} from './utilities/type.js';
import {
  extend, each, map, grep, inArray, merge, makeArray,
  proxy, noop, now, uniqueSort, contains, globalEval
} from './utilities/objects.js';
import {
  camelCase, trim, parseHTML, parseJSON, parseXML, param, error
} from './utilities/strings.js';
import { Deferred, Callbacks, when } from './utilities/deferred.js';

// Selectors
import { 
  querySelectorAllWithPseudo, matchesWithPseudo, pseudoSelectors 
} from './selectors/pseudo.js';

// DOM
import * as traversal from './dom/traversal.js';
import * as manipulation from './dom/manipulation.js';
import * as attributes from './dom/attributes.js';
import * as cssModule from './dom/css.js';
import { cssHooks } from './dom/css.js';

// Events
import { on, off, one, trigger, triggerHandler, special, parseEventTypes, getHandlersStorage } from './events/core.js';
import * as eventShortcuts from './events/shortcuts.js';

// Effects
import {
  animate, stop, finish, delay, queue, dequeue, clearQueue, promise, fx, speeds
} from './effects/core.js';
import {
  show, hide, toggle, slideDown, slideUp, slideToggle,
  fadeIn, fadeOut, fadeTo, fadeToggle
} from './effects/showhide.js';

// AJAX
import {
  ajax, ajaxSetup, ajaxPrefilter, ajaxTransport, ajaxSettings,
  get, post, getJSON, getScript, load
} from './ajax/core.js';
import { serialize, serializeArray } from './ajax/serialize.js';

// Compatibility
import { ui, widget, Widget, registerPlugin, plugin } from './compat/jquery-ui.js';

/**
 * The main jQNext function
 * @param {string|Element|Function|NodeList|Array} selector
 * @param {Element|Document} [context]
 * @returns {jQCollection}
 */
function jQNext(selector, context) {
  const collection = new jQCollection();
  collection.init(selector, context);
  return collection;
}

// Set reference in collection module
setJQNext(jQNext);

// Version
jQNext.fn = jQNext.prototype = jQCollection.prototype;
jQNext.fn.jquery = '2.2.5-jqnext';
jQNext.fn.constructor = jQNext;

// ==================================================
// STATIC METHODS
// ==================================================

// Utilities
// Wrap extend to handle the $.extend(obj) single-argument case
// When called with a single non-boolean object, it should extend jQNext itself
jQNext.extend = function(deep, target, ...sources) {
  // Single argument case: $.extend({foo: 'bar'}) should extend $ itself
  if (arguments.length === 1 && typeof deep === 'object' && deep !== null) {
    return extend(jQNext, deep);
  }
  // Normal case: delegate to extend
  return extend(deep, target, ...sources);
};
jQNext.each = each;
jQNext.map = map;
jQNext.grep = grep;
jQNext.inArray = inArray;
jQNext.merge = merge;
jQNext.makeArray = makeArray;
jQNext.proxy = proxy;
jQNext.noop = noop;
jQNext.now = now;
jQNext.uniqueSort = uniqueSort;
jQNext.unique = uniqueSort; // Alias
jQNext.contains = contains;
jQNext.globalEval = globalEval;

// Type checking
jQNext.type = type;
jQNext.isArray = isArray;
jQNext.isFunction = isFunction;
jQNext.isWindow = isWindow;
jQNext.isNumeric = isNumeric;
jQNext.isPlainObject = isPlainObject;
jQNext.isEmptyObject = isEmptyObject;

// Check if a document is an XML document
jQNext.isXMLDoc = function(elem) {
  // documentElement is verified for cases where it doesn't yet exist
  const namespace = elem && (elem.ownerDocument || elem).documentElement;
  return namespace ? namespace.nodeName !== 'HTML' : false;
};

// Check if an element has a specific node name (case-insensitive)
jQNext.nodeName = function(elem, name) {
  return elem && elem.nodeName && elem.nodeName.toLowerCase() === name.toLowerCase();
};

// String utilities
jQNext.camelCase = camelCase;
jQNext.trim = trim;
jQNext.parseHTML = parseHTML;
jQNext.parseJSON = parseJSON;
jQNext.parseXML = parseXML;
jQNext.param = param;
jQNext.error = error;

// Deferred
jQNext.Deferred = Deferred;
jQNext.Callbacks = Callbacks;
jQNext.when = when;

// Data
jQNext.expando = expando;
jQNext.data = function(elem, name, value) {
  // Getter: $.data(elem, key)
  if (value === undefined && typeof name !== 'object') {
    return getDataValue(elem, name);
  }
  // Setter: $.data(elem, key, value) - returns value
  // Or: $.data(elem, obj) - returns obj
  setData(elem, name, value);
  return typeof name === 'object' ? name : value;
};
jQNext.removeData = function(elem, name) {
  removeData(elem, name);
  return undefined;
};
jQNext.hasData = hasData;
jQNext._data = function(elem, name, value) {
  // Internal data (for jQuery internals/plugins)
  // Special case: get 'events' returns event handlers storage
  if (name === 'events' && value === undefined) {
    const handlers = getHandlersStorage(elem);
    return handlers ? handlers.events : undefined;
  }
  // Getter
  if (value === undefined && typeof name !== 'object') {
    return getDataValue(elem, '_' + name);
  }
  // Setter - returns value/obj
  setData(elem, '_' + name, value);
  return typeof name === 'object' ? name : value;
};
jQNext._removeData = function(elem, name) {
  removeData(elem, '_' + name);
  return undefined;
};
jQNext.cleanData = cleanData;

// AJAX
jQNext.ajax = ajax;
jQNext.ajaxSetup = ajaxSetup;
jQNext.ajaxPrefilter = ajaxPrefilter;
jQNext.ajaxTransport = ajaxTransport;
jQNext.ajaxSettings = ajaxSettings;
jQNext.get = get;
jQNext.post = post;
jQNext.getJSON = getJSON;
jQNext.getScript = getScript;

// Animation
jQNext.fx = fx;
jQNext.fx.speeds = speeds;
jQNext.fx.step = {}; // For jQuery UI color animation hooks
jQNext.easing = {
  linear: function(p) { return p; },
  swing: function(p) { return 0.5 - Math.cos(p * Math.PI) / 2; }
};
jQNext.Animation = {}; // Compatibility stub
jQNext.speed = function(speed, easing, fn) {
  const opt = speed && typeof speed === 'object' ? extend({}, speed) : {
    complete: fn || (!fn && easing) || (isFunction(speed) && speed),
    duration: speed,
    easing: fn && easing || easing && !isFunction(easing) && easing
  };
  opt.duration = typeof opt.duration === 'number' ? opt.duration :
    opt.duration in speeds ? speeds[opt.duration] : speeds._default;
  opt.old = opt.complete;
  opt.complete = function() {
    if (isFunction(opt.old)) {
      opt.old.call(this);
    }
  };
  return opt;
};

// Queue utilities (static)
jQNext.queue = function(elem, type, data) {
  return queue({ 0: elem, length: 1 }, type, data);
};
jQNext.dequeue = function(elem, type) {
  return dequeue({ 0: elem, length: 1 }, type);
};

// Event constructor - jQuery UI expects $.Event()
jQNext.Event = function(type, props) {
  // Allow instantiation without 'new'
  if (!(this instanceof jQNext.Event)) {
    return new jQNext.Event(type, props);
  }
  
  // Handle event object passed as type
  if (type && type.type) {
    this.originalEvent = type;
    this.type = type.type;
    this.isDefaultPrevented = type.defaultPrevented ||
      (type.defaultPrevented === undefined && type.returnValue === false)
        ? returnTrue : returnFalse;
    this.target = type.target;
    this.currentTarget = type.currentTarget;
    this.relatedTarget = type.relatedTarget;
    this.timeStamp = type.timeStamp || Date.now();
  } else {
    this.type = type;
    this.timeStamp = Date.now();
  }
  
  // Copy properties
  if (props) {
    extend(this, props);
  }
  
  // State tracking
  this._isDefaultPrevented = false;
  this._isPropagationStopped = false;
  this._isImmediatePropagationStopped = false;
};

jQNext.Event.prototype = {
  constructor: jQNext.Event,
  isDefaultPrevented: function() { return this._isDefaultPrevented; },
  isPropagationStopped: function() { return this._isPropagationStopped; },
  isImmediatePropagationStopped: function() { return this._isImmediatePropagationStopped; },
  preventDefault: function() {
    this._isDefaultPrevented = true;
    if (this.originalEvent) {
      this.originalEvent.preventDefault();
    }
  },
  stopPropagation: function() {
    this._isPropagationStopped = true;
    if (this.originalEvent) {
      this.originalEvent.stopPropagation();
    }
  },
  stopImmediatePropagation: function() {
    this._isImmediatePropagationStopped = true;
    this._isPropagationStopped = true;
    if (this.originalEvent) {
      this.originalEvent.stopImmediatePropagation();
    }
  }
};

function returnTrue() { return true; }
function returnFalse() { return false; }

// Event special
jQNext.event = {
  special,
  // Event properties that should be copied - excluded 'type' (handled separately per tests)
  props: ('altKey bubbles cancelable ctrlKey currentTarget detail eventPhase ' +
    'metaKey relatedTarget shiftKey target timeStamp view which').split(' '),
  fixHooks: {},
  fix: function(event) {
    if (event instanceof jQNext.Event) {
      return event;
    }
    return new jQNext.Event(event);
  },
  simulate: function(type, elem, event) {
    const e = extend(new jQNext.Event(type), event, {
      type,
      isSimulated: true
    });
    if (elem.dispatchEvent) {
      elem.dispatchEvent(new CustomEvent(type, { detail: e, bubbles: true, cancelable: true }));
    }
  }
};

// Expression/Sizzle compatibility
jQNext.expr = {
  ':': pseudoSelectors,
  pseudos: pseudoSelectors,
  match: {},
  filter: {},
  // Filter functions used by jquery.tabbable.js and other plugins
  filters: {
    visible: function(elem) {
      return !!(elem.offsetWidth || elem.offsetHeight || elem.getClientRects().length);
    },
    hidden: function(elem) {
      return !jQNext.expr.filters.visible(elem);
    }
  },
  // createPseudo wraps a factory function to be compatible with our pseudo-selector system
  // The factory takes the argument (e.g., "foo" from :hasData(foo)) and returns a filter function
  createPseudo: function(fn) {
    // Return a function that matches our pseudo signature (elem, index, collection, param)
    // but calls the factory pattern correctly
    var wrapped = function(elem, index, collection, param) {
      // Call the factory with the param to get the actual filter
      var filter = fn(param);
      // Call the filter with just the element (Sizzle/jQuery style)
      return filter(elem);
    };
    // Mark it as created via createPseudo so we know the signature
    wrapped._isCreatePseudo = true;
    return wrapped;
  }
};
jQNext.find = function(selector, context, results) {
  results = results || [];
  const found = querySelectorAllWithPseudo(selector, context);
  merge(results, found);
  return results;
};
// Sizzle/selector engine compatibility - compile function for pre-compiling selectors
jQNext.find.compile = function(selector) {
  // Return a function that performs the selection (simplified Sizzle compatibility)
  return function(context, results) {
    return jQNext.find(selector, context, results);
  };
};
// matchesSelector for element matching
jQNext.find.matchesSelector = function(elem, selector) {
  return matchesWithPseudo(elem, selector);
};
jQNext.find.matches = function(selector, elements) {
  return elements.filter(elem => matchesWithPseudo(elem, selector));
};

// Static CSS method (for plugins like jquery.tabbable.js)
jQNext.css = function(elem, name, extra, styles) {
  return cssModule.css({ 0: elem, length: 1 }, name);
};

// Static attr method (for plugins like jquery.tabbable.js)
jQNext.attr = function(elem, name, value) {
  // Getter
  if (value === undefined) {
    if (!elem || elem.nodeType === 3 || elem.nodeType === 8 || !elem.getAttribute) {
      return undefined;
    }
    const val = elem.getAttribute(name);
    return val === null ? undefined : val;
  }
  // Setter
  elem.setAttribute(name, value);
  return value;
};

// CSS Hooks (for jQuery UI color animation etc.)
jQNext.cssHooks = cssHooks;
jQNext.cssNumber = {
  animationIterationCount: true,
  columnCount: true,
  fillOpacity: true,
  flexGrow: true,
  flexShrink: true,
  fontWeight: true,
  lineHeight: true,
  opacity: true,
  order: true,
  orphans: true,
  widows: true,
  zIndex: true,
  zoom: true
};

// Support (feature detection)
jQNext.support = {
  ajax: true,
  cors: true,
  boxSizing: true,
  changeBubbles: true,
  focusin: true,
  optSelected: true,
  transition: true,
  // createHTMLDocument test - check if we can create an HTML document
  createHTMLDocument: (function() {
    try {
      return !!document.implementation.createHTMLDocument('');
    } catch (e) {
      return false;
    }
  })()
};

// jQuery UI
jQNext.ui = ui;
jQNext.widget = function(name, base, prototype) {
  const Constructor = widget(name, base, prototype);
  registerPlugin(jQNext, name, Constructor);
  return Constructor;
};
jQNext.Widget = Widget;

// noConflict
const _jQuery = typeof window !== 'undefined' ? window.jQuery : undefined;
const _$ = typeof window !== 'undefined' ? window.$ : undefined;

jQNext.noConflict = function(deep) {
  if (typeof window !== 'undefined') {
    if (window.$ === jQNext) {
      window.$ = _$;
    }
    if (deep && window.jQuery === jQNext) {
      window.jQuery = _jQuery;
    }
  }
  return jQNext;
};

// Ready state
jQNext.isReady = false;
jQNext.readyWait = 1;
jQNext.ready = Deferred();
jQNext.holdReady = function(hold) {
  if (hold) {
    jQNext.readyWait++;
  } else {
    // Trigger ready if all holds released
    if (--jQNext.readyWait === 0) {
      jQNext.isReady = true;
      jQNext.ready.resolveWith(document, [jQNext]);
    }
  }
};

if (document.readyState === 'complete' ||
    (document.readyState !== 'loading' && !document.documentElement.doScroll)) {
  setTimeout(() => {
    jQNext.isReady = true;
    jQNext.ready.resolveWith(document, [jQNext]);
  });
} else {
  document.addEventListener('DOMContentLoaded', function() {
    jQNext.isReady = true;
    jQNext.ready.resolveWith(document, [jQNext]);
  });
}

// ==================================================
// PROTOTYPE METHODS
// ==================================================

// Extend the prototype
extend(jQNext.fn, {
  // Core
  jquery: '2.2.5-jqnext',
  length: 0,
  
  // Convert to array
  toArray: function() {
    return Array.prototype.slice.call(this);
  },
  
  // Get element(s)
  get: function(index) {
    return index === undefined 
      ? this.toArray() 
      : (index < 0 ? this[this.length + index] : this[index]);
  },
  
  // Size (deprecated but needed for compat)
  size: function() {
    return this.length;
  },
  
  // Traversal
  parent: function(selector) {
    return this.pushStack(traversal.parent(this, selector));
  },
  parents: function(selector) {
    return this.pushStack(traversal.parents(this, selector));
  },
  parentsUntil: function(until, filter) {
    return this.pushStack(traversal.parentsUntil(this, until, filter));
  },
  closest: function(selector, context) {
    return this.pushStack(traversal.closest(this, selector, context));
  },
  children: function(selector) {
    return this.pushStack(traversal.children(this, selector));
  },
  siblings: function(selector) {
    return this.pushStack(traversal.siblings(this, selector));
  },
  next: function(selector) {
    return this.pushStack(traversal.next(this, selector));
  },
  nextAll: function(selector) {
    return this.pushStack(traversal.nextAll(this, selector));
  },
  nextUntil: function(until, filter) {
    return this.pushStack(traversal.nextUntil(this, until, filter));
  },
  prev: function(selector) {
    return this.pushStack(traversal.prev(this, selector));
  },
  prevAll: function(selector) {
    return this.pushStack(traversal.prevAll(this, selector));
  },
  prevUntil: function(until, filter) {
    return this.pushStack(traversal.prevUntil(this, until, filter));
  },
  offsetParent: function() {
    return this.pushStack(traversal.offsetParent(this));
  },
  
  // Manipulation
  html: function(value) {
    return manipulation.html(this, value);
  },
  text: function(value) {
    return manipulation.text(this, value);
  },
  append: function(...content) {
    return manipulation.append(this, ...content);
  },
  prepend: function(...content) {
    return manipulation.prepend(this, ...content);
  },
  before: function(...content) {
    return manipulation.before(this, ...content);
  },
  after: function(...content) {
    return manipulation.after(this, ...content);
  },
  appendTo: function(target) {
    return manipulation.appendTo(this, target, jQNext);
  },
  prependTo: function(target) {
    return manipulation.prependTo(this, target, jQNext);
  },
  insertBefore: function(target) {
    return manipulation.insertBefore(this, target, jQNext);
  },
  insertAfter: function(target) {
    return manipulation.insertAfter(this, target, jQNext);
  },
  wrap: function(wrapper) {
    return manipulation.wrap(this, wrapper, jQNext);
  },
  wrapAll: function(wrapper) {
    return manipulation.wrapAll(this, wrapper, jQNext);
  },
  wrapInner: function(wrapper) {
    return manipulation.wrapInner(this, wrapper, jQNext);
  },
  unwrap: function(selector) {
    return manipulation.unwrap(this, selector);
  },
  empty: function() {
    return manipulation.empty(this);
  },
  remove: function(selector) {
    return manipulation.remove(this, selector);
  },
  detach: function(selector) {
    return manipulation.detach(this, selector);
  },
  replaceWith: function(content) {
    return manipulation.replaceWith(this, content, jQNext);
  },
  replaceAll: function(target) {
    return manipulation.replaceAll(this, target, jQNext);
  },
  clone: function(withDataAndEvents, deepWithDataAndEvents) {
    return manipulation.clone(this, withDataAndEvents, deepWithDataAndEvents, jQNext);
  },
  
  // Attributes
  attr: function(name, value) {
    return attributes.attr(this, name, value);
  },
  removeAttr: function(name) {
    return attributes.removeAttr(this, name);
  },
  prop: function(name, value) {
    return attributes.prop(this, name, value);
  },
  removeProp: function(name) {
    return attributes.removeProp(this, name);
  },
  val: function(value) {
    return attributes.val(this, value);
  },
  addClass: function(className) {
    return attributes.addClass(this, className);
  },
  removeClass: function(className) {
    return attributes.removeClass(this, className);
  },
  toggleClass: function(className, state) {
    return attributes.toggleClass(this, className, state);
  },
  hasClass: function(className) {
    return attributes.hasClass(this, className);
  },
  
  // CSS
  css: function(name, value) {
    return cssModule.css(this, name, value);
  },
  width: function(value) {
    return cssModule.width(this, value);
  },
  height: function(value) {
    return cssModule.height(this, value);
  },
  innerWidth: function(value) {
    return cssModule.innerWidth(this, value);
  },
  innerHeight: function(value) {
    return cssModule.innerHeight(this, value);
  },
  outerWidth: function(includeMargin) {
    return cssModule.outerWidth(this, includeMargin);
  },
  outerHeight: function(includeMargin) {
    return cssModule.outerHeight(this, includeMargin);
  },
  offset: function(coordinates) {
    return cssModule.offset(this, coordinates);
  },
  position: function() {
    return cssModule.position(this);
  },
  scrollTop: function(value) {
    return cssModule.scrollTop(this, value);
  },
  scrollLeft: function(value) {
    return cssModule.scrollLeft(this, value);
  },
  
  // Events
  on: function(types, selector, data, fn) {
    return on(this, types, selector, data, fn);
  },
  off: function(types, selector, fn) {
    return off(this, types, selector, fn);
  },
  one: function(types, selector, data, fn) {
    return one(this, types, selector, data, fn);
  },
  trigger: function(event, data) {
    return trigger(this, event, data);
  },
  triggerHandler: function(event, data) {
    return triggerHandler(this, event, data);
  },
  
  // Event shortcuts
  blur: eventShortcuts.blur,
  focus: eventShortcuts.focus,
  focusin: eventShortcuts.focusin,
  focusout: eventShortcuts.focusout,
  load: eventShortcuts.load,
  resize: eventShortcuts.resize,
  scroll: eventShortcuts.scroll,
  unload: eventShortcuts.unload,
  click: eventShortcuts.click,
  dblclick: eventShortcuts.dblclick,
  mousedown: eventShortcuts.mousedown,
  mouseup: eventShortcuts.mouseup,
  mousemove: eventShortcuts.mousemove,
  mouseover: eventShortcuts.mouseover,
  mouseout: eventShortcuts.mouseout,
  mouseenter: eventShortcuts.mouseenter,
  mouseleave: eventShortcuts.mouseleave,
  change: eventShortcuts.change,
  select: eventShortcuts.select,
  submit: eventShortcuts.submit,
  keydown: eventShortcuts.keydown,
  keypress: eventShortcuts.keypress,
  keyup: eventShortcuts.keyup,
  error: eventShortcuts.error,
  contextmenu: eventShortcuts.contextmenu,
  hover: eventShortcuts.hover,
  bind: eventShortcuts.bind,
  unbind: eventShortcuts.unbind,
  delegate: eventShortcuts.delegate,
  undelegate: eventShortcuts.undelegate,
  
  // Effects - show/hide
  show: function(duration, easing, callback) {
    return show(this, duration, easing, callback);
  },
  hide: function(duration, easing, callback) {
    return hide(this, duration, easing, callback);
  },
  toggle: function(state, easing, callback) {
    return toggle(this, state, easing, callback);
  },
  
  // Effects - slide
  slideDown: function(duration, easing, callback) {
    return slideDown(this, duration, easing, callback);
  },
  slideUp: function(duration, easing, callback) {
    return slideUp(this, duration, easing, callback);
  },
  slideToggle: function(duration, easing, callback) {
    return slideToggle(this, duration, easing, callback);
  },
  
  // Effects - fade
  fadeIn: function(duration, easing, callback) {
    return fadeIn(this, duration, easing, callback);
  },
  fadeOut: function(duration, easing, callback) {
    return fadeOut(this, duration, easing, callback);
  },
  fadeTo: function(duration, opacity, callback) {
    return fadeTo(this, duration, opacity, callback);
  },
  fadeToggle: function(duration, easing, callback) {
    return fadeToggle(this, duration, easing, callback);
  },
  
  // Effects - animation
  animate: function(properties, duration, easing, callback) {
    return animate(this, properties, duration, easing, callback);
  },
  stop: function(clearQueue, jumpToEnd) {
    return stop(this, clearQueue, jumpToEnd);
  },
  finish: function(queue) {
    return finish(this, queue);
  },
  delay: function(time, type) {
    return delay(this, time, type);
  },
  queue: function(type, data) {
    return queue(this, type, data);
  },
  dequeue: function(type) {
    return dequeue(this, type);
  },
  clearQueue: function(type) {
    return clearQueue(this, type);
  },
  promise: function(type, target) {
    return promise(this, type, target);
  },
  
  // AJAX
  load: function(url, data, complete) {
    return load(this, url, data, complete);
  },
  serialize: function() {
    return serialize(this);
  },
  serializeArray: function() {
    return serializeArray(this);
  },
  
  // AJAX events
  ajaxComplete: function(handler) {
    return this.on('ajaxComplete', handler);
  },
  ajaxError: function(handler) {
    return this.on('ajaxError', handler);
  },
  ajaxSend: function(handler) {
    return this.on('ajaxSend', handler);
  },
  ajaxStart: function(handler) {
    return this.on('ajaxStart', handler);
  },
  ajaxStop: function(handler) {
    return this.on('ajaxStop', handler);
  },
  ajaxSuccess: function(handler) {
    return this.on('ajaxSuccess', handler);
  },
  
  // Ready shortcut
  ready: function(fn) {
    jQNext.ready.then(fn);
    return this;
  }
});

// Extend function for prototype
jQNext.fn.extend = function(obj) {
  return extend(jQNext.fn, obj);
};

// Global export
if (typeof window !== 'undefined') {
  window.jQuery = jQNext;
  window.$ = jQNext;
  
  // Preside compatibility
  window.presideJQuery = jQNext;
  window.jQNext = jQNext;
}

export default jQNext;