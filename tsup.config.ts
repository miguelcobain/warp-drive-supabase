import { defineConfig } from 'tsup';

export default defineConfig({
  entry: {
    index: 'src/index.ts',
    builders: 'src/builders/index.ts',
    handlers: 'src/handlers/index.ts',
    auth: 'src/auth/index.ts',
  },
  format: ['esm', 'cjs'],
  dts: {
    resolve: true,
    compilerOptions: {
      tsconfig: 'tsconfig.build.json',
    },
  },
  clean: true,
  sourcemap: true,
  target: 'es2022',
  splitting: false,
  external: ['@warp-drive/core', '@warp-drive/utilities'],
});
