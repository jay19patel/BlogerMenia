import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  globalIgnores([
    // Default ignores of eslint-config-next:
    ".next/**",
    "out/**",
    "build/**",
    "next-env.d.ts",

    // Untitled UI React source, added by `npx untitledui@latest add <component>`
    // and re-written by it on every update. It is vendored, not authored here,
    // so linting it would only produce findings we must not fix in place.
    "components/base/**",
    "components/foundations/**",
    "components/application/**",
    "utils/**",
    "hooks/use-resize-observer.ts",
  ]),
]);

export default eslintConfig;
