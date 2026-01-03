// Comprehensive compatibility tests for jQuery and jQNext
// Tests edge cases and less common API patterns used by plugins

QUnit.module('Collection/Traversal Edge Cases');

QUnit.test('$.fn.end() chain behavior', function(assert) {
    var $container = $('<div><p>1</p><p>2</p><p>3</p></div>').appendTo('#qunit-fixture');
    
    var $result = $container.find('p').eq(0).end();
    
    assert.equal($result.length, 3, 'end() returns to previous collection');
    assert.ok($result[0].tagName === 'P', 'Collection contains correct elements');
    
    // Double end()
    var $result2 = $container.find('p').eq(0).end().end();
    assert.equal($result2[0], $container[0], 'Double end() returns to original');
    
    $container.remove();
});

QUnit.test('$.fn.addBack() with filter', function(assert) {
    var $container = $('<div class="wrapper"><p class="a">A</p><span class="b">B</span></div>').appendTo('#qunit-fixture');
    
    var $result = $container.find('p').next().addBack('.a');
    
    assert.equal($result.length, 2, 'addBack with filter works');
    assert.ok($result.eq(0).hasClass('a'), 'Filtered previous element included');
    assert.ok($result.eq(1).hasClass('b'), 'Current element included');
    
    $container.remove();
});

QUnit.test('$.fn.slice() negative indices', function(assert) {
    var $divs = $('<div>1</div><div>2</div><div>3</div><div>4</div>').appendTo('#qunit-fixture');
    
    var $result = $divs.slice(-2);
    assert.equal($result.length, 2, 'Negative start works');
    assert.equal($result.eq(0).text(), '3', 'Correct elements');
    
    var $result2 = $divs.slice(1, -1);
    assert.equal($result2.length, 2, 'Negative end works');
    assert.equal($result2.eq(0).text(), '2', 'Correct range');
    assert.equal($result2.eq(1).text(), '3', 'Correct range');
    
    $divs.remove();
});

QUnit.test('$.fn.has() with element', function(assert) {
    var $container = $('<div><p><span>A</span></p><p>B</p></div>').appendTo('#qunit-fixture');
    
    var $withSpan = $container.find('p').has('span');
    assert.equal($withSpan.length, 1, 'has() filters by descendant');
    assert.equal($withSpan.find('span').text(), 'A', 'Correct element');
    
    $container.remove();
});

QUnit.test('$.fn.contents() returns text nodes', function(assert) {
    var $div = $('<div>Text<span>Span</span>More</div>').appendTo('#qunit-fixture');
    
    var contents = $div.contents();
    assert.equal(contents.length, 3, 'Three child nodes');
    assert.equal(contents[0].nodeType, 3, 'First is text node');
    assert.equal(contents[1].nodeType, 1, 'Second is element node');
    assert.equal(contents[2].nodeType, 3, 'Third is text node');
    
    $div.remove();
});

QUnit.module('Event Object Edge Cases');

QUnit.test('Event object properties', function(assert) {
    var $div = $('<div></div>').appendTo('#qunit-fixture');
    var eventObj = null;
    
    $div.on('click', function(e) {
        eventObj = e;
    });
    
    $div.trigger($.Event('click', {
        which: 1,
        pageX: 100,
        pageY: 200,
        ctrlKey: true
    }));
    
    assert.ok(eventObj, 'Event triggered');
    assert.equal(eventObj.which, 1, 'which property set');
    assert.equal(eventObj.pageX, 100, 'pageX property set');
    assert.equal(eventObj.pageY, 200, 'pageY property set');
    assert.equal(eventObj.ctrlKey, true, 'ctrlKey property set');
    assert.ok(typeof eventObj.isDefaultPrevented === 'function', 'isDefaultPrevented is function');
    
    $div.remove();
});

QUnit.test('Event.preventDefault() and isDefaultPrevented()', function(assert) {
    var $div = $('<div></div>').appendTo('#qunit-fixture');
    var prevented = false;
    
    $div.on('custom', function(e) {
        e.preventDefault();
        prevented = e.isDefaultPrevented();
    });
    
    $div.trigger('custom');
    assert.ok(prevented, 'preventDefault() works');
    
    $div.remove();
});

