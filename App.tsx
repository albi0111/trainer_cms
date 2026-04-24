import 'react-native-gesture-handler';
import React, { useEffect, useState, useCallback } from 'react';
import { View, Text, StyleSheet, ActivityIndicator, TouchableOpacity } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { Ionicons } from '@expo/vector-icons';
import { initDatabase } from './src/services/db/database';
import RootNavigator from './src/app/RootNavigator';
import { requestNotificationPermissions } from './src/services/notification/notificationService';

export default function App() {
  const [dbReady, setDbReady] = useState(false);
  const [dbError, setDbError] = useState<string | null>(null);

  const startDb = useCallback(async () => {
    try {
      setDbError(null);
      await initDatabase();
      await requestNotificationPermissions();
      setDbReady(true);
    } catch (err) {
      console.error('[App] Database init failed:', err);
      setDbError(String(err));
    }
  }, []);

  useEffect(() => {
    startDb();
  }, [startDb]);

  if (dbError) {
    const isLockError = dbError.includes('createSyncAccessHandle');
    
    return (
      <View style={styles.center}>
        <Ionicons name="alert-circle" size={48} color="#FF5252" style={{ marginBottom: 16 }} />
        <Text style={styles.errorText}>
          {isLockError ? "Database locked by another tab" : "Failed to initialize database"}
        </Text>
        <Text style={styles.errorDetail}>
          {isLockError 
            ? "Browsers only allow one tab to access the data at a time. Please close other tabs of this dashboard and try again."
            : dbError}
        </Text>
        
        <TouchableOpacity style={styles.retryBtn} onPress={startDb}>
          <Text style={styles.retryBtnText}>Retry Connection</Text>
        </TouchableOpacity>
      </View>
    );
  }

  if (!dbReady) {
    return (
      <View style={styles.center}>
        <ActivityIndicator color="#FFD700" size="large" />
        <Text style={[styles.errorDetail, { marginTop: 16 }]}>Booting FIT.PERSONA engine...</Text>
      </View>
    );
  }

  return (
    <SafeAreaProvider style={styles.flex1}>
      <StatusBar style="light" />
      <RootNavigator />
    </SafeAreaProvider>
  );
}

const styles = StyleSheet.create({
  flex1: { flex: 1 },
  center: {
    flex: 1,
    backgroundColor: '#0A0A0A',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 32,
  },
  errorText: {
    color: '#FFF',
    fontSize: 20,
    fontWeight: '800',
    textAlign: 'center',
  },
  errorDetail: {
    color: '#888',
    fontSize: 14,
    marginTop: 12,
    textAlign: 'center',
    lineHeight: 20,
  },
  retryBtn: {
    marginTop: 32,
    backgroundColor: '#FFD700',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 12,
  },
  retryBtnText: {
    color: '#000',
    fontWeight: '800',
    fontSize: 15,
  },
});
