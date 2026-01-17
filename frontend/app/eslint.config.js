// https://docs.expo.dev/guides/using-eslint/
const { defineConfig } = require("eslint/config");
const expoConfig = require("eslint-config-expo/flat");

module.exports = defineConfig([
  expoConfig,
  {
    ignores: ["dist/*"],
    presets: ["module:@react-native/babel-preset"],
    plugins: [["react-native-worklets-core/plugin"]],
  },
]);
