import typescript from '@rollup/plugin-typescript';

/** @type {import('rollup').RollupOptions[]} */
const config = [{
  input: 'src/ffmeta.ts',
  output: [{
    dir: 'dist/',
    format: 'commonjs',
  }, {
    dir: 'dist/',
    format: 'es',
    entryFileNames: '[name].mjs'
  }],
  plugins: [
    typescript(),
  ],
}];

export default config;
