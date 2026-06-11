import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { FlatCompat } from '@eslint/eslintrc';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const compat = new FlatCompat({
  baseDirectory: __dirname,
});

const eslintConfig = [
  {
    ignores: ['.next/**', 'out/**', 'build/**'],
  },
  ...compat.extends('next/core-web-vitals'),
  {
    rules: {
      // These React Compiler-oriented rules were introduced by the newer Next flat config
      // and flag multiple intentional existing patterns across the app.
      'react-hooks/purity': 'off',
      'react-hooks/set-state-in-effect': 'off',
    },
  },
];

export default eslintConfig;
