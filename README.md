# jQNext

A modern, lightweight JavaScript library providing **jQuery 2.x API compatibility** while using modern browser APIs internally. Designed as a drop-in replacement for jQuery 2.2.5 with full jQuery UI 1.11.x support.

## Features

- **jQuery 2.x API Compatible** - Same interface (`$()`, `$.fn`, `$.ajax`, etc.)
- **jQuery UI 1.11.x Compatible** - Full widget factory support
- **Modern JavaScript Internals** - Uses ES6+ classes, async/await, modern DOM APIs
- **Zero Legacy Code** - No IE polyfills or deprecated patterns
- **Smaller Bundle Size** - Leverages native browser capabilities
- **Modern Browser APIs**:
  - **Web Animation API** - Smooth, performant animations
  - **Fetch API** - Modern AJAX implementation
  - **WeakMap** - Memory-efficient data storage
  - **ES Modules** - Tree-shakeable imports
  - **Native Promises** - For Deferred/Promise support

## Installation

```bash
npm install
npm run build
```

## Build Output

```
dist/
├── jqnext.js       # UMD bundle (development)
├── jqnext.min.js   # UMD bundle (production)
└── jqnext.esm.js   # ES module bundle
```

## Usage

### As jQuery Replacement

```html
<!-- Replace jQuery with jQNext -->
<script src="jqnext.min.js"></script>

<!-- jQuery UI still works! -->
<script src="jquery-ui.min.js"></script>
```

### As ES Module

```javascript
import $ from 'jqnext';

$('.element').fadeIn();
```

### With Preside CMS

jQNext automatically sets `window.presideJQuery` for Preside compatibility:

```javascript
// Both work in Preside
window.presideJQuery('.element').show();
window.$('.element').show();
```

## Modern Internals

| jQuery 2.x | jQNext Implementation |
|------------|----------------------|
| `$(selector)` | `document.querySelectorAll()` + custom pseudo-selectors |
| `$.fn.each()` | Native `Array.prototype.forEach()` |
| `$.fn.on()` | Native `addEventListener()` + WeakMap storage |
| `$.fn.animate()` | Web Animation API (`element.animate()`) |
| `$.ajax()` | Fetch API + Promise |
| `$.Deferred()` | Native Promise with jQuery API wrapper |
| `$.fn.data()` | WeakMap-based storage |
| `$.fn.css()` | `getComputedStyle()` + `style` property |
| `$.fn.offset()` | `getBoundingClientRect()` |
| `$.contains()` | `Node.contains()` |

## API Coverage

### Selection & Traversal
```javascript
$('#id')                    // ID selector
$('.class')                 // Class selector
$('div:visible')            // Pseudo-selectors supported
$('input:checked')          // Form pseudo-selectors

$('.el').find('.child')     // Find descendants
$('.el').closest('.parent') // Closest ancestor
$('.el').parent()           // Direct parent
$('.el').children()         // Direct children
$('.el').siblings()         // All siblings
$('.el').next()             // Next sibling
$('.el').prev()             // Previous sibling
```

### DOM Manipulation
```javascript
$('.el').html('<p>content</p>');
$('.el').text('text content');
$('.el').append('<div>');
$('.el').prepend('<div>');
$('.el').before('<div>');
$('.el').after('<div>');
$('.el').wrap('<wrapper>');
$('.el').remove();
$('.el').clone();
```

### Attributes & CSS
```javascript
$('.el').attr('href', 'url');
$('.el').prop('checked', true);
$('.el').val('value');
$('.el').addClass('active');
$('.el').removeClass('inactive');
$('.el').toggleClass('visible');
$('.el').css('color', 'red');
$('.el').css({ color: 'red', fontSize: '14px' });
$('.el').width();
$('.el').height();
$('.el').offset();
$('.el').position();
```

### Events
```javascript
$('.el').on('click', handler);
$('.el').on('click', '.delegate', handler);
$('.el').on('click.namespace', handler);
$('.el').off('click');
$('.el').one('click', handler);
$('.el').trigger('click');

// Shorthand
$('.el').click(handler);
$('.el').hover(enterFn, leaveFn);
$('.el').focus();
$('.el').blur();
```

### Effects
```javascript
$('.el').show();
$('.el').hide();
$('.el').toggle();
$('.el').fadeIn(400);
$('.el').fadeOut(400);
$('.el').slideDown();
$('.el').slideUp();
$('.el').animate({ opacity: 0.5 }, 1000);
$('.el').stop();
$('.el').delay(500).fadeIn();
```

### AJAX
```javascript
$.ajax({
  url: '/api/data',
  type: 'POST',
  data: { key: 'value' },
  success: function(data) { },
  error: function(xhr) { }
});

$.get('/api/data', callback);
$.post('/api/data', data, callback);
$.getJSON('/api/data.json', callback);
$('.el').load('/partial.html');
$('form').serialize();
```

