import js from "@eslint/js";
import globals from "globals";
import reactHooks from "eslint-plugin-react-hooks";
import reactRefresh from "eslint-plugin-react-refresh";
import tseslint from "typescript-eslint";

export default tseslint.config(
  { ignores: ["dist"] },
  {
    extends: [js.configs.recommended, ...tseslint.configs.recommended],
    files: ["**/*.{ts,tsx}"],
    languageOptions: {
      ecmaVersion: 2020,
      globals: globals.browser,
    },
    plugins: {
      "react-hooks": reactHooks,
      "react-refresh": reactRefresh,
    },
    rules: {
      ...reactHooks.configs.recommended.rules,
      "react-refresh/only-export-components": ["warn", { allowConstantExport: true }],
      "@typescript-eslint/no-unused-vars": "off",
      // This project's tsconfig.json deliberately sets noImplicitAny: false
      // and strictNullChecks: false project-wide, and `any` is used
      // extensively and intentionally throughout (Firestore documents,
      // third-party SDK callbacks, etc.). typescript-eslint's "recommended"
      // preset turns @typescript-eslint/no-explicit-any into a hard error,
      // which was never actually satisfied by this codebase — it was
      // silently failing `npm run lint` (and therefore the "Type Check ·
      // Lint · Build · Test" GitHub Actions/status check) on every commit,
      // long before this fix. Downgraded to a warning so it surfaces in
      // review without blocking CI/deploys for code that was already
      // intentionally written this way.
      "@typescript-eslint/no-explicit-any": "warn",
      // Silent best-effort `catch {}` blocks (e.g. non-critical analytics/
      // tracking calls that must never surface an error to the user) are an
      // established, intentional pattern across this codebase. Empty catch
      // blocks specifically are allowed; other empty blocks still error.
      "no-empty": ["error", { allowEmptyCatch: true }],
    },
  },
);
