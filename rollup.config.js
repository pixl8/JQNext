import resolve from '@rollup/plugin-node-resolve';
import terser from '@rollup/plugin-terser';

const banner = `/*!
 * jQNext v1.0.0 - Modern jQuery 2.x Compatible Library
 * https://gitlab.com/ready-intelligence/jqnext
 * 
 * Copyright (c) ${new Date().getFullYear()} Ready Intelligence
 * Released under the MIT License
 * 
 * A drop-in replacement for jQuery 2.x using modern JavaScript internals.
 * Compatible with jQuery UI 1.11.x
 */`;

export default [
  // UMD build (for browsers and Node.js)
  {
    input: 'src/jqnext.js',
    output: [
      {
        file: 'dist/jqnext.js',
        format: 'umd',
        name: 'jQuery',
        amd: {
          id: 'jquery'
        },
        banner,
        sourcemap: true,
        exports: 'default',
        footer: `
// Global aliases for jQuery compatibility
if (typeof window !== 'undefined') {
  window.$ = window.jQuery;
  window.jQNext = window.jQuery;
}
`
      },
      {
        file: 'dist/jqnext.min.js',
        format: 'umd',
        name: 'jQuery',
        amd: {
          id: 'jquery'
        },
        banner,
        sourcemap: true,
        exports: 'default',
        plugins: [terser({
          format: {
            comments: /^!/
          }
        })],
        footer: `
if (typeof window !== 'undefined') {
  window.$ = window.jQuery;
  window.jQNext = window.jQuery;
}
`
      }
    ],
    plugins: [resolve()]
  },
  // ES Module build (for bundlers)
  {
    input: 'src/jqnext.js',
    output: {
      file: 'dist/jqnext.esm.js',
      format: 'es',
      banner,
      sourcemap: true
    },
    plugins: [resolve()]
  }
];