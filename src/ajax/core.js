/**
 * jQNext - AJAX Core
 * Modern AJAX using Fetch API with jQuery-compatible interface
 */

import { isFunction, isPlainObject, isString, isArray } from '../utilities/type.js';
import { extend } from '../utilities/objects.js';
import { Deferred } from '../utilities/deferred.js';
import { param } from '../utilities/strings.js';
import { trigger } from '../events/core.js';

// Default AJAX settings
export const ajaxSettings = {
  url: location.href,
  type: 'GET',
  contentType: 'application/x-www-form-urlencoded; charset=UTF-8',
  processData: true,
  async: true,
  accepts: {
    '*': '*/*',
    text: 'text/plain',
    html: 'text/html',
    xml: 'application/xml, text/xml',
    json: 'application/json, text/javascript',
    script: 'text/javascript, application/javascript'
  },
  dataType: null,
  timeout: 0,
  cache: true,
  crossDomain: false,
  headers: {},
  global: true
};

// Active request count
let active = 0;

/**
 * Setup default AJAX settings
 * @param {Object} settings
 */
export function ajaxSetup(settings) {
  extend(ajaxSettings, settings);
}

/**
 * AJAX prefilters
 */
const prefilters = [];

/**
 * Add AJAX prefilter
 * @param {string|Function} dataTypeOrHandler
 * @param {Function} [handler]
 */
export function ajaxPrefilter(dataTypeOrHandler, handler) {
  if (isFunction(dataTypeOrHandler)) {
    handler = dataTypeOrHandler;
    dataTypeOrHandler = '*';
  }
  prefilters.push({ dataType: dataTypeOrHandler, handler });
}

/**
 * AJAX transports
 */
const transports = {};

/**
 * Add AJAX transport
 * @param {string} dataType
 * @param {Function} handler
 */
export function ajaxTransport(dataType, handler) {
  transports[dataType] = handler;
}

/**
 * Main AJAX function
 * @param {string|Object} url - URL or settings object
 * @param {Object} [settings] - AJAX settings
 * @returns {Object} - jqXHR object (Deferred-compatible)
 */
