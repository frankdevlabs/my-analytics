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
  // Allow CommonJS require() in .cjs files and scripts (configuration/utility files)
  {
    files: ["**/*.cjs", "scripts/**/*.ts"],
    rules: {
      "@typescript-eslint/no-require-imports": "off",
    },
  },
  // Allow 'any' type in test files (common practice for mocking/assertions)
  {
    files: ["**/*.test.ts", "**/*.test.tsx", "**/__tests__/**/*.ts", "**/__tests__/**/*.tsx"],
    rules: {
      "@typescript-eslint/no-explicit-any": "off",
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
      "coverage/**",
      "public/**/*.js",  // Ignore built/minified tracker scripts
    ],
  },
];

export default eslintConfig;
