import js from '@eslint/js';
import globals from 'globals';
import tseslint from 'typescript-eslint';
import prettier from 'eslint-config-prettier';

export default tseslint.config(
  { ignores: ['dist', 'node_modules', 'eslint.config.mjs'] },
  js.configs.recommended,
  ...tseslint.configs.recommended,
  prettier,
  {
    languageOptions: {
      globals: { ...globals.node, ...globals.jest },
    },
  },
  // Hexagonal architecture: dependencies point inwards.
  {
    files: ['src/**/domain/**/*.ts', 'src/shared/**/*.ts'],
    rules: {
      'no-restricted-imports': [
        'error',
        {
          patterns: [
            { group: ['@nestjs/*', '@prisma/*'], message: 'The domain must be framework-free.' },
            { group: ['**/application/**', '**/infrastructure/**'], message: 'The domain cannot depend on outer layers.' },
          ],
        },
      ],
    },
  },
  {
    files: ['src/**/application/**/*.ts'],
    rules: {
      'no-restricted-imports': [
        'error',
        {
          patterns: [
            { group: ['@prisma/*', '**/prisma/**'], message: 'Use a port; Prisma belongs to infrastructure.' },
            { group: ['**/infrastructure/**'], message: 'The application layer cannot depend on infrastructure.' },
          ],
        },
      ],
    },
  },
);
