import React from 'react';
import { createStackNavigator } from '@react-navigation/stack';

import AuthHome from '../screens/auth/AuthHome';
import ForgotScreen from '../screens/auth/ForgotScreen';
import RegisterScreen from '../screens/auth/RegisterScreen';
import DrawerNavigator from './DrawerNavigator';

const Stack = createStackNavigator();

export default function AppNavigator() {
  return (
    <Stack.Navigator initialRouteName="AuthHome" screenOptions={{ headerShown: false }}>
      <Stack.Screen name="AuthHome" component={AuthHome} />
      <Stack.Screen name="Register" component={RegisterScreen} />
      <Stack.Screen name="Forgot" component={ForgotScreen} />
      <Stack.Screen name="AppDrawer" component={DrawerNavigator} />
    </Stack.Navigator>
  );
}