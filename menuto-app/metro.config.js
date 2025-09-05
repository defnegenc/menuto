const { getDefaultConfig } = require('expo/metro-config');

const config = getDefaultConfig(__dirname);

// Simple config to avoid file watching issues
config.watchFolders = [];
config.resolver.blockList = [
  /node_modules\/.*\/node_modules\/.*/,
  /.*\/__tests__\/.*/,
];

// Basic resolver settings
config.resolver.platforms = ['ios', 'android', 'native', 'web'];

module.exports = config;