export function ajax(url, settings) {
  // Handle overloaded signature
  if (typeof url === 'object') {
    settings = url;
    url = settings.url;
  }
  
  // Merge settings with defaults
  const s = extend({}, ajaxSettings, settings);
  s.url = url || s.url;
  s.type = (s.type || s.method || 'GET').toUpperCase();
  
  // Process data types
  const dataTypes = (s.dataType || '*').toLowerCase().split(/\s+/);
  
  // Create jqXHR (Deferred-compatible) - MUST be before prefilters
  const deferred = Deferred();
  const jqXHR = deferred.promise({
    readyState: 0,
    status: 0,
    statusText: '',
    responseText: '',
    responseJSON: null,
    responseXML: null,
    
    getResponseHeader(name) {
      return this._responseHeaders?.[name.toLowerCase()];
    },
    
    getAllResponseHeaders() {
      if (!this._responseHeaders) return '';
      return Object.entries(this._responseHeaders)
        .map(([k, v]) => `${k}: ${v}`)
        .join('\r\n');
    },
    
    setRequestHeader(name, value) {
      if (this.readyState === 0) {
        s.headers[name] = value;
      }
      return this;
    },
    
    overrideMimeType(type) {
      s.mimeType = type;
      return this;
    },
    
    abort(statusText) {
      if (controller) {
        controller.abort();
      }
      done(0, statusText || 'abort');
      return this;
    }
  });
  
  // Run prefilters (after jqXHR is created)
  prefilters.forEach(({ dataType, handler }) => {
    if (dataType === '*' || dataTypes.includes(dataType)) {
      handler(s, settings || {}, jqXHR);
    }
  });
  
  // Callbacks
  jqXHR.success = jqXHR.done;
  jqXHR.error = jqXHR.fail;
  jqXHR.complete = jqXHR.always;
  
  // Abort controller
  let controller;
  
  // Process URL for cache busting
  let requestUrl = s.url;
  
  if (!s.cache && s.type === 'GET') {
    const timestamp = '_=' + Date.now();
    requestUrl += (requestUrl.indexOf('?') > -1 ? '&' : '?') + timestamp;
  }
  
  // Process data
  let requestData = s.data;
  
  if (requestData && s.processData && !isString(requestData)) {
    requestData = param(requestData);
  }
  
  // Append data to URL for GET requests
  if (requestData && s.type === 'GET') {
    requestUrl += (requestUrl.indexOf('?') > -1 ? '&' : '?') + requestData;
    requestData = null;
  }
  
  // Build fetch options
  const fetchOptions = {
    method: s.type,
    headers: new Headers(),
    credentials: s.xhrFields?.withCredentials ? 'include' : 'same-origin'
  };
  
  // Set headers
  if (s.contentType !== false && s.type !== 'GET') {
    fetchOptions.headers.set('Content-Type', s.contentType);
  }
  
  // Accept header based on dataType
  const accept = s.accepts[dataTypes[0]] || s.accepts['*'];
  fetchOptions.headers.set('Accept', accept);
  
  // X-Requested-With header
  if (!s.crossDomain) {
    fetchOptions.headers.set('X-Requested-With', 'XMLHttpRequest');
  }
  
  // Custom headers
  for (const header in s.headers) {
    fetchOptions.headers.set(header, s.headers[header]);
  }
  
  // Set body for non-GET requests
  if (requestData && s.type !== 'GET') {
    if (s.contentType && s.contentType.indexOf('json') > -1) {
      fetchOptions.body = isString(requestData) ? requestData : JSON.stringify(requestData);
    } else if (requestData instanceof FormData) {
      fetchOptions.body = requestData;
      // Let browser set content-type for FormData
      fetchOptions.headers.delete('Content-Type');
    } else {
      fetchOptions.body = requestData;
    }
  }
  
  // Timeout handling
  if (s.timeout > 0) {
    controller = new AbortController();
    fetchOptions.signal = controller.signal;
    
    setTimeout(() => {
      if (jqXHR.readyState < 4) {
        controller.abort();
        done(0, 'timeout');
      }
    }, s.timeout);
  }
  
  // Before send callback
  if (s.beforeSend) {
    if (s.beforeSend.call(s.context || s, jqXHR, s) === false) {
      return jqXHR;
    }
  }
  
  // Global ajaxStart
  if (s.global && active++ === 0) {
    triggerGlobal('ajaxStart');
  }
  
  // Global ajaxSend
  if (s.global) {
    triggerGlobal('ajaxSend', [jqXHR, s]);
  }
  
  jqXHR.readyState = 1;
  
  // Execute fetch
  fetch(requestUrl, fetchOptions)
    .then(response => {
      jqXHR.readyState = 2;
      jqXHR.status = response.status;
      jqXHR.statusText = response.statusText;
      
      // Store headers
      jqXHR._responseHeaders = {};
      response.headers.forEach((value, name) => {
        jqXHR._responseHeaders[name.toLowerCase()] = value;
      });
      
      // Check for HTTP errors
      if (!response.ok) {
        throw response;
      }
      
      // Parse response based on dataType
      const contentType = response.headers.get('Content-Type') || '';
      let dataType = dataTypes[0];
      
      // Auto-detect data type if not specified
      if (!dataType || dataType === '*') {
        if (contentType.indexOf('json') > -1) {
          dataType = 'json';
        } else if (contentType.indexOf('xml') > -1) {
          dataType = 'xml';
        } else if (contentType.indexOf('html') > -1) {
          dataType = 'html';
        } else {
          dataType = 'text';
        }
      }
      
      // Parse response
      if (dataType === 'json') {
        return response.json().then(data => {
          jqXHR.responseJSON = data;
          return data;
        });
      } else if (dataType === 'xml') {
        return response.text().then(text => {
          jqXHR.responseText = text;
          const parser = new DOMParser();
          jqXHR.responseXML = parser.parseFromString(text, 'text/xml');
          return jqXHR.responseXML;
        });
      } else {
        return response.text().then(text => {
          jqXHR.responseText = text;
          return text;
        });
      }
    })
    .then(data => {
      // Use setTimeout to ensure done() callbacks run outside promise chain
      // This prevents errors in user callbacks from being caught by our catch block
      setTimeout(() => {
        done(jqXHR.status, jqXHR.statusText, data);
      }, 0);
    })
    .catch(error => {
      if (error.name === 'AbortError') {
        // Already handled by abort
        return;
      }
      
      jqXHR.status = error.status || 0;
      jqXHR.statusText = error.statusText || 'error';
      
      setTimeout(() => {
        done(jqXHR.status, jqXHR.statusText, null, error);
      }, 0);
    });
  
  /**
   * Complete the request
   */
  function done(status, statusText, data, error) {
    if (jqXHR.readyState === 4) return;
    
    jqXHR.readyState = 4;
    jqXHR.status = status;
    jqXHR.statusText = statusText;
    
    const isSuccess = status >= 200 && status < 300 || status === 304;
    
    if (isSuccess) {
      // Success callbacks
      if (s.success) {
        s.success.call(s.context || s, data, statusText, jqXHR);
      }
      deferred.resolveWith(s.context || s, [data, statusText, jqXHR]);
    } else {
      // Error callbacks
      if (s.error) {
        s.error.call(s.context || s, jqXHR, statusText, error);
      }
      deferred.rejectWith(s.context || s, [jqXHR, statusText, error]);
    }
    
    // Complete callbacks
    if (s.complete) {
      s.complete.call(s.context || s, jqXHR, statusText);
    }
    
    // Global events
    if (s.global) {
      triggerGlobal('ajaxComplete', [jqXHR, s]);
      
      if (isSuccess) {
        triggerGlobal('ajaxSuccess', [jqXHR, s, data]);
      } else {
        triggerGlobal('ajaxError', [jqXHR, s, error]);
      }
      
      if (--active === 0) {
        triggerGlobal('ajaxStop');
      }
    }
  }
  
  return jqXHR;
}

