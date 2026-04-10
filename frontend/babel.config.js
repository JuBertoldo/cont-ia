module.exports = {
  presets: ['module:@react-native/babel-preset'],
  plugins: [
    // react-native-reanimated DEVE ser o último plugin
    'react-native-reanimated/plugin',
  ],
};
