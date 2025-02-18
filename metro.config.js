const { getDefaultConfig } = require('@expo/metro-config');

const defaultConfig = getDefaultConfig(__dirname);

module.exports = {
  resolver: {
    sourceExts: ['js', 'jsx', 'json', 'ts', 'tsx', 'cjs', 'mjs', 'web.js'],
  },
  // ... other options ...
};

defaultConfig.resolver.assetExts = [
  ...defaultConfig.resolver.assetExts,
  'pdf'
];

defaultConfig.resolver.resolverMainFields = ['browser', 'react-native', 'main'];

defaultConfig.transformer.getTransformOptions = async () => ({
  transform: {
    experimentalImportSupport: false,
    inlineRequires: true,
  },
});
module.exports = defaultConfig;