/**
 * Trigger global AJAX event
 */
function triggerGlobal(type, args = []) {
  // Use the global jQuery reference (presideJQuery in Preside)
  // jQuery event handlers expect parameters as separate arguments, not in event.detail
  const $ = typeof presideJQuery !== 'undefined' ? presideJQuery :
           typeof jQuery !== 'undefined' ? jQuery : null;
  
  if ($) {
    $(document).trigger(type, args);
  }
}

/**
 * Shorthand GET request
 * @param {string} url
 * @param {Object|Function} [data]
 * @param {Function} [success]
 * @param {string} [dataType]
 * @returns {Object} jqXHR
 */
export function get(url, data, success, dataType) {
  // Shift arguments if data is a function
  if (isFunction(data)) {
    dataType = dataType || success;
    success = data;
    data = undefined;
  }
  
  return ajax({
    url,
    data,
    success,
    dataType,
    type: 'GET'
  });
}

/**
 * Shorthand POST request
 * @param {string} url
 * @param {Object|Function} [data]
 * @param {Function} [success]
 * @param {string} [dataType]
 * @returns {Object} jqXHR
 */
export function post(url, data, success, dataType) {
  if (isFunction(data)) {
    dataType = dataType || success;
    success = data;
    data = undefined;
  }
  
  return ajax({
    url,
    data,
    success,
    dataType,
    type: 'POST'
  });
}

/**
 * Get JSON
 * @param {string} url
 * @param {Object|Function} [data]
 * @param {Function} [success]
 * @returns {Object} jqXHR
 */
export function getJSON(url, data, success) {
  if (isFunction(data)) {
    success = data;
    data = undefined;
  }
  
  return get(url, data, success, 'json');
}

/**
 * Load and execute script
 * @param {string} url
 * @param {Function} [success]
 * @returns {Object} jqXHR
 */
export function getScript(url, success) {
  return ajax({
    url,
    type: 'GET',
    dataType: 'script',
    cache: true,
    success
  }).then(script => {
    // Execute the script
    const scriptElem = document.createElement('script');
    scriptElem.text = script;
    document.head.appendChild(scriptElem).parentNode.removeChild(scriptElem);
    return script;
  });
}

/**
 * Load HTML into element
 * @param {jQCollection} collection
 * @param {string} url
 * @param {Object|Function} [data]
 * @param {Function} [complete]
 * @returns {jQCollection}
 */
export function load(collection, url, data, complete) {
  if (!collection.length) {
    return collection;
  }
  
  // Ensure url is a string
  if (typeof url !== 'string') {
    return collection;
  }
  
  // Handle argument shifting
  if (isFunction(data)) {
    complete = data;
    data = undefined;
  }
  
  // Check for selector in URL
  const selector = url.indexOf(' ') > -1
    ? url.slice(url.indexOf(' ') + 1)
    : null;
  const requestUrl = selector ? url.slice(0, url.indexOf(' ')) : url;
  
  ajax({
    url: requestUrl,
    type: data ? 'POST' : 'GET',
    dataType: 'html',
    data
  }).done((responseText) => {
    // If selector specified, extract matching content
    let content = responseText;
    
    if (selector) {
      const temp = document.createElement('div');
      temp.innerHTML = responseText;
      const found = temp.querySelectorAll(selector);
      content = '';
      found.forEach(el => content += el.innerHTML);
    }
    
    // Insert content
    collection.each(function() {
      this.innerHTML = content;
    });
    
    // Execute callback
    if (complete) {
      collection.each(function() {
        complete.call(this, responseText, 'success', null);
      });
    }
  }).fail((jqXHR, status, error) => {
    if (complete) {
      collection.each(function() {
        complete.call(this, jqXHR.responseText || '', status, jqXHR);
      });
    }
  });
  
  return collection;
}

export default {
  ajax,
  ajaxSetup,
  ajaxPrefilter,
  ajaxTransport,
  ajaxSettings,
  get,
  post,
  getJSON,
  getScript,
  load
};