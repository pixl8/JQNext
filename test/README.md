# JQNext Browser Tests

This directory contains browser-based tests that verify JQNext's API compatibility with jQuery 2.2.5.

## Test Structure

- **test-jquery.html** - Runs the test suite against jQuery 2.2.5
- **test-jqnext.html** - Runs the test suite against JQNext
- **tests.js** - Shared test suite (library-agnostic)
- **lib/** - Contains test dependencies
  - `jqnext.js` - JQNext library (copied from dist during build)
  - `jquery-2.2.5-sec.js` - jQuery 2.2.5 library
  - `qunit/` - QUnit testing framework

## Running Tests

1. **Build JQNext** (required before first run or after changes):
   ```bash
   cd website/jqnext
   npm run build
   ```
   This builds JQNext and automatically copies it to `test/lib/jqnext.js`

2. **Start the test server**:
   ```bash
   cd website/jqnext/test
   python3 -m http.server 8888
   ```

3. **Open tests in browser**:
   - jQuery tests: http://localhost:8888/test-jquery.html
   - JQNext tests: http://localhost:8888/test-jqnext.html

## How It Works

The test suite in `tests.js` is wrapped in an IIFE that automatically detects which library is loaded (jQuery or JQNext) and uses it for all tests. This allows the same test suite to verify API compatibility across both libraries.

Both HTML files:
- Load QUnit from `lib/qunit/qunit.js`
- Load their respective library from `lib/`
- Load the shared test suite from `tests.js`
- Provide identical DOM fixtures for testing

## Development Workflow

When making changes to JQNext:

1. Make your changes to the source files in `src/`
2. Run `npm run build` to rebuild and copy to test/lib
3. Refresh the test page in your browser
4. Compare results between jQuery and JQNext tests

## Build Process

The `npm run build` command:
1. Runs `rollup -c` to build JQNext from source
2. Automatically runs `copy-to-test` script
3. Copies `dist/jqnext.js` and `dist/jqnext.js.map` to `test/lib/`

This ensures the test files are always testing the latest build.