import nextVitals from 'eslint-config-next/core-web-vitals';

// eslint-config-next 16 ships native flat config, so it is spread directly
// (the FlatCompat bridge used with v15 no longer loads it).
const eslintConfig = [
  {
    ignores: ['.next/**', 'out/**', 'build/**'],
  },
  ...nextVitals,
  {
    rules: {
      // These React Compiler-oriented rules were introduced by the newer Next flat config
      // and flag multiple intentional existing patterns across the app.
    },
  },
];

export default eslintConfig;
