const { getDefaultConfig } = require('expo/metro-config');

const config = getDefaultConfig(__dirname);

config.resolver.assetExts.push(
  // Adicionando as extensões que a Inteligência Artificial usa
  'bin',
  'txt',
  'jpg',
  'png',
  'json',
  'tflite'
);

module.exports = config;