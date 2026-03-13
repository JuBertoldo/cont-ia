import React from 'react';
import { createStackNavigator } from '@react-navigation/stack';

// Importando todas as telas do jeito certo!
import LoginScreen from '../screens/LoginScreen';
import HomeScreen from '../screens/HomeScreen';
import ScannerScreen from '../screens/ScannerScreen';
import HistoryScreen from '../screens/HistoryScreen';

const Stack = createStackNavigator();

export default function AppNavigator() {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen name="Login" component={LoginScreen} />
      <Stack.Screen name="Home" component={HomeScreen} />
      <Stack.Screen name="Scanner" component={ScannerScreen} />
      <Stack.Screen 
        name="History" 
        component={HistoryScreen} 
        options={{ headerShown: true, title: 'Meu Histórico' }} 
      />
    </Stack.Navigator>
  );
}