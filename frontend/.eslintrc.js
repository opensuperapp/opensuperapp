// https://docs.expo.dev/guides/using-eslint/
module.exports = {
  extends: 'expo',
  ignorePatterns: ['/dist/*'],
  rules: {
    // eslint-config-expo 58 turns on the React Compiler checks below as errors.
    // They flag ~100 pre-existing patterns (none from the SDK upgrade); keep the
    // SDK 54 lint behaviour until those are refactored in their own change.
    'react-hooks/refs': 'off',
    'react-hooks/set-state-in-effect': 'off',
    'react-hooks/immutability': 'off',
    'react-hooks/purity': 'off',
    'react-hooks/preserve-manual-memoization': 'off',
    'react-hooks/globals': 'off',
  },
  settings: {
    // The `@/*` alias is resolved from tsconfig by the TypeScript resolver,
    // whose default extension list has no platform sub-extensions. Metro
    // resolves an import of "./Foo" to Foo.ios.tsx / Foo.android.tsx, so
    // without these every platform component reads as a missing module.
    'import/resolver': {
      typescript: {
        project: './tsconfig.json',
        extensions: [
          '.ios.tsx',
          '.ios.ts',
          '.android.tsx',
          '.android.ts',
          '.native.tsx',
          '.native.ts',
          '.tsx',
          '.ts',
          '.jsx',
          '.js',
          '.json',
        ],
      },
    },
  },
};
