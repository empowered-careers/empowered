import coreWebVitals from "eslint-config-next/core-web-vitals";
import typescript from "eslint-config-next/typescript";
import eslintConfigPrettier from "eslint-config-prettier";
import simpleImportSort from "eslint-plugin-simple-import-sort";

const config = [
  {
    ignores: [
      "**/node_modules/**",
      ".next/**",
      "out/**",
      "build/**",
      "dist/**",
      "coverage/**",
      "src/types/database.types.ts",
    ],
  },
  ...coreWebVitals,
  ...typescript,
  {
    files: ["**/*.{js,mjs,cjs,jsx,ts,tsx}"],
    plugins: {
      "simple-import-sort": simpleImportSort,
    },
    rules: {
      "simple-import-sort/imports": "error",
      "simple-import-sort/exports": "error",
      "react/no-unescaped-entities": "off",
    },
  },
  // Hydration guard. `toLocaleDateString` / `toLocaleTimeString` — and
  // `toLocaleString` on a Date — read the runtime's time zone and locale, so
  // the server (UTC) and the visitor's browser disagree on any timestamp near
  // a date boundary. React throws #418 on the text mismatch and the error
  // boundary takes the whole page down with it. Twice in production now.
  //
  // Scoped to client components. Server Components render once and never
  // hydrate, so `src/app/**/page.tsx` and friends are deliberately not covered.
  {
    files: ["src/components/**/*.tsx", "src/app/**/*-client.tsx"],
    ignores: ["src/components/local-date.tsx"],
    rules: {
      "no-restricted-syntax": [
        "error",
        {
          selector:
            "CallExpression[callee.property.name=/^toLocale(Date|Time)String$/]",
          message:
            "Timezone-dependent formatting during render causes a hydration mismatch (React #418). Use <LocalDate> / useLocalDateOrNull from @/components/local-date.",
        },
        {
          selector:
            'CallExpression[callee.object.type="NewExpression"][callee.object.callee.name="Date"][callee.property.name="toLocaleString"]',
          message:
            "Timezone-dependent formatting during render causes a hydration mismatch (React #418). Use <LocalDate> / useLocalDateOrNull from @/components/local-date.",
        },
      ],
    },
  },
  eslintConfigPrettier,
];

export default config;
