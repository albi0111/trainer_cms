import React, { useEffect, useState } from 'react';
import { ActivityIndicator, StyleSheet, View } from 'react-native';
import { getDeviceId } from '../../shared/utils/syncUtils';

interface AppBootstrapProps {
  children: React.ReactNode;
}

/**
 * AppBootstrap ensures required one-time async initialization is complete
 * before rendering the app UI.
 *
 * What it waits for:
 *   - getDeviceId(): initializes the persistent device identity in AsyncStorage.
 *     This is already used by all write operations (getCreatePayload, getUpdatePayload)
 *     and must be done before any Firestore mutation can be made.
 *
 * What it does NOT wait for (intentionally):
 *   - Firestore cache hydration — the live subscription provides cached data
 *     instantly once the screen mounts; blocking here would defeat offline-first goals.
 *   - Any auth state — auth is not yet implemented.
 *
 * Shows a centered spinner until initialization is complete.
 */
export const AppBootstrap = ({ children }: AppBootstrapProps) => {
  const [isReady, setIsReady] = useState(false);

  useEffect(() => {
    let cancelled = false;

    const initialize = async () => {
      // Ensure device ID is persisted before any writes happen
      await getDeviceId();
      if (!cancelled) setIsReady(true);
    };

    initialize();

    return () => {
      cancelled = true;
    };
  }, []);

  if (!isReady) {
    return (
      <View style={styles.splash}>
        <ActivityIndicator size="large" />
      </View>
    );
  }

  return <>{children}</>;
};

const styles = StyleSheet.create({
  splash: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
});
