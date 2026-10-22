/** @type {import('stylelint').Config} */
export default {
  extends: ['stylelint-config-standard', 'stylelint-config-html/astro'],
  rules: {
    // Raw design values live only in src/styles/tokens.css; everything else uses var(--*).
    'color-no-hex': true,
    'color-named': 'never',
    'function-disallowed-list': [
      'rgb',
      'rgba',
      'hsl',
      'hsla',
      'hwb',
      'lab',
      'lch',
      'oklab',
      'oklch',
    ],
    'declaration-property-value-allowed-list': {
      '/^font(-family|-size|-weight)?$/': ['/var\\(--/', 'inherit'],
      'line-height': ['/var\\(--/', 'inherit', '1'],
      'z-index': ['/var\\(--z-/'],
      '/^transition-(duration|timing-function)$/': ['/var\\(--/'],
    },
  },
  overrides: [
    {
      files: ['src/styles/tokens.css'],
      rules: {
        'color-no-hex': null,
        'function-disallowed-list': null,
      },
    },
  ],
};
