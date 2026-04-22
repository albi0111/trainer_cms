// ─────────────────────────────────────────────────────────────────────────────
// Root Navigator — Stack with Dashboard and Client screens
// ─────────────────────────────────────────────────────────────────────────────

import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import {
  createStackNavigator,
  StackNavigationProp,
} from '@react-navigation/stack';
import DashboardScreen from './screens/DashboardScreen';
import ClientScreen from './screens/ClientScreen';

// ── Route param types ────────────────────────────────────────────────────────

export type RootStackParamList = {
  Dashboard: undefined;
  Client: { clientId: string };
};

export type RootStackNavigationProp = StackNavigationProp<RootStackParamList>;

// ── Navigator ─────────────────────────────────────────────────────────────────

const Stack = createStackNavigator<RootStackParamList>();

export default function RootNavigator() {
  return (
    <NavigationContainer>
      <Stack.Navigator
        initialRouteName="Dashboard"
        screenOptions={{
          headerStyle: {
            backgroundColor: '#0A0A0A',
            elevation: 0,
            shadowOpacity: 0,
            borderBottomWidth: 1,
            borderBottomColor: '#161616',
          },
          headerTintColor: '#FFD700',
          headerTitleStyle: {
            fontWeight: '700',
            fontSize: 18,
          },
          cardStyle: { flex: 1, backgroundColor: '#0A0A0A' },
        }}
      >
        <Stack.Screen
          name="Dashboard"
          component={DashboardScreen}
          options={{ headerShown: false }}
        />
        <Stack.Screen
          name="Client"
          component={ClientScreen}
          options={{ headerShown: false }}
        />
      </Stack.Navigator>
    </NavigationContainer>
  );
}
