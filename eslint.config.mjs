import globals from "globals";

export default [
    {
        ignores: [".vscode-test/**", "node_modules/**", ".git/**", "dist/**", "out/**", "test_files/**"],
    },
    {

    files: ["**/*.js"],
    languageOptions: {
        globals: {
            ...globals.commonjs,
            ...globals.node,
            ...globals.mocha,
        },

        ecmaVersion: 2022,
        sourceType: "module",
    },

    rules: {
        "no-const-assign": "warn",
        "no-this-before-super": "warn",
        "no-undef": "warn",
        "no-unreachable": "warn",
        "no-unused-vars": ["warn", { "argsIgnorePattern": "^_", "varsIgnorePattern": "^_" }],
        "constructor-super": "warn",
        "valid-typeof": "warn",
    },
}];