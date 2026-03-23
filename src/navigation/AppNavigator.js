import React from 'react';
import { createStackNavigator } from '@react-navigation/stack';

// IMPORTAÇÕES DOS CAMINHOS
import AuthHome from '../screens/login/AuthHome';
import RegisterScreen from '../screens/home/RegisterScreen'
import ForgotScreen from '../screens/login/ForgotScreen';
import HomeScreen from '../screens/home/HomeScreen';
import ScannerScreen from '../screens/inventory/ScannerScreen';
import HistoryScreen from '../screens/inventory/HistoryScreen';

const Stack = createStackNavigator();

export default function AppNavigator() {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      {/* Fluxo de Autenticação */}
      <Stack.Screen name="AuthHome" component={AuthHome} />
      <Stack.Screen name="Register" component={RegisterScreen} />
      <Stack.Screen name="Forgot" component={ForgotScreen} />

      {/* Tela Principal (Dinâmico - Admin&User) */}
      <Stack.Screen name="Home" component={HomeScreen} />
      
      {/* Tela de Inventário */}
      <Stack.Screen name="Scanner" component={ScannerScreen} />
      <Stack.Screen name="History" component={HistoryScreen} />
    </Stack.Navigator>
  );
}