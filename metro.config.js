const path = require("path");
const { getDefaultConfig } = require("expo/metro-config");
const { withNativeWind } = require("nativewind/metro");

const config = getDefaultConfig(__dirname);

const nativeWindConfig = withNativeWind(config, {
  input: path.resolve(__dirname, "global.css"),
});

// Fix: NativeWind's transformer injects `output` into a require() template literal,
// but Windows backslashes (\n, \U, etc.) are treated as escape sequences.
// Normalize to forward slashes so the path survives string interpolation.
if (nativeWindConfig.transformer?.nativewind?.output) {
  nativeWindConfig.transformer.nativewind.output =
    nativeWindConfig.transformer.nativewind.output.replace(/\\/g, "/");
}
if (nativeWindConfig.transformer?.nativewind?.input) {
  nativeWindConfig.transformer.nativewind.input =
    nativeWindConfig.transformer.nativewind.input.replace(/\\/g, "/");
}

module.exports = nativeWindConfig;
