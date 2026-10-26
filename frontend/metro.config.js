const { getDefaultConfig } = require("expo/metro-config");
const config = getDefaultConfig(__dirname);
config.resolver.blockList = [
  /[/\\]demo-server[/\\].*/,
  /[/\\]\.tmp[/\\].*/,
  /[/\\]\.tool-home[/\\].*/,
  /[/\\]\.npm-cache[/\\].*/,
];
module.exports = config;
