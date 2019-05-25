// ESLint config for MagicScript Apps
module.exports = {
    env: {
        "es6": true
    },
    globals: {
        // These globals are provided by the vm itself.
        "print": true,
        "globalThis": true,
        // The following globals are provided by `magic-script-polyfills`
        "setTimeout": true,
        "clearTimeout": true,
        "setInterval": true,
        "clearInterval": true,
        "setImmediate": true,
        "clearImmediate": true,
        "fetch": true,
        "Headers": true,
        "Request": true,
        "Response": true,
        "console": true,
    },
    parserOptions: {
        "ecmaVersion": 2018,
        "sourceType": "module"
    },
    plugins: ["prettier"],
    extends: ["prettier", "eslint:recommended"],
    rules: {
        "prettier/prettier": "error",
        "no-console": "off"
    }
};