### Utilities
```javascript
$.extend({}, defaults, options);
$.each(array, function(i, v) { });
$.map(array, function(v) { return v * 2; });
$.grep(array, function(v) { return v > 5; });
$.inArray(value, array);
$.isArray(obj);
$.isFunction(obj);
$.isPlainObject(obj);
$.type(obj);
$.trim(str);
$.parseJSON(str);
$.param(obj);

// Deferred/Promise
var deferred = $.Deferred();
deferred.resolve(value);
deferred.promise().then(callback);
$.when(promise1, promise2).done(callback);
```

## jQuery UI Compatibility

jQNext includes a widget factory compatible with jQuery UI 1.11.x:

```javascript
// Define a widget
$.widget('ui.myWidget', {
  options: {
    value: 0
  },
  
  _create: function() {
    this._addClass('ui-mywidget');
    this._on(this.element, {
      click: '_onClick'
    });
  },
  
  _onClick: function(event) {
    this._trigger('clicked', event, { value: this.options.value });
  },
  
  _destroy: function() {
    this._removeClass('ui-mywidget');
  }
});

// Use the widget
$('.el').myWidget({ value: 42 });
$('.el').myWidget('option', 'value', 100);
$('.el').myWidget('destroy');
```

### Supported jQuery UI Features

- **Widget Factory** - Full `$.widget()` implementation
- **Widget Base Class** - `$.Widget` with all lifecycle methods
- **UI Namespace** - `$.ui.keyCode`, `$.ui.safeActiveElement`, etc.
- **Event Namespacing** - `.namespace` event support
- **Class Management** - `_addClass`, `_removeClass`, `_toggleClass`
- **Event Binding** - `_on`, `_off` with delegation
- **Triggering** - `_trigger` for widget events

## Pseudo-Selectors Supported

| Selector | Description |
|----------|-------------|
| `:visible` | Visible elements |
| `:hidden` | Hidden elements |
| `:first` | First element |
| `:last` | Last element |
| `:eq(n)` | Element at index n |
| `:gt(n)` | Elements after index n |
| `:lt(n)` | Elements before index n |
| `:even` | Even-indexed elements |
| `:odd` | Odd-indexed elements |
| `:contains(text)` | Elements containing text |
| `:has(selector)` | Elements with matching descendants |
| `:parent` | Elements with children |
| `:empty` | Empty elements |
| `:input` | Input, select, textarea, button |
| `:text`, `:checkbox`, `:radio` | Input types |
| `:checked`, `:selected`, `:disabled` | Form states |
| `:focus` | Currently focused element |
| `:animated` | Currently animating elements |
| `:data(key)` | Elements with data attribute |

## Browser Support

Modern browsers (ES6+):
- Chrome 60+
- Firefox 55+
- Safari 12+
- Edge 79+

Requires:
- Web Animation API
- Fetch API
- ES6 Classes
- WeakMap/Set
- Promises

## Project Structure

```
jqnext/
├── src/
│   ├── jqnext.js           # Main entry point
│   ├── core/
│   │   ├── collection.js   # jQCollection class
│   │   └── data.js         # WeakMap data storage
│   ├── dom/
│   │   ├── traversal.js    # DOM traversal
│   │   ├── manipulation.js # DOM manipulation
│   │   ├── attributes.js   # Attributes & properties
│   │   └── css.js          # CSS & dimensions
│   ├── events/
│   │   ├── core.js         # Event binding
│   │   └── shortcuts.js    # Event shortcuts
│   ├── effects/
│   │   ├── core.js         # Animation engine
│   │   └── showhide.js     # Show/hide/slide/fade
│   ├── ajax/
│   │   ├── core.js         # Fetch-based AJAX
│   │   └── serialize.js    # Form serialization
│   ├── utilities/
│   │   ├── type.js         # Type checking
│   │   ├── objects.js      # Object utilities
│   │   ├── strings.js      # String utilities
│   │   └── deferred.js     # Deferred/Promise
│   ├── selectors/
│   │   └── pseudo.js       # Custom pseudo-selectors
│   └── compat/
│       └── jquery-ui.js    # jQuery UI widget factory
├── dist/
│   ├── jqnext.js           # UMD bundle
│   ├── jqnext.min.js       # Minified bundle
│   └── jqnext.esm.js       # ES module
├── package.json
├── rollup.config.js
└── README.md
```

## Migration from jQuery

1. Replace jQuery script with jQNext:
   ```html
   <!-- Before -->
   <script src="jquery-2.2.5.min.js"></script>
   
   <!-- After -->
   <script src="jqnext.min.js"></script>
   ```

2. jQuery UI continues to work without changes

3. Test your application for any edge cases

### Known Differences

- Animation uses Web Animation API instead of `setInterval`
- AJAX uses Fetch API instead of XMLHttpRequest
- Some undocumented jQuery internals may not be present
- Legacy browser support (IE) is not included

## License

MIT

## Credits

- Inspired by jQuery by The jQuery Foundation
- Modern implementation for Preside CMS
- Part of the Ready Intelligence toolkit alongside SandalJS