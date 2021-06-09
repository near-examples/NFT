import html from '@web/rollup-plugin-html';
import {terser} from 'rollup-plugin-terser';
import { readFileSync, unlinkSync, writeFileSync } from 'fs';

export default {
  input: './transfercredits.html',
  output: { dir: 'dist' },
  plugins: [html({ minify: true }), terser(), {
    name: 'inline-js',
    closeBundle: () => {
      const js = readFileSync('dist/transfercredits.js').toString();
      const html = readFileSync('dist/transfercredits.html').toString()
            .replace(`<script type="module" src="./transfercredits.js"></script>`, `<script type="module">${js}</script>`);
      writeFileSync('dist/transfercredits.html', html);
      unlinkSync(`dist/transfercredits.js`);
    }
  }],
};