QUnit.test('Event.stopPropagation() and isPropagationStopped()', function(assert) {
    var $outer = $('<div><div class="inner"></div></div>').appendTo('#qunit-fixture');
    var outerFired = false;
    var propagationStopped = false;
    
    $outer.on('custom', function() {
        outerFired = true;
    });
    
    $outer.find('.inner').on('custom', function(e) {
        e.stopPropagation();
        propagationStopped = e.isPropagationStopped();
    });
    
    $outer.find('.inner').trigger('custom');
    
    assert.ok(propagationStopped, 'stopPropagation() detected');
    assert.ok(!outerFired, 'Propagation actually stopped');
    
    $outer.remove();
});

QUnit.module('DOM Manipulation Edge Cases');

QUnit.test('$.fn.wrap() with function', function(assert) {
    var $items = $('<span>1</span><span>2</span>').appendTo('#qunit-fixture');
    
    $items.wrap(function(i) {
        return '<div class="wrapper-' + i + '"></div>';
    });
    
    assert.ok($items.eq(0).parent().hasClass('wrapper-0'), 'First wrapped correctly');
    assert.ok($items.eq(1).parent().hasClass('wrapper-1'), 'Second wrapped correctly');
    
    $items.parent().remove();
});

QUnit.test('$.fn.html() with jQuery collection', function(assert) {
    var $target = $('<div></div>').appendTo('#qunit-fixture');
    var $content = $('<p>Para 1</p><p>Para 2</p>');
    
    $target.html($content);
    
    assert.equal($target.find('p').length, 2, 'Collection elements inserted');
    assert.equal($target.find('p').eq(0).text(), 'Para 1', 'First element correct');
    
    $target.remove();
});

QUnit.module('CSS Edge Cases');

QUnit.test('$.fn.css() with function', function(assert) {
    var $div = $('<div style="width: 100px;"></div>').appendTo('#qunit-fixture');
    
    $div.css('width', function(i, val) {
        return (parseInt(val) * 2) + 'px';
    });
    
    assert.equal($div.css('width'), '200px', 'Function setter works');
    
    $div.remove();
});

QUnit.test('$.fn.width/height setters with function', function(assert) {
    var $div = $('<div style="width: 50px; height: 50px;"></div>').appendTo('#qunit-fixture');
    
    $div.width(function(i, w) {
        return w * 2;
    });
    
    assert.equal($div.width(), 100, 'Width function setter works');
    
    $div.remove();
});

QUnit.test('$.cssHooks exists and is extensible', function(assert) {
    assert.ok($.cssHooks, '$.cssHooks exists');
    assert.ok(typeof $.cssHooks === 'object', '$.cssHooks is object');
    
    // Test that we can add a hook (like jQuery UI does)
    $.cssHooks.testProp = {
        get: function(elem, computed, extra) {
            return '42';
        }
    };
    
    assert.ok($.cssHooks.testProp, 'Can add custom cssHook');
    delete $.cssHooks.testProp;
});

QUnit.module('Attribute Edge Cases');

QUnit.test('$.fn.attr() with multiple attributes', function(assert) {
    var $div = $('<div></div>').appendTo('#qunit-fixture');
    
    $div.attr({
        'data-id': '123',
        'data-name': 'test',
        'title': 'Title'
    });
    
    assert.equal($div.attr('data-id'), '123', 'First attr set');
    assert.equal($div.attr('data-name'), 'test', 'Second attr set');
    assert.equal($div.attr('title'), 'Title', 'Third attr set');
    
    $div.remove();
});

QUnit.test('$.fn.prop() with function', function(assert) {
    var $checkbox = $('<input type="checkbox" checked>').appendTo('#qunit-fixture');
    
    $checkbox.prop('checked', function(i, val) {
        return !val;
    });
    
    assert.equal($checkbox.prop('checked'), false, 'Function setter toggles value');
    
    $checkbox.remove();
});

QUnit.test('$.fn.val() on multi-select', function(assert) {
    var $select = $('<select multiple><option value="a">A</option><option value="b">B</option><option value="c">C</option></select>').appendTo('#qunit-fixture');
    
    $select.val(['a', 'c']);
    var values = $select.val();
    
    assert.ok($.isArray(values), 'Returns array');
    assert.equal(values.length, 2, 'Two values selected');
    assert.ok(values.indexOf('a') !== -1, 'Contains "a"');
    assert.ok(values.indexOf('c') !== -1, 'Contains "c"');
    
    $select.remove();
});

QUnit.module('Utility Function Edge Cases');

