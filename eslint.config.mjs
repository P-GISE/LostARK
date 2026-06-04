import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";

const eslintConfig = [
  {
    ignores: [
      ".headroom-python/**",
      ".superpowers/**",
      ".next/**",
      "node_modules/**",
      "coverage/**",
    ],
  },
  ...nextVitals,
  ...nextTs,
];

export default eslintConfig;
