import baseConfig from './packages/eslint-config/index.js'

/** @type {import('eslint').Linter.Config[]} */
export default [
  {
    ignores: [
      '**/node_modules/**',
      '**/dist/**',
      '**/.svelte-kit/**',
      '**/.wrangler/**',
      '**/.turbo/**',
      '**/pnpm-lock.yaml',
    ],
  },
  ...baseConfig,
]
