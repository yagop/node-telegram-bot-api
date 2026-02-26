import js from '@eslint/js';
import tseslint from 'typescript-eslint';
import prettier from 'eslint-plugin-prettier';
import globals from 'globals';

export default [
  // Base JavaScript configuration
  js.configs.recommended,
  {
    languageOptions: {
      globals: {
        ...globals.node,
      },
    },
    plugins: {
      prettier,
    },
    rules: {
      'prettier/prettier': 'error',
      'no-unused-vars': 'off',
      'no-console': 'warn',
      'prefer-const': 'error',
      'no-var': 'error',
    },
  },

  // JavaScript files - more lenient
//   {
//     files: ['**/*.js'],
//     rules: {
//       '@typescript-eslint/no-require-imports': 'off',
//       '@typescript-eslint/no-var-requires': 'off',
//       'no-undef': 'off', // Allow global requires in JS files
//     },
//   },

  // TypeScript configuration - only for .ts files except test
  ...tseslint.configs.recommended,
  {
    files: ['**/*.ts'],
    ignores: ['test/**/*', '**/*.test.ts', '**/*.spec.ts'],
    languageOptions: {
      parser: tseslint.parser,
      parserOptions: {
        project: './tsconfig.build.json',
      },
    },
    rules: {
      '@typescript-eslint/no-unused-vars': 'error',
      '@typescript-eslint/explicit-function-return-type': 'off',
      '@typescript-eslint/explicit-module-boundary-types': 'off',
      '@typescript-eslint/no-explicit-any': 'warn',
      '@typescript-eslint/no-non-null-assertion': 'warn',
      '@typescript-eslint/no-require-imports': 'error',
      '@typescript-eslint/no-var-requires': 'error',
      '@typescript-eslint/no-empty-object-type': 'warn',
      '@typescript-eslint/no-unsafe-function-type': 'warn',
    },
  },

  // Test files - no project for TypeScript
  {
    files: ['test/**/*.{js,ts}', '**/*.test.{js,ts}', '**/*.spec.{js,ts}'],
    languageOptions: {
      parser: tseslint.parser,
      parserOptions: {
        // No project for test files
      },
      globals: {
        describe: 'readonly',
        it: 'readonly',
        before: 'readonly',
        after: 'readonly',
        beforeEach: 'readonly',
        afterEach: 'readonly',
        expect: 'readonly',
      },
    },
    rules: {
      'no-console': 'off',
      '@typescript-eslint/no-unused-vars': 'off', // Test files often have unused setup vars
      '@typescript-eslint/no-explicit-any': 'off', // Test files often need any for mocking
      '@typescript-eslint/no-require-imports': 'off', // Allow require in tests
      '@typescript-eslint/no-var-requires': 'off', // Allow require in tests
    },
  },

  // Examples - more lenient
  {
    files: ['examples/**/*.{js,ts}'],
    rules: {
      'no-console': 'off',
      '@typescript-eslint/no-unused-vars': 'warn',
    },
  },

  // Ignore patterns
  {
    ignores: [
      'lib/**/*',
      'node_modules/**/*',
      'docs/**/*',
      'coverage/**/*',
      '*.min.js',
      'dist/**/*',
        '**/*.js',
        
    ],
  },
];
