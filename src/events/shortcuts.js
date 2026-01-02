/**
 * jQNext - Event Shortcuts
 * Shorthand event methods (click, focus, etc.)
 */

import { on, off, trigger } from './core.js';

/**
 * Create event shortcut method
 * @param {string} type - Event type
 * @returns {Function}
 */
function createShortcut(type) {
  return function(data, fn) {
    // Trigger if no arguments
    if (arguments.length === 0) {
      return trigger(this, type);
    }
    
    // Bind handler
    if (typeof data === 'function') {
      fn = data;
      data = undefined;
    }
    
    return on(this, type, null, data, fn);
  };
}

// Standard DOM events
export const blur = createShortcut('blur');
export const focus = createShortcut('focus');
export const focusin = createShortcut('focusin');
export const focusout = createShortcut('focusout');
export const load = createShortcut('load');
export const resize = createShortcut('resize');
export const scroll = createShortcut('scroll');
export const unload = createShortcut('unload');
export const click = createShortcut('click');
export const dblclick = createShortcut('dblclick');
export const mousedown = createShortcut('mousedown');
export const mouseup = createShortcut('mouseup');
export const mousemove = createShortcut('mousemove');
export const mouseover = createShortcut('mouseover');
export const mouseout = createShortcut('mouseout');
export const mouseenter = createShortcut('mouseenter');
export const mouseleave = createShortcut('mouseleave');
export const change = createShortcut('change');
export const select = createShortcut('select');
export const submit = createShortcut('submit');
export const keydown = createShortcut('keydown');
export const keypress = createShortcut('keypress');
export const keyup = createShortcut('keyup');
export const error = createShortcut('error');
export const contextmenu = createShortcut('contextmenu');

/**
 * Bind handlers for mouseenter and mouseleave
 * @param {Function} handlerIn - Handler for mouseenter
 * @param {Function} [handlerOut] - Handler for mouseleave
 * @returns {jQCollection}
 */
export function hover(handlerIn, handlerOut) {
  return this.mouseenter(handlerIn).mouseleave(handlerOut || handlerIn);
}

// Deprecated methods (still supported for compatibility)

/**
 * Bind event (deprecated - use on)
 */
export function bind(types, data, fn) {
  return on(this, types, null, data, fn);
}

/**
 * Unbind event (deprecated - use off)
 */
export function unbind(types, fn) {
  return off(this, types, null, fn);
}

/**
 * Delegate event (deprecated - use on)
 */
export function delegate(selector, types, data, fn) {
  return on(this, types, selector, data, fn);
}

/**
 * Undelegate event (deprecated - use off)
 */
export function undelegate(selector, types, fn) {
  // No selector = remove all
  if (arguments.length === 0) {
    return off(this, '**');
  }
  
  return off(this, types, selector, fn);
}

// Shortcut list for easy iteration
export const shortcuts = [
  'blur', 'focus', 'focusin', 'focusout', 'load', 'resize', 'scroll',
  'unload', 'click', 'dblclick', 'mousedown', 'mouseup', 'mousemove',
  'mouseover', 'mouseout', 'mouseenter', 'mouseleave', 'change', 'select',
  'submit', 'keydown', 'keypress', 'keyup', 'error', 'contextmenu'
];

export default {
  blur,
  focus,
  focusin,
  focusout,
  load,
  resize,
  scroll,
  unload,
  click,
  dblclick,
  mousedown,
  mouseup,
  mousemove,
  mouseover,
  mouseout,
  mouseenter,
  mouseleave,
  change,
  select,
  submit,
  keydown,
  keypress,
  keyup,
  error,
  contextmenu,
  hover,
  bind,
  unbind,
  delegate,
  undelegate,
  shortcuts
};