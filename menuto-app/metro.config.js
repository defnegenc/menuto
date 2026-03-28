const { getDefaultConfig } = require('expo/metro-config');

const config = getDefaultConfig(__dirname);

// Don't block nested node_modules — it prevents polyfills from resolving
config.watchFolders = [];
config.resolver.platforms = ['ios', 'android', 'native', 'web'];

module.exports = config;
