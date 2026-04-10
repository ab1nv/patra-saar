import baseConfig from '@patrasaar/eslint-config'

/** @type {import('eslint').Linter.Config[]} */
export default [
  ...baseConfig,
  {
    ignores: ['dist/', 'node_modules/', '.wrangler/'],
  },
]
