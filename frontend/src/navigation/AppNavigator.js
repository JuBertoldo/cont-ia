import React from 'react';
import { createStackNavigator } from '@react-navigation/stack';

import AuthHome from '../screens/auth/AuthHome';
import ForgotScreen from '../screens/auth/ForgotScreen';
import RegisterScreen from '../screens/auth/RegisterScreen';
import PendingApprovalScreen from '../screens/auth/PendingApprovalScreen';
import PrivacyPolicyScreen from '../screens/legal/PrivacyPolicyScreen';
import SuperAdminScreen from '../screens/super_admin/SuperAdminScreen';
import CompanyDetailScreen from '../screens/super_admin/CompanyDetailScreen';
import TicketDetailScreen from '../screens/super_admin/TicketDetailScreen';
import SupportScreen from '../screens/support/SupportScreen';
import QuickGuideScreen from '../screens/guide/QuickGuideScreen';
import DrawerNavigator from './DrawerNavigator';
import { ROUTES } from '../constants/routes';

const Stack = createStackNavigator();

export default function AppNavigator() {
  return (
    <Stack.Navigator
      initialRouteName={ROUTES.AUTH_HOME}
      screenOptions={{ headerShown: false }}
    >
      <Stack.Screen name={ROUTES.AUTH_HOME} component={AuthHome} />
      <Stack.Screen name={ROUTES.REGISTER} component={RegisterScreen} />
      <Stack.Screen name={ROUTES.FORGOT} component={ForgotScreen} />
      <Stack.Screen
        name={ROUTES.PENDING_APPROVAL}
        component={PendingApprovalScreen}
      />
      <Stack.Screen
        name={ROUTES.PRIVACY_POLICY}
        component={PrivacyPolicyScreen}
      />
      <Stack.Screen
        name={ROUTES.SUPER_ADMIN_PANEL}
        component={SuperAdminScreen}
      />
      <Stack.Screen
        name={ROUTES.SUPER_ADMIN_COMPANY}
        component={CompanyDetailScreen}
      />
      <Stack.Screen
        name={ROUTES.SUPER_ADMIN_TICKET}
        component={TicketDetailScreen}
      />
      <Stack.Screen name={ROUTES.SUPPORT} component={SupportScreen} />
      <Stack.Screen name={ROUTES.QUICK_GUIDE} component={QuickGuideScreen} />
      <Stack.Screen name={ROUTES.APP_DRAWER} component={DrawerNavigator} />
    </Stack.Navigator>
  );
}
