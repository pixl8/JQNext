/**
 * jQNext - Form Serialization
 * Serialize forms and form elements
 */

import { param } from '../utilities/strings.js';

/**
 * Elements that can be serialized
 */
const rsubmittable = /^(?:input|select|textarea|keygen)/i;
const rsubmitterTypes = /^(?:submit|button|image|reset|file)$/i;
const rcheckableType = /^(?:checkbox|radio)$/i;

/**
 * Get serializable form elements
 * @param {Element} form
 * @returns {Element[]}
 */
function getSerializableElements(form) {
  const elements = [];
  
  // Handle form or collection of elements
  if (form.elements) {
    // It's a form
    const formElements = form.elements;
    for (let i = 0; i < formElements.length; i++) {
      elements.push(formElements[i]);
    }
  } else if (form.length !== undefined) {
    // It's a collection
    for (let i = 0; i < form.length; i++) {
      if (form[i].elements) {
        // Form element
        const formElements = form[i].elements;
        for (let j = 0; j < formElements.length; j++) {
          elements.push(formElements[j]);
        }
      } else {
        elements.push(form[i]);
      }
    }
  } else {
    elements.push(form);
  }
  
  return elements.filter(elem => {
    const type = elem.type;
    const name = elem.name;
    
    // Must have a name
    if (!name) return false;
    
    // Must not be disabled
    if (elem.disabled) return false;
    
    // Must match submittable pattern
    if (!rsubmittable.test(elem.nodeName)) return false;
    
    // Must not be submit/button/image/reset/file type
    if (rsubmitterTypes.test(type)) return false;
    
    // Checkboxes and radios must be checked
    if (rcheckableType.test(type) && !elem.checked) return false;
    
    return true;
  });
}

/**
 * Get the value of a form element
 * @param {Element} elem
 * @returns {string|string[]}
 */
function getValue(elem) {
  const type = elem.type;
  
  // Select element
  if (elem.nodeName.toLowerCase() === 'select') {
    if (elem.multiple) {
      const values = [];
      const options = elem.options;
      for (let i = 0; i < options.length; i++) {
        if (options[i].selected) {
          values.push(options[i].value);
        }
      }
      return values;
    }
    return elem.value;
  }
  
  // Checkbox/radio
  if (rcheckableType.test(type)) {
    return elem.value;
  }
  
  // Normalize line endings
  return elem.value.replace(/\r?\n/g, '\r\n');
}

/**
 * Serialize form elements to array of {name, value} objects
 * @param {jQCollection} collection
 * @returns {Array}
 */
export function serializeArray(collection) {
  const result = [];
  
  // Get all elements to serialize
  const elements = [];
  for (let i = 0; i < collection.length; i++) {
    elements.push(...getSerializableElements(collection[i]));
  }
  
  // Build result array
  elements.forEach(elem => {
    const name = elem.name;
    const value = getValue(elem);
    
    if (Array.isArray(value)) {
      // Multiple select values
      value.forEach(v => {
        result.push({ name, value: v });
      });
    } else {
      result.push({ name, value });
    }
  });
  
  return result;
}

/**
 * Serialize form elements to URL-encoded string
 * @param {jQCollection} collection
 * @returns {string}
 */
export function serialize(collection) {
  return param(serializeArray(collection));
}

export default {
  serialize,
  serializeArray
};