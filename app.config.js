export default {
  expo: {
    name: 'NexaSuit',
    slug: 'nexasuit',
    version: '1.0.0',
    orientation: 'portrait',
    icon: './assets/images/app-icon.png',
    scheme: 'nexasuit',
    userInterfaceStyle: 'automatic',
    deepLinking: {
      enabled: true,
      prefixes: ['nexasuit://', 'https://nexasuit.app'],
      paths: {
        emails: '(tabs)/emails',
        'emails/inbox': '(tabs)/emails-inbox',
        'emails/analytics': '(tabs)/emails-analytics',
        'emails/drafts': '(tabs)/email-drafts',
        'emails/signatures': '(tabs)/email-signatures',
        'emails/templates': '(tabs)/templates',
        'emails/sequences': '(tabs)/email-sequences',
        'emails/sequences/analytics': '(tabs)/email-sequence-analytics',
        'emails/deliverability': '(tabs)/email-deliverability',
        'emails/suppression': '(tabs)/email-suppression',
        'emails/search': '(tabs)/emails-search',
      },
    },
    newArchEnabled: true,
    jsEngine: 'hermes',
    ios: {
      supportsTablet: true,
    },
    web: {
      bundler: 'metro',
      output: 'single',
      favicon: './assets/images/favicon.png',
    },
    plugins: [
      '@react-native-google-signin/google-signin',
      'expo-router',
      'expo-font',
      'expo-web-browser',
      [
        'expo-build-properties',
        {
          android: {
            kotlinVersion: '2.0.21',
            gradlePluginVersion: 'com.android.tools.build:gradle:8.3.2',
            compileSdkVersion: 35,
            targetSdkVersion: 35,
          },
        },
      ],
    ],
    extra: {
      EXPO_PUBLIC_GOOGLE_CLIENT_ID: process.env.EXPO_PUBLIC_GOOGLE_CLIENT_ID,
      router: {},
      eas: {
        projectId: '1052317b-791f-4646-84ef-d76e39aac2aa',
      },
    },
    experiments: {
      typedRoutes: true,
    },
    owner: 'sarmadjkl',
    android: {
      package: 'com.sarmadkhan2694.nexasuit',
      config: {
        googleMaps: {
          apiKey: process.env.EXPO_PUBLIC_GOOGLE_PLACES_API_KEY,
        },
      },
    },
  },
};
