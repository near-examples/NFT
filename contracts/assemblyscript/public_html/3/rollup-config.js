import { terser } from 'rollup-plugin-terser';

export default {
  input: 'main.js',
  output: {
    file: 'main.bundle.js',
    format: 'es',
    compact: 'true'
  },
  plugins: [terser()]
};