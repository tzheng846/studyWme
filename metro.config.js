const { getDefaultConfig } = require('expo/metro-config');

const config = getDefaultConfig(__dirname);

// Add support for .cjs files (required for Firebase)
config.resolver.sourceExts.push('cjs');

module.exports = config;
