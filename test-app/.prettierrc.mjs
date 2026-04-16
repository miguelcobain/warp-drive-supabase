import pkg from './package.json' with { type: 'json' };

/** @type {import('prettier').Config & import('prettier-plugin-tailwindcss').PluginOptions} */
export default {
  // Testing modules
  importOrder: [
    '^@ember/(.*)$',
    '^@glimmer/(.*)$',
    '^@warp-drive/(.*)$',
    '^@embroider/(.*)$',
    '^ember(.*)$',
    '^ember-data(.*)$',
    `^${pkg.name}(.*)$`,
    '<THIRD_PARTY_MODULES>',
    '<BUILTIN_MODULES>',
  ],
  importOrderParserPlugins: [
    'typescript',
    'classProperties',
    'decorators-legacy',
  ],
  importOrderSeparation: true,
  importOrderSortSpecifiers: true,
  plugins: [
    'prettier-plugin-ember-template-tag',
    '@trivago/prettier-plugin-sort-imports',
  ],
  overrides: [
    {
      files: '*.{js,gjs,ts,gts,mjs,mts,cjs,cts}',
      options: {
        singleQuote: true,
        templateSingleQuote: false,
      },
    },
  ],
};
