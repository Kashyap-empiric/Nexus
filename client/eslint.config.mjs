import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  {
    rules: {
      "no-restricted-syntax": [
        "error",
        {
          selector: "JSXAttribute[name.name='className'] Literal[value=/(bg|text|border|ring)-(zinc|gray|slate|red|green|amber|blue|white|black)/]",
          message: "Direct color utilities are banned. Use semantic tokens (e.g., bg-background, text-presence-online)."
        },
        {
          selector: "JSXAttribute[name.name='className'] Literal[value=/dark:(bg|text|border|ring)/]",
          message: "Dark mode overrides are banned. Use semantic tokens that adapt to dark mode automatically."
        }
      ]
    }
  },
  // Override default ignores of eslint-config-next.
  globalIgnores([
    // Default ignores of eslint-config-next:
    ".next/**",
    "out/**",
    "build/**",
    "next-env.d.ts",
  ]),
]);

export default eslintConfig;
