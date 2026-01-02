/**
 * jQNext - Deferred/Promise Utilities
 * jQuery-compatible Deferred implementation using native Promises
 */

import { isFunction } from './type.js';
import { extend } from './objects.js';

/**
 * Create a Callbacks list
 * @param {string} options - Space-separated list of options
 * @returns {Object} - Callbacks list object
 */
export function Callbacks(options = '') {
  const opts = {};
  options.split(/\s+/).forEach(flag => {
    if (flag) opts[flag] = true;
  });
  
  let list = [];
  let firing = false;
  let firingIndex = -1;
  let memory = null;
  let fired = false;
  let locked = false;
  
  const fire = function() {
    locked = locked || opts.once;
    fired = firing = true;
    
    for (; firingIndex < list.length; firingIndex++) {
      const fn = list[firingIndex];
      if (fn && typeof fn === 'function') {
        if (fn.apply(memory[0], memory[1]) === false && opts.stopOnFalse) {
          memory = false;
          break;
        }
      }
    }
    
    firing = false;
    
    if (locked) {
      if (memory) {
        list = [];
      } else {
        list = '';
      }
    }
  };
  
  const self = {
    add: function(...args) {
      if (list) {
        // Save starting position for memory-triggered fire
        const firingStart = list.length;
        
        const addToList = (arg) => {
          if (isFunction(arg)) {
            if (!opts.unique || !self.has(arg)) {
              list.push(arg);
            }
          } else if (Array.isArray(arg)) {
            arg.forEach(addToList);
          }
        };
        
        args.forEach(addToList);
        
        if (memory && !firing) {
          // Reset firingIndex to point just before the new callbacks
          // so the loop starts at the first newly added callback
          firingIndex = firingStart - 1;
          fire();
        }
      }
      return this;
    },
    
    remove: function(...args) {
      args.forEach(arg => {
        let index;
        while ((index = list.indexOf(arg)) > -1) {
          list.splice(index, 1);
          if (index <= firingIndex) {
            firingIndex--;
          }
        }
      });
      return this;
    },
    
    has: function(fn) {
      return fn ? list.indexOf(fn) > -1 : list.length > 0;
    },
    
    empty: function() {
      if (list) {
        list = [];
      }
      return this;
    },
    
    disable: function() {
      locked = list = memory = null;
      return this;
    },
    
    disabled: function() {
      return !list;
    },
    
    lock: function() {
      locked = true;
      if (!memory) {
        self.disable();
      }
      return this;
    },
    
    locked: function() {
      return !!locked;
    },
    
    fireWith: function(context, args) {
      if (list) {
        if (fired && !firing) {
          if (!opts.memory) {
            return this;
          }
        }
        
        memory = [context, args || []];
        firingIndex = -1;
        
        if (!firing) {
          fire();
        }
      }
      return this;
    },
    
    fire: function(...args) {
      self.fireWith(this, args);
      return this;
    },
    
    fired: function() {
      return !!fired;
    }
  };
  
  return self;
}

/**
 * Create a new Deferred object
 * @param {Function} [func] - Function to call with the deferred
 * @returns {Object} - Deferred object
 */
