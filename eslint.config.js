import js from '@eslint/js';
import globals from 'globals';
import reactHooks from 'eslint-plugin-react-hooks';
import reactRefresh from 'eslint-plugin-react-refresh';
import tseslint from 'typescript-eslint';
import { defineConfig, globalIgnores } from 'eslint/config';

// Flat-Config fuer ESLint v9+/v10 (Flat-Config-Pflicht). Bislang war kein
// eslint.config.* vorhanden, der Code wurde also nie gelintet. Damit das
// Aufsetzen den bestehenden, aktiv entwickelten Code nicht blockiert, laufen
// vorbestehende Verstoesse zunaechst als WARNUNGEN (Lint bleibt gruen); nur
// echte JS-Fehler (no-undef etc.) bleiben Errors. Schrittweise verschaerfbar,
// sobald die markierten Stellen bereinigt sind.
export default defineConfig([
  globalIgnores(['dist', 'release', 'node_modules']),
  {
    files: ['src/**/*.{ts,tsx}'],
    extends: [
      js.configs.recommended,
      tseslint.configs.recommended,
      reactHooks.configs.flat.recommended,
      reactRefresh.configs.vite,
    ],
    languageOptions: {
      ecmaVersion: 2020,
      globals: { ...globals.browser, __APP_VERSION__: 'readonly' },
    },
    rules: {
      '@typescript-eslint/no-unused-vars': [
        'warn',
        {
          argsIgnorePattern: '^_',
          varsIgnorePattern: '^_',
          caughtErrorsIgnorePattern: '^_',
          // `const { id, ...rest } = x` zum bewussten Weglassen von id ist
          // kein toter Code.
          ignoreRestSiblings: true,
        },
      ],
      // Bewusst pragmatisch in der three.js-/r3f-Glue-Schicht.
      '@typescript-eslint/no-explicit-any': 'warn',
      // react-hooks v7 bringt neue, strikte (teils experimentelle) Regeln, die
      // bestehenden Code markieren. Vorerst als Warnung, nicht blockierend.
      'react-hooks/rules-of-hooks': 'warn',
      'react-hooks/exhaustive-deps': 'warn',
      'react-hooks/refs': 'warn',
      'react-hooks/static-components': 'warn',
      'react-hooks/immutability': 'warn',
      'react-hooks/set-state-in-effect': 'warn',
    },
  },
  {
    // Build-/Tooling-Dateien (Node-Kontext). tseslint-Parser, damit TS-Syntax
    // wie `as`-Casts in vite.config.ts korrekt geparst wird.
    files: ['*.config.{js,ts}', 'scripts/**/*.{js,mjs,ts}'],
    extends: [js.configs.recommended, tseslint.configs.recommended],
    languageOptions: {
      ecmaVersion: 2020,
      globals: globals.node,
    },
    rules: {
      '@typescript-eslint/no-explicit-any': 'warn',
    },
  },
  {
    files: ['electron/**/*.cjs'],
    extends: [js.configs.recommended],
    languageOptions: {
      ecmaVersion: 2020,
      sourceType: 'commonjs',
      globals: globals.node,
    },
  },
]);
