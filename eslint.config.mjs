import js from "@eslint/js";

const eslintConfig = [
  {
    ignores: [".next/**/*", "node_modules/**/*"],
  },
  js.configs.recommended,
];

export default eslintConfig;
