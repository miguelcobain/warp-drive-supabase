import { babel } from '@rollup/plugin-babel';
import { babelPlugin } from '@warp-drive/core/build-config';
import { defineConfig, type UserConfig } from 'vitest/config';

// The published Warp Drive packages still contain calls to @embroider/macros.
// Ember/Embroider transforms those calls during an application build, but the
// library test suite runs in Node and needs the equivalent test-time transform.
// Without it, importing @warp-drive/utilities throws from getGlobalConfig().
const warpDriveBabel = babelPlugin({ forceMode: 'testing' });
type VitestPlugin = NonNullable<UserConfig['plugins']>[number];

// pnpm installs separate Rollup type copies for Vite and @rollup/plugin-babel.
// Their runtime plugin contracts are compatible; the cast only reconciles the
// duplicate TypeScript definitions and has no runtime effect.
const warpDriveMacroTransform = babel({
  babelHelpers: 'bundled',
  extensions: ['.js'],
  // Keep the extra Babel work limited to packages containing these macros.
  include: /node_modules\/\.pnpm\/@warp-drive\+(?:core|utilities)@/,
  plugins: warpDriveBabel.js,
}) as unknown as VitestPlugin;

export default defineConfig({
  plugins: [warpDriveMacroTransform],
  test: {
    globals: true,
    server: {
      deps: {
        // Vitest normally externalizes dependencies directly to Node. Inline
        // Warp Drive so Vite sends it through the Babel transform above.
        inline: [/@warp-drive\/(?:core|utilities)/],
      },
    },
  },
});
