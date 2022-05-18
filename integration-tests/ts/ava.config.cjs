require("util").inspect.defaultOptions.depth = 5; // Increase AVA's printing depth

module.exports = {
  timeout: "300000",
  files: ["**/*.ava.ts"],
  failWithoutAssertions: false,
  extensions: ["ts"],
  require: ["ts-node/register"],
};
