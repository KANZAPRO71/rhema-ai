import js from "@eslint/js";
import globals from "globals";

export default [
  {
    ignores: ["www/vendor/**", "www/data/**", "android/**", "node_modules/**"],
  },
  js.configs.recommended,
  {
    files: ["www/**/*.js", "dev/**/*.mjs"],
    languageOptions: {
      ecmaVersion: 2024,
      sourceType: "module",
      globals: {
        ...globals.browser,
        ...globals.node,
        Capacitor: "readonly",
      },
    },
    rules: {
      "no-unused-vars": ["warn", { argsIgnorePattern: "^_", varsIgnorePattern: "^_" }],
      "no-console": "off",
      "no-control-regex": "off",
    },
  },
];
