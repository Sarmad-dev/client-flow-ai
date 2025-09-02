const { getDefaultConfig } = require('expo/metro-config');

const config = getDefaultConfig(__dirname);

// Simple configuration that should work for both platforms
config.resolver.platforms = ['ios', 'android', 'native', 'web'];

// Block react-native-maps on web
config.resolver.blockList = [/node_modules\/react-native-maps\/.*$/];

// Add resolver to handle web-specific cases
config.resolver.resolveRequest = (context, moduleName, platform) => {
  // Block react-native-maps on web
  if (platform === 'web' && moduleName.includes('react-native-maps')) {
    return {
      filePath: require.resolve('./components/WebMapComponents.tsx'),
      type: 'sourceFile',
    };
  }

  // Block the specific problematic import
  if (
    platform === 'web' &&
    moduleName === 'react-native/Libraries/Utilities/codegenNativeCommands'
  ) {
    return {
      filePath: require.resolve('./components/WebMapComponents.tsx'),
      type: 'sourceFile',
    };
  }

  // Let Metro handle the rest
  return context.resolveRequest(context, moduleName, platform);
};

module.exports = config;