QUnit.test('$.contains', function(assert) {
    var $container = $('<div><span><em>Text</em></span></div>').appendTo('#qunit-fixture');
    var container = $container[0];
    var span = $container.find('span')[0];
    var em = $container.find('em')[0];
    
    assert.ok($.contains(container, span), 'Contains direct child');
    assert.ok($.contains(container, em), 'Contains nested child');
    assert.ok(!$.contains(span, container), 'Does not contain parent');
    assert.ok(!$.contains(container, container), 'Does not contain self');
    
    $container.remove();
});

QUnit.test('$.nodeName', function(assert) {
    var div = document.createElement('div');
    var p = document.createElement('p');
    
    assert.ok($.nodeName(div, 'div'), 'Matches div');
    assert.ok($.nodeName(div, 'DIV'), 'Case insensitive');
    assert.ok(!$.nodeName(div, 'span'), 'Does not match span');
    assert.ok($.nodeName(p, 'p'), 'Matches p');
});

QUnit.test('$.type edge cases', function(assert) {
    assert.equal($.type(null), 'null', 'null detected');
    assert.equal($.type(undefined), 'undefined', 'undefined detected');
    assert.equal($.type(true), 'boolean', 'boolean detected');
    assert.equal($.type(42), 'number', 'number detected');
    assert.equal($.type('string'), 'string', 'string detected');
    assert.equal($.type({}), 'object', 'object detected');
    assert.equal($.type([]), 'array', 'array detected');
    assert.equal($.type(function() {}), 'function', 'function detected');
    assert.equal($.type(new Date()), 'date', 'date detected');
    assert.equal($.type(/regex/), 'regexp', 'regexp detected');
});

QUnit.test('$.merge', function(assert) {
    var first = [1, 2, 3];
    var second = [4, 5, 6];
    
    var result = $.merge(first, second);
    
    assert.equal(result.length, 6, 'Merged length correct');
    assert.equal(first.length, 6, 'First array modified');
    assert.deepEqual(result, [1, 2, 3, 4, 5, 6], 'Merged correctly');
});

QUnit.test('$.unique / $.uniqueSort', function(assert) {
    var $container = $('<div><p>1</p><p>2</p><p>3</p></div>').appendTo('#qunit-fixture');
    var elems = $container.find('p').get();
    var duplicates = elems.concat(elems[0], elems[1]);
    
    var unique = $.uniqueSort(duplicates);
    
    assert.equal(unique.length, 3, 'Duplicates removed');
    assert.equal(unique[0], elems[0], 'Order preserved');
    
    $container.remove();
});

QUnit.module('Deferred/Promise Edge Cases');

QUnit.test('$.Deferred().then() chaining', function(assert) {
    var done = assert.async();
    var results = [];
    
    var dfd = $.Deferred();
    
    dfd.then(function(val) {
        results.push('first: ' + val);
        return val * 2;
    }).then(function(val) {
        results.push('second: ' + val);
        return val * 2;
    }).done(function(val) {
        results.push('done: ' + val);
        
        assert.equal(results.length, 3, 'All callbacks fired');
        assert.equal(results[0], 'first: 10', 'First then fired');
        assert.equal(results[1], 'second: 20', 'Second then fired');
        assert.equal(results[2], 'done: 40', 'Done fired');
        done();
    });
    
    dfd.resolve(10);
});

QUnit.test('$.Deferred().fail() and .always()', function(assert) {
    var done = assert.async();
    var failFired = false;
    var alwaysFired = false;
    
    var dfd = $.Deferred();
    
    dfd.fail(function() {
        failFired = true;
    }).always(function() {
        alwaysFired = true;
        
        assert.ok(failFired, 'fail() fired on reject');
        assert.ok(alwaysFired, 'always() fired on reject');
        done();
    });
    
    dfd.reject();
});

QUnit.test('$.when with multiple deferreds', function(assert) {
    var done = assert.async();
    
    var dfd1 = $.Deferred();
    var dfd2 = $.Deferred();
    
    $.when(dfd1, dfd2).done(function(val1, val2) {
        assert.equal(val1, 'first', 'First value correct');
        assert.equal(val2, 'second', 'Second value correct');
        done();
    });
    
    setTimeout(function() {
        dfd1.resolve('first');
        dfd2.resolve('second');
    }, 10);
});

QUnit.module('Animation/Queue Edge Cases');

