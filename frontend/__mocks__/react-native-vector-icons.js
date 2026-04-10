const React = require('react');
const { Text } = require('react-native');

// Mock genérico: renderiza como <Text> para evitar crash nos testes
const Icon = ({ name, ...props }) => React.createElement(Text, props, name);

module.exports = Icon;
module.exports.default = Icon;
