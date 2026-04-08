import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { ActivityIndicator, StyleSheet, View } from 'react-native';
import { Appbar, Banner, FAB, Searchbar, Text, useTheme } from 'react-native-paper';
import { FlashList } from '@shopify/flash-list';
import { useClientStore } from '../../../store/useClientStore';
import { useDeviceType } from '../../../shared/hooks/useDeviceType';
import { Client } from '../types';

// ─── List item ───────────────────────────────────────────────────────────────

interface ClientItemProps {
  name: string;
  goal: string;
  status: Client['status'];
}

const ClientItem = React.memo(({ name, goal, status }: ClientItemProps) => (
  <View style={styles.item}>
    <Text variant="titleMedium">{name}</Text>
    <Text variant="bodySmall" style={styles.goalText}>{goal}</Text>
    <Text
      variant="labelSmall"
      style={[styles.statusText, { color: status === 'active' ? 'green' : 'gray' }]}
    >
      {status.toUpperCase()}
    </Text>
  </View>
));

// ─── Screen ──────────────────────────────────────────────────────────────────

const SEARCH_DEBOUNCE_MS = 300;

export const ClientListScreen = () => {
  const theme = useTheme();
  const deviceType = useDeviceType();

  const {
    clients,
    isLoading,
    error,
    subscribeClients,
    unsubscribeClients,
    clearError,
  } = useClientStore();

  const [rawQuery, setRawQuery] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const debounceTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  // ── Subscription lifecycle ────────────────────────────────────────────────
  useEffect(() => {
    subscribeClients();
    return () => {
      unsubscribeClients();
    };
  }, []);  // eslint-disable-line react-hooks/exhaustive-deps
  // subscribeClients/unsubscribeClients are stable store references — no need in deps

  // ── Debounced search ──────────────────────────────────────────────────────
  // Local-only filter. Designed so a remote search strategy can be added
  // in clientService.subscribeToClientSearch() without rewriting this screen.
  const onSearchChange = (text: string) => {
    setRawQuery(text);
    if (debounceTimer.current) clearTimeout(debounceTimer.current);
    debounceTimer.current = setTimeout(() => {
      setSearchQuery(text.trim().toLowerCase());
    }, SEARCH_DEBOUNCE_MS);
  };

  useEffect(() => {
    return () => {
      if (debounceTimer.current) clearTimeout(debounceTimer.current);
    };
  }, []);

  // ── Filtered list ─────────────────────────────────────────────────────────
  const displayedClients = useMemo(() => {
    if (!searchQuery) return clients;
    return clients.filter((c) => c.name.toLowerCase().includes(searchQuery));
  }, [clients, searchQuery]);

  // ── Memoized render ───────────────────────────────────────────────────────
  const renderItem = useCallback(
    ({ item }: { item: Client }) => (
      <ClientItem name={item.name} goal={item.goal} status={item.status} />
    ),
    []
  );

  const renderEmptyState = useCallback(
    () =>
      !isLoading ? (
        <Text style={styles.empty}>
          {searchQuery ? 'No clients match your search.' : 'No clients yet. Add one!'}
        </Text>
      ) : null,
    [isLoading, searchQuery]
  );

  // ── Render ────────────────────────────────────────────────────────────────
  return (
    <View style={styles.container}>
      <Appbar.Header elevated>
        <Appbar.Content title="My Clients" />
      </Appbar.Header>

      {/* Error banner — dismissible */}
      <Banner
        visible={!!error}
        actions={[{ label: 'Dismiss', onPress: clearError }]}
        icon="alert-circle-outline"
      >
        {error ?? ''}
      </Banner>

      <Searchbar
        placeholder="Search clients..."
        onChangeText={onSearchChange}
        value={rawQuery}
        style={styles.searchBar}
      />

      {/* Full-screen loading — only shown on the very first load */}
      {isLoading ? (
        <View style={styles.centered}>
          <ActivityIndicator size="large" color={theme.colors.primary} />
        </View>
      ) : (
        <View style={[styles.content, deviceType === 'tablet' && styles.tabletLayout]}>
          <View style={deviceType === 'tablet' ? styles.listPanel : styles.fullFlex}>
            <FlashList
              data={displayedClients}
              renderItem={renderItem}
              keyExtractor={(item) => item.id}
              ListEmptyComponent={renderEmptyState}
            />
          </View>

          {deviceType === 'tablet' && (
            <View style={styles.detailPanel}>
              <Text variant="displaySmall" style={styles.detailPlaceholder}>
                Select a client to see details
              </Text>
            </View>
          )}
        </View>
      )}

      <FAB
        icon="plus"
        style={[styles.fab, { backgroundColor: theme.colors.primary }]}
        onPress={() => console.log('Add client coming soon')}
      />
    </View>
  );
};

// ─── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  container: { flex: 1 },
  centered: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  searchBar: { margin: 16, borderRadius: 12 },
  content: { flex: 1 },
  tabletLayout: { flexDirection: 'row' },
  listPanel: { width: 350, borderRightWidth: 1, borderRightColor: '#eee' },
  fullFlex: { flex: 1 },
  detailPanel: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#f9f9f9' },
  detailPlaceholder: { opacity: 0.3 },
  item: { padding: 16, borderBottomWidth: 1, borderBottomColor: '#f0f0f0' },
  goalText: { opacity: 0.7 },
  statusText: {},
  empty: { textAlign: 'center', marginTop: 50, opacity: 0.5 },
  fab: { position: 'absolute', margin: 16, right: 0, bottom: 0 },
});
