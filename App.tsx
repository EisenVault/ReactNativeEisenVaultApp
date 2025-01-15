// App.tsx

import React, { useState } from 'react';
import { Provider as PaperProvider } from 'react-native-paper';
import { Provider as ReduxProvider } from 'react-redux';
import { SafeAreaProvider } from 'react-native-safe-area-context'; // Add this import
import { store } from './src/store/store';
import { AppNavigator } from './src/navigation/AppNavigator';
import { LoginScreen } from './src/components/screens/LoginScreen';

/**
 * Root Application Component
 * Handles:
 * - Authentication state
 * - Provider wrapping (Redux, Paper, SafeArea)
 * - Conditional rendering of Login/Main app
 * 
 * @returns {React.ReactElement} The root application component
 */
export default function App() {
  // Track whether user is authenticated
  const [isAuthenticated, setIsAuthenticated] = useState(false);

  return (
    <SafeAreaProvider>
      <ReduxProvider store={store}>
        <PaperProvider>
          {isAuthenticated ? (
            // Show main app when authenticated
            <AppNavigator />
          ) : (
            // Show login screen when not authenticated
            <LoginScreen 
              onLoginSuccess={() => setIsAuthenticated(true)} 
            />
          )}
        </PaperProvider>
      </ReduxProvider>
    </SafeAreaProvider>
  );
}