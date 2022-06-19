require("@rushstack/eslint-patch/modern-module-resolution");

module.exports = {
  root: true,
  parser: "@typescript-eslint/parser",
  env: {
    node: true,
  },
  parserOptions: { ecmaVersion: "latest", sourceType: "module" },
  extends: [
    "eslint:recommended",
    "plugin:@typescript-eslint/recommended",
    "plugin:jest/recommended",
    "plugin:eslint-comments/recommended",
    "prettier",
  ],
  overrides: [
    {
      files: ["*.js"],
      rules: {
        "@typescript-eslint/no-var-requires": "off",
      },
    },
  ],
};
