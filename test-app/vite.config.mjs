import { classicEmberSupport, ember, extensions } from '@embroider/vite';

import { babel } from '@rollup/plugin-babel';
import { defineConfig } from 'vite';

import { fileURLToPath } from 'node:url';

export default defineConfig({
  resolve: {
    alias: {
      'warp-drive-supabase': fileURLToPath(
        new URL('../src/index.ts', import.meta.url),
      ),
    },
  },
  plugins: [
    classicEmberSupport(),
    ember(),
    // extra plugins here
    babel({
      babelHelpers: 'runtime',
      extensions,
    }),
  ],
});
