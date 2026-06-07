import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";

const eslintConfig = [
  {
    ignores: [
      ".headroom-python/**",
      ".superpowers/**",
      ".next/**",
      "node_modules/**",
      "디스코드 봇/**",
      "coverage/**",
      "output/**",
      "test-results/**",
      "playwright-report/**",
      "*.log",
    ],
  },
  ...nextVitals,
  ...nextTs,
];

export default eslintConfig;