QUnit.test('$.fn.delay()', function(assert) {
    var done = assert.async();
    var $div = $('<div></div>').appendTo('#qunit-fixture');
    var fired = false;
    
    $div.delay(50).queue(function(next) {
        fired = true;
        next();
    });
    
    assert.ok(!fired, 'Not fired immediately');
    
    setTimeout(function() {
        assert.ok(fired, 'Fired after delay');
        $div.remove();
        done();
    }, 100);
});

QUnit.module('Selector Engine Edge Cases');

QUnit.test(':eq() pseudo selector', function(assert) {
    var $container = $('<div><p>0</p><p>1</p><p>2</p></div>').appendTo('#qunit-fixture');
    
    var $eq1 = $container.find('p:eq(1)');
    assert.equal($eq1.length, 1, 'One element selected');
    assert.equal($eq1.text(), '1', 'Correct element');
    
    $container.remove();
});

QUnit.test(':first and :last pseudo selectors', function(assert) {
    var $container = $('<div><p>First</p><p>Middle</p><p>Last</p></div>').appendTo('#qunit-fixture');
    
    assert.equal($container.find('p:first').text(), 'First', ':first works');
    assert.equal($container.find('p:last').text(), 'Last', ':last works');
    
    $container.remove();
});

QUnit.test(':not() pseudo selector', function(assert) {
    var $container = $('<div><p class="a">A</p><p class="b">B</p><p class="c">C</p></div>').appendTo('#qunit-fixture');
    
    var $notB = $container.find('p:not(.b)');
    assert.equal($notB.length, 2, 'Two elements selected');
    assert.ok($notB.eq(0).hasClass('a'), 'First is .a');
    assert.ok($notB.eq(1).hasClass('c'), 'Second is .c');
    
    $container.remove();
});

QUnit.module('AJAX Edge Cases');

QUnit.test('$.ajaxSetup modifies defaults', function(assert) {
    var originalTimeout = $.ajaxSettings.timeout;
    
    $.ajaxSetup({
        timeout: 9999,
        headers: { 'X-Test': 'value' }
    });
    
    assert.equal($.ajaxSettings.timeout, 9999, 'Timeout updated');
    assert.equal($.ajaxSettings.headers['X-Test'], 'value', 'Headers added');
    
    // Restore
    $.ajaxSettings.timeout = originalTimeout;
    delete $.ajaxSettings.headers['X-Test'];
});

QUnit.test('$.Callbacks functionality', function(assert) {
    var callbacks = $.Callbacks();
    var results = [];
    
    callbacks.add(function(val) {
        results.push('first: ' + val);
    });
    
    callbacks.add(function(val) {
        results.push('second: ' + val);
    });
    
    callbacks.fire('test');
    
    assert.equal(results.length, 2, 'Both callbacks fired');
    assert.equal(results[0], 'first: test', 'First callback correct');
    assert.equal(results[1], 'second: test', 'Second callback correct');
});

QUnit.module('Edge Case Scenarios');

QUnit.test('Chaining returns correct collection', function(assert) {
    var $div = $('<div></div>').appendTo('#qunit-fixture');
    
    var result = $div
        .addClass('test')
        .attr('data-id', '123')
        .css('color', 'red')
        .data('key', 'value');
    
    assert.equal(result[0], $div[0], 'Chaining returns same collection');
    assert.ok(result.hasClass('test'), 'Class added');
    assert.equal(result.attr('data-id'), '123', 'Attribute set');
    assert.equal(result.css('color'), 'rgb(255, 0, 0)', 'CSS set');
    assert.equal(result.data('key'), 'value', 'Data set');
    
    $div.remove();
});

QUnit.test('Empty collection method calls', function(assert) {
    var $empty = $('.does-not-exist');
    
    // Should not throw
    $empty.addClass('test');
    $empty.css('color', 'red');
    $empty.attr('data-test', 'value');
    $empty.on('click', function() {});
    $empty.trigger('click');
    
    assert.ok(true, 'No errors on empty collection');
});

QUnit.test('Multiple selector with context', function(assert) {
    var $container = $('<div id="ctx"><p class="a">A</p><span class="a">B</span></div>').appendTo('#qunit-fixture');
    
    var $found = $('p.a, span.a', $container);
    
    assert.equal($found.length, 2, 'Multiple selector works with context');
    
    $container.remove();
});