export function Deferred(func) {
  const tuples = [
    // action, add listener, callbacks, final state
    ['resolve', 'done', Callbacks('once memory'), 'resolved'],
    ['reject', 'fail', Callbacks('once memory'), 'rejected'],
    ['notify', 'progress', Callbacks('memory')]
  ];
  
  let state = 'pending';
  
  const promise = {
    state: function() {
      return state;
    },
    
    always: function(...fns) {
      deferred.done(...fns).fail(...fns);
      return this;
    },
    
    catch: function(fn) {
      return promise.then(null, fn);
    },
    
    pipe: function(/* fnDone, fnFail, fnProgress */) {
      // Deprecated in jQuery, but still supported
      return this.then.apply(this, arguments);
    },
    
    then: function(onFulfilled, onRejected, onProgress) {
      let maxDepth = 0;
      
      function resolve(depth, deferred, handler, special) {
        return function() {
          let context = this;
          let callArgs = Array.prototype.slice.call(arguments);
          
          function mightThrow() {
            let returned, then;
            
            // Support: Promises/A+ section 2.3.3.3.3
            if (depth < maxDepth) {
              return;
            }
            
            returned = handler.apply(context, callArgs);
            
            // Support: Promises/A+ section 2.3.1
            if (returned === deferred.promise()) {
              throw new TypeError('Thenable self-resolution');
            }
            
            // Support: Promises/A+ sections 2.3.3.1, 3.5
            then = returned &&
              (typeof returned === 'object' || typeof returned === 'function') &&
              returned.then;
            
            // Handle a returned thenable
            if (isFunction(then)) {
              // Special processors (notify) just wait for resolution
              if (special) {
                then.call(
                  returned,
                  resolve(maxDepth, deferred, identity, special),
                  resolve(maxDepth, deferred, thrower, special)
                );
              } else {
                maxDepth++;
                then.call(
                  returned,
                  resolve(maxDepth, deferred, identity, special),
                  resolve(maxDepth, deferred, thrower, special),
                  resolve(maxDepth, deferred, identity, deferred.notifyWith)
                );
              }
            } else {
              if (handler !== identity) {
                context = undefined;
                callArgs = [returned];
              }
              (special || deferred.resolveWith)(context, callArgs);
            }
          }
          
          // Only normal processors (resolve) catch and reject exceptions
          const process = special
            ? mightThrow
            : function() {
                try {
                  mightThrow();
                } catch (e) {
                  if (depth + 1 >= maxDepth) {
                    context = undefined;
                    callArgs = [e];
                    deferred.rejectWith(context, callArgs);
                  }
                }
              };
          
          // Execute the process
          if (depth) {
            process();
          } else {
            setTimeout(process);
          }
        };
      }
      
      return Deferred(function(newDefer) {
        // progress handlers
        tuples[2][2].add(
          resolve(0, newDefer, isFunction(onProgress) ? onProgress : identity, newDefer.notifyWith)
        );
        
        // done handlers
        tuples[0][2].add(
          resolve(0, newDefer, isFunction(onFulfilled) ? onFulfilled : identity)
        );
        
        // fail handlers
        tuples[1][2].add(
          resolve(0, newDefer, isFunction(onRejected) ? onRejected : thrower)
        );
      }).promise();
    },
    
    promise: function(obj) {
      return obj != null ? extend(obj, promise) : promise;
    }
  };
  
  const deferred = {};
  
  // Add list-specific methods
  tuples.forEach((tuple, i) => {
    const list = tuple[2];
    const stateString = tuple[3];
    
    // promise.progress = list.add
    // promise.done = list.add
    // promise.fail = list.add
    promise[tuple[1]] = list.add;
    
    // Handle state
    if (stateString) {
      list.add(
        function() {
          state = stateString;
        },
        // Disable opposite callback list
        tuples[i ^ 1][2].disable,
        // Lock progress callback
        tuples[2][2].lock
      );
    }
    
    list.add(tuple[4]);
    
    // deferred.resolve = function()
    // deferred.reject = function()
    // deferred.notify = function()
    deferred[tuple[0]] = function(...args) {
      deferred[tuple[0] + 'With'](this === deferred ? undefined : this, args);
      return this;
    };
    
    // deferred.resolveWith = list.fireWith
    // deferred.rejectWith = list.fireWith
    // deferred.notifyWith = list.fireWith
    deferred[tuple[0] + 'With'] = list.fireWith;
  });
  
  // Make the deferred a promise
  promise.promise(deferred);
  
  // Call given func if any
  if (func) {
    func.call(deferred, deferred);
  }
  
  return deferred;
}

/**
 * Resolve multiple deferreds/values
 * @param {...*} args - Deferreds or values
 * @returns {Promise} - Master promise
 */
export function when(...args) {
  const subordinates = args.slice();
  const length = subordinates.length;
  
  // The count of uncompleted subordinates
  let remaining = length !== 1 || (subordinates[0] && isFunction(subordinates[0].promise))
    ? length
    : 0;
  
  // The master Deferred
  const deferred = remaining === 1 ? subordinates[0] : Deferred();
  
  // Update function for resolve values
  const updateFunc = function(i, context, values) {
    return function(value) {
      context[i] = this;
      values[i] = arguments.length > 1 ? Array.from(arguments) : value;
      if (values === progressContexts) {
        deferred.notifyWith(context, values);
      } else if (!(--remaining)) {
        deferred.resolveWith(context, values);
      }
    };
  };
  
  let progressContexts, progressValues, resolveContexts, resolveValues;
  
  // Add listeners to Deferred subordinates
  if (length > 1) {
    progressContexts = new Array(length);
    progressValues = new Array(length);
    resolveContexts = new Array(length);
    resolveValues = new Array(length);
    
    for (let i = 0; i < length; i++) {
      if (subordinates[i] && isFunction(subordinates[i].promise)) {
        subordinates[i].promise()
          .progress(updateFunc(i, progressContexts, progressValues))
          .done(updateFunc(i, resolveContexts, resolveValues))
          .fail(deferred.reject);
      } else {
        --remaining;
      }
    }
  }
  
  // If we're not waiting on anything, resolve the master
  if (!remaining) {
    deferred.resolveWith(resolveContexts, resolveValues);
  }
  
  return deferred.promise();
}

// Helper functions
function identity(v) {
  return v;
}

function thrower(ex) {
  throw ex;
}

export default {
  Callbacks,
  Deferred,
  when
};