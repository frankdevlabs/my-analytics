// ESLint Flat Config for Next.js 16 with ESLint 9.x
// Native flat config format (no FlatCompat) to avoid circular reference errors
// See: https://github.com/vercel/next.js/issues/85244
import nextCoreWebVitals from "eslint-config-next/core-web-vitals";
import nextTypescript from "eslint-config-next/typescript";

const eslintConfig = [
  // Extend Next.js core web vitals config (native flat format)
  ...nextCoreWebVitals,
  // Extend Next.js TypeScript config (native flat format)
  ...nextTypescript,
  // Allow CommonJS require() in .cjs files (configuration files)
  {
    files: ["**/*.cjs"],
    rules: {
      "@typescript-eslint/no-require-imports": "off",
    },
  },
  // Ignore patterns for build artifacts and generated files
  {
    ignores: [
      "node_modules/**",
      ".next/**",
      "out/**",
      "build/**",
      "next-env.d.ts",
    ],
  },
];

export default eslintConfig;
