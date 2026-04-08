import React, { useState } from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createStackNavigator } from '@react-navigation/stack';
import { useDeviceType } from '../../shared/hooks/useDeviceType';
import { MaterialCommunityIcons as Icon } from '@expo/vector-icons';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  SafeAreaView,
} from 'react-native';

import { ClientListScreen }   from '../../features/clients/screens/ClientListScreen';
import { ClientDetailScreen } from '../../features/clients/screens/ClientDetailScreen';

// ─── Param lists ──────────────────────────────────────────────────────────────

/**
 * Type-safe param list for the Client Stack.
 * ClientDetail requires clientId — TypeScript enforces this at every navigate() call.
 */
export type ClientStackParamList = {
  ClientList:   undefined;
  ClientDetail: { clientId: string };
};

// ─── Client Stack ─────────────────────────────────────────────────────────────

const ClientStack = createStackNavigator<ClientStackParamList>();

/**
 * Inner stack for the Clients tab.
 * ClientListScreen → (item press) → ClientDetailScreen
 * headerShown: false — each screen manages its own Appbar for full control.
 */
const ClientNavigator = () => (
  <ClientStack.Navigator screenOptions={{ headerShown: false }}>
    <ClientStack.Screen name="ClientList"   component={ClientListScreen} />
    <ClientStack.Screen name="ClientDetail" component={ClientDetailScreen} />
  </ClientStack.Navigator>
);

// ─── Placeholder screens ───────────────────────────────────────────────────────

const PlaceholderScreen = ({ name }: { name: string }) => (
  <View style={styles.placeholder}>
    <Text style={styles.placeholderText}>{name} Screen</Text>
  </View>
);

// ─── Screen definitions ───────────────────────────────────────────────────────

type ScreenKey = 'Clients' | 'Sessions' | 'Physical';

const SCREENS: Record<ScreenKey, { label: string; icon: string; component: React.ComponentType<any> }> = {
  Clients:  { label: 'Clients',          icon: 'account-group',    component: ClientNavigator },
  Sessions: { label: 'Sessions',         icon: 'calendar-clock',   component: () => <PlaceholderScreen name="Sessions" /> },
  Physical: { label: 'Physical Metrics', icon: 'chart-bell-curve', component: () => <PlaceholderScreen name="Physical Metrics" /> },
};

// ─── Mobile: Bottom Tab Layout ────────────────────────────────────────────────

const Tab = createBottomTabNavigator();

const MobileTabs = () => (
  <Tab.Navigator screenOptions={{ headerShown: false }}>
    {(Object.keys(SCREENS) as ScreenKey[]).map((key) => {
      const { label, icon, component } = SCREENS[key];
      return (
        <Tab.Screen
          key={key}
          name={`${key}Tab`}
          component={component}
          options={{
            tabBarLabel: label,
            tabBarIcon: ({ color, size }) => (
              <Icon name={icon as any} color={color} size={size} />
            ),
          }}
        />
      );
    })}
  </Tab.Navigator>
);

// ─── Tablet: View-based Sidebar ───────────────────────────────────────────────
// Pure React Native View layout — zero Reanimated/Drawer dependency.
// ClientNavigator is rendered as the active content component,
// preserving the full stack navigation (List → Detail) within the tablet layout.

const TabletSidebar = () => {
  const [activeScreen, setActiveScreen] = useState<ScreenKey>('Clients');
  const ActiveComponent = SCREENS[activeScreen].component;

  return (
    <SafeAreaView style={styles.tabletRoot}>
      {/* Sidebar */}
      <View style={styles.sidebar}>
        <Text style={styles.sidebarTitle}>Trainer CMS</Text>
        {(Object.keys(SCREENS) as ScreenKey[]).map((key) => {
          const { label, icon } = SCREENS[key];
          const isActive = activeScreen === key;
          return (
            <TouchableOpacity
              key={key}
              style={[styles.sidebarItem, isActive && styles.sidebarItemActive]}
              onPress={() => setActiveScreen(key)}
              activeOpacity={0.7}
            >
              <Icon
                name={icon as any}
                size={22}
                color={isActive ? '#6200ee' : '#555'}
                style={styles.sidebarIcon}
              />
              <Text style={[styles.sidebarLabel, isActive && styles.sidebarLabelActive]}>
                {label}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>

      {/* Main content — renders full ClientNavigator (stack) for Clients tab */}
      <View style={styles.tabletContent}>
        <ActiveComponent />
      </View>
    </SafeAreaView>
  );
};

// ─── Root Navigator ───────────────────────────────────────────────────────────

const RootStack = createStackNavigator();

export const AppNavigator = () => {
  const deviceType = useDeviceType();

  return (
    <RootStack.Navigator screenOptions={{ headerShown: false }}>
      <RootStack.Screen
        key={deviceType}
        name="Main"
        component={deviceType === 'tablet' ? TabletSidebar : MobileTabs}
      />
    </RootStack.Navigator>
  );
};

// ─── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  placeholder:        { flex: 1, justifyContent: 'center', alignItems: 'center' },
  placeholderText:    { fontSize: 18, color: '#555' },
  tabletRoot:         { flex: 1, flexDirection: 'row', backgroundColor: '#f4f4f8' },
  sidebar:            {
    width: 240,
    backgroundColor: '#ffffff',
    paddingTop: 24,
    paddingHorizontal: 12,
    borderRightWidth: 1,
    borderRightColor: '#e0e0e0',
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 2, height: 0 },
    shadowOpacity: 0.06,
    shadowRadius: 4,
  },
  sidebarTitle:       { fontSize: 16, fontWeight: '700', color: '#1a1a2e', marginBottom: 24, paddingLeft: 8, letterSpacing: 0.5 },
  sidebarItem:        { flexDirection: 'row', alignItems: 'center', paddingVertical: 12, paddingHorizontal: 8, borderRadius: 10, marginBottom: 4 },
  sidebarItemActive:  { backgroundColor: '#ede7f6' },
  sidebarIcon:        { marginRight: 12 },
  sidebarLabel:       { fontSize: 14, color: '#555', fontWeight: '500' },
  sidebarLabelActive: { color: '#6200ee', fontWeight: '700' },
  tabletContent:      { flex: 1 },
});
