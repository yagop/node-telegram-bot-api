import js from '@eslint/js';
import babelParser from '@babel/eslint-parser';
import mochaPlugin from 'eslint-plugin-mocha';

export default [
  {
    ignores: ['node_modules/**', 'lib/**', 'bin/**', '*.md']
  },
  {
    files: ['**/*.js'],
    languageOptions: {
      parser: babelParser,
      parserOptions: {
        requireConfigFile: false,
        babelOptions: {
          presets: ['@babel/preset-env']
        }
      },
      globals: {
        console: 'readonly',
        process: 'readonly',
        Buffer: 'readonly',
        __dirname: 'readonly',
        __filename: 'readonly',
        require: 'readonly',
        module: 'readonly',
        exports: 'readonly',
        global: 'readonly',
        setImmediate: 'readonly',
        clearImmediate: 'readonly',
        setInterval: 'readonly',
        clearInterval: 'readonly',
        setTimeout: 'readonly',
        clearTimeout: 'readonly'
      }
    },
    rules: {
      ...js.configs.recommended.rules,
      'new-cap': 0,
      'prefer-arrow-callback': 0,
      'no-param-reassign': [2, { props: false }],
      'max-len': [2, 200],
      'arrow-body-style': 0,
      'comma-dangle': 0,
      'indent': ['error', 2],
      'no-console': 0,
      'func-names': 0,
      'object-shorthand': 0,
      'no-use-before-define': 0,
      'no-underscore-dangle': 0
    }
  },
  {
    files: ['test/**/*.js'],
    languageOptions: {
      globals: {
        describe: 'readonly',
        it: 'readonly',
        before: 'readonly',
        after: 'readonly',
        beforeEach: 'readonly',
        afterEach: 'readonly'
      }
    },
    plugins: {
      mocha: mochaPlugin
    },
    rules: {
      'mocha/no-top-level-hooks': 0,
      'mocha/consistent-spacing-between-blocks': 0,
      'mocha/no-setup-in-describe': 0,
      'mocha/max-top-level-suites': 0,
      'mocha/no-pending-tests': 0
    }
  }
];
