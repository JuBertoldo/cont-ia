import React, { useEffect } from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import AppNavigator from './src/navigation/AppNavigator';
import ErrorBoundary from './src/components/common/ErrorBoundary';
import { initSentry } from './src/config/sentryConfig';
import { startConnectivityListener } from './src/services/offlineScanQueueService';
import { processScan } from './src/services/scannerService';

export default function App(): React.JSX.Element {
  useEffect(() => {
    initSentry();
    // processScan é injetado em startConnectivityListener para evitar
    // dependência circular entre offlineScanQueueService ↔ scannerService
    const unsubscribe = startConnectivityListener(processScan);
    return unsubscribe;
  }, []);

  return (
    <ErrorBoundary>
      <GestureHandlerRootView style={{ flex: 1 }}>
        <SafeAreaProvider>
          <NavigationContainer>
            <AppNavigator />
          </NavigationContainer>
        </SafeAreaProvider>
      </GestureHandlerRootView>
    </ErrorBoundary>
  );
}
