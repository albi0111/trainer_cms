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
import { CreateClientScreen } from '../../features/clients/screens/CreateClientScreen';
import { useClientStore } from '../../store/useClientStore';
import { useAppTheme } from '../../theme/ThemeContext';

// ─── Param lists ──────────────────────────────────────────────────────────────

export type ClientStackParamList = {
  ClientList:   undefined;
  ClientDetail: { clientId: string };
  CreateClient: undefined;
};

// ─── Client Stack ─────────────────────────────────────────────────────────────

const ClientStack = createStackNavigator<ClientStackParamList>();

const ClientNavigator = () => (
  <ClientStack.Navigator screenOptions={{ headerShown: false }}>
    <ClientStack.Screen name="ClientList"   component={ClientListScreen} />
    <ClientStack.Screen name="ClientDetail" component={ClientDetailScreen} />
    <ClientStack.Screen name="CreateClient" component={CreateClientScreen} />
  </ClientStack.Navigator>
);

// ─── Placeholder screens ───────────────────────────────────────────────────────

const PlaceholderScreen = ({ name }: { name: string }) => {
  const theme = useAppTheme();
  return (
    <View style={[styles.placeholder, { backgroundColor: theme.colors.background }]}>
      <Text style={[styles.placeholderText, { color: theme.colors.textSecondary }]}>{name} Screen</Text>
    </View>
  );
};

// ─── Screen definitions ───────────────────────────────────────────────────────

type ScreenKey = 'Clients' | 'Sessions' | 'Physical';

const SessionsScreen = () => <PlaceholderScreen name="Sessions" />;
const PhysicalScreen = () => <PlaceholderScreen name="Physical Metrics" />;

const SCREENS: Record<ScreenKey, { label: string; icon: string; component: React.ComponentType<any> }> = {
  Clients:  { label: 'Clients',          icon: 'account-group',    component: ClientNavigator },
  Sessions: { label: 'Sessions',         icon: 'calendar-clock',   component: SessionsScreen },
  Physical: { label: 'Physical Metrics', icon: 'chart-bell-curve', component: PhysicalScreen },
};

// ─── Mobile: Bottom Tab Layout ────────────────────────────────────────────────

const Tab = createBottomTabNavigator();

const MobileTabs = () => {
  const selectedClient = useClientStore(s => s.selectedClient);
  const theme = useAppTheme();
  const showTabs = !!selectedClient;

  return (
    <Tab.Navigator 
      screenOptions={{ 
        headerShown: false,
        tabBarStyle: { 
          display: showTabs ? 'flex' : 'none', 
          borderTopWidth: 0, 
          elevation: 0,
          backgroundColor: theme.colors.surface
        },
        tabBarActiveTintColor: theme.colors.primary,
        tabBarInactiveTintColor: theme.colors.textSecondary,
      }}
    >
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
};

// ─── Tablet: Contextual Sidebar ───────────────────────────────────────────────

const TabletSidebar = () => {
  const theme = useAppTheme();
  const selectedClient = useClientStore(s => s.selectedClient);
  const [activeScreen, setActiveScreen] = useState<ScreenKey>('Clients');
  
  // Show sidebar ONLY after selecting a client
  const showSidebar = !!selectedClient;
  const ActiveComponent = SCREENS[activeScreen].component;

  if (!showSidebar) {
    return (
      <SafeAreaView style={[styles.tabletRoot, { backgroundColor: theme.colors.background }]}>
        <View style={styles.tabletContent}>
          <ClientNavigator />
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={[styles.tabletRoot, { backgroundColor: theme.colors.background }]}>
      {/* Sidebar */}
      <View style={[styles.sidebar, { backgroundColor: theme.colors.surface, borderRightColor: theme.colors.border }]}>
        <Text style={[styles.sidebarTitle, { color: theme.colors.primary }]}>fit.persona</Text>
        {(Object.keys(SCREENS) as ScreenKey[]).map((key) => {
          const { label, icon } = SCREENS[key];
          const isActive = activeScreen === key;
          return (
            <TouchableOpacity
              key={key}
              style={[
                styles.sidebarItem, 
                isActive && { backgroundColor: theme.colors.surfaceElevated }
              ]}
              onPress={() => setActiveScreen(key)}
              activeOpacity={0.7}
            >
              <Icon
                name={icon as any}
                size={22}
                color={isActive ? theme.colors.primary : theme.colors.textSecondary}
                style={styles.sidebarIcon}
              />
              <Text style={[
                styles.sidebarLabel, 
                { color: theme.colors.textPrimary },
                isActive && { fontWeight: '700', color: theme.colors.primary }
              ]}>
                {label}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>

      {/* Main content */}
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
  placeholderText:    { fontSize: 18 },
  tabletRoot:         { flex: 1, flexDirection: 'row' },
  sidebar:            {
    width: 280, // More comfortable native iPad sidebar width
    paddingTop: 32,
    paddingHorizontal: 16,
    borderRightWidth: 1,
    elevation: 0, // Native Apple sidebars usually don't have deep shadows, just border
  },
  sidebarTitle:       { fontSize: 24, fontWeight: '900', textTransform: 'uppercase', marginBottom: 40, paddingLeft: 8, letterSpacing: 1.5 },
  sidebarItem:        { flexDirection: 'row', alignItems: 'center', paddingVertical: 14, paddingHorizontal: 14, borderRadius: 14, marginBottom: 6 },
  sidebarIcon:        { marginRight: 16 },
  sidebarLabel:       { fontSize: 16, fontWeight: '600' },
  tabletContent:      { flex: 1 },
});
