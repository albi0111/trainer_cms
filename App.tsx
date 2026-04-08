import 'react-native-gesture-handler';
import { StatusBar } from 'expo-status-bar';
import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { PaperProvider, MD3LightTheme as DefaultTheme } from 'react-native-paper';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { AppBootstrap } from './src/app/bootstrap/AppBootstrap';
import { AppNavigator } from './src/app/navigation/AppNavigator';

export default function App() {
  return (
    <SafeAreaProvider>
      <PaperProvider theme={DefaultTheme}>
        {/*
          AppBootstrap runs one-time async initialization (device ID)
          before rendering the navigator, preventing startup flicker.
        */}
        <AppBootstrap>
          {/*
            NavigationContainer lives here at the root — not inside AppNavigator —
            so deep linking, navigation persistence, and future auth routing
            can be controlled from one place.
          */}
          <NavigationContainer>
            <AppNavigator />
          </NavigationContainer>
        </AppBootstrap>
        <StatusBar style="auto" />
      </PaperProvider>
    </SafeAreaProvider>
  );
}
