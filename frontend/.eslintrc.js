// https://docs.expo.dev/guides/using-eslint/
module.exports = {
  extends: 'expo',
  ignorePatterns: ['/dist/*'],
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
