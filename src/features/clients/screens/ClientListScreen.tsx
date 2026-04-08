import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, View } from 'react-native';
import { Appbar, Banner, FAB, Searchbar, Text, useTheme } from 'react-native-paper';
import { FlashList } from '@shopify/flash-list';
import { StackNavigationProp } from '@react-navigation/stack';
import { useNavigation } from '@react-navigation/native';
import { useClientStore } from '../../../store/useClientStore';
import { useDeviceType } from '../../../shared/hooks/useDeviceType';
import { ClientWithProfile, ClientDisplayStatus } from '../types';
import { ClientFormModal } from '../components/ClientFormModal';
import { ClientStackParamList } from '../../../app/navigation/AppNavigator';

// ─── Types ────────────────────────────────────────────────────────────────────

type ListNav = StackNavigationProp<ClientStackParamList, 'ClientList'>;

// ─── Status colour helper ─────────────────────────────────────────────────────

const STATUS_COLORS: Record<ClientDisplayStatus, string> = {
  incomplete: '#f59e0b',
  active:     '#10b981',
  inactive:   '#9ca3af',
};

// ─── List item ────────────────────────────────────────────────────────────────

interface ClientItemProps {
  client: ClientWithProfile;
  onPress: () => void;
}

const ClientItem = React.memo(({ client, onPress }: ClientItemProps) => {
  // Derive display status — measurements count is unknown at list level,
  // so we use 0 as a conservative default. Detail screen has the full derivation.
  // For the list we use stored status to distinguish inactive; otherwise we
  // show 'active' (measurements are not loaded in the list subscription).
  const displayStatus: ClientDisplayStatus =
    client.status === 'inactive' ? 'inactive' : 'active';

  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [styles.item, pressed && styles.itemPressed]}
      android_ripple={{ color: '#f0f0f0' }}
    >
      <View style={styles.itemContent}>
        <Text variant="titleMedium" style={styles.itemName}>{client.name}</Text>
        {client.goal ? (
          <Text variant="bodySmall" style={styles.goalText} numberOfLines={1}>
            {client.goal}
          </Text>
        ) : null}
      </View>
      <Text
        variant="labelSmall"
        style={[styles.statusText, { color: STATUS_COLORS[displayStatus] }]}
      >
        {displayStatus.toUpperCase()}
      </Text>
    </Pressable>
  );
});

// ─── Screen ───────────────────────────────────────────────────────────────────

const SEARCH_DEBOUNCE_MS = 300;

export const ClientListScreen = () => {
  const theme       = useTheme();
  const navigation  = useNavigation<ListNav>();
  const deviceType  = useDeviceType();

  const { clients, isLoading, error, subscribeClients, unsubscribeClients, clearError } =
    useClientStore();

  const [rawQuery,     setRawQuery]     = useState('');
  const [searchQuery,  setSearchQuery]  = useState('');
  const [modalVisible, setModalVisible] = useState(false);
  const debounceTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  // ── Subscription lifecycle ──────────────────────────────────────────────────
  useEffect(() => {
    subscribeClients();
    return () => unsubscribeClients();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // ── Debounced search ────────────────────────────────────────────────────────
  const onSearchChange = (text: string) => {
    setRawQuery(text);
    if (debounceTimer.current) clearTimeout(debounceTimer.current);
    debounceTimer.current = setTimeout(
      () => setSearchQuery(text.trim().toLowerCase()),
      SEARCH_DEBOUNCE_MS
    );
  };

  useEffect(() => () => {
    if (debounceTimer.current) clearTimeout(debounceTimer.current);
  }, []);

  // ── Filtered list ───────────────────────────────────────────────────────────
  const displayedClients = useMemo(() => {
    if (!searchQuery) return clients;
    return clients.filter((c) => c.name.toLowerCase().includes(searchQuery));
  }, [clients, searchQuery]);

  // ── Render helpers ──────────────────────────────────────────────────────────
  const renderItem = useCallback(
    ({ item }: { item: ClientWithProfile }) => (
      <ClientItem
        client={item}
        onPress={() => navigation.navigate('ClientDetail', { clientId: item.id })}
      />
    ),
    [navigation]
  );

  const renderEmptyState = useCallback(
    () =>
      !isLoading ? (
        <Text style={styles.empty}>
          {searchQuery ? 'No clients match your search.' : 'No clients yet. Tap + to add one.'}
        </Text>
      ) : null,
    [isLoading, searchQuery]
  );

  // ── Render ──────────────────────────────────────────────────────────────────
  return (
    <View style={styles.container}>
      <Appbar.Header elevated>
        <Appbar.Content title="My Clients" />
      </Appbar.Header>

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
                Select a client
              </Text>
            </View>
          )}
        </View>
      )}

      {/* Quick create modal */}
      <ClientFormModal
        visible={modalVisible}
        onDismiss={() => setModalVisible(false)}
        client={null}
      />

      <FAB
        icon="plus"
        style={[styles.fab, { backgroundColor: theme.colors.primary }]}
        onPress={() => setModalVisible(true)}
      />
    </View>
  );
};

// ─── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  container:        { flex: 1 },
  centered:         { flex: 1, justifyContent: 'center', alignItems: 'center' },
  searchBar:        { margin: 16, borderRadius: 12 },
  content:          { flex: 1 },
  tabletLayout:     { flexDirection: 'row' },
  listPanel:        { width: 350, borderRightWidth: 1, borderRightColor: '#eee' },
  fullFlex:         { flex: 1 },
  detailPanel:      { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#f9f9f9' },
  detailPlaceholder:{ opacity: 0.25 },
  item:             { paddingHorizontal: 16, paddingVertical: 14, flexDirection: 'row', alignItems: 'center', borderBottomWidth: 1, borderBottomColor: '#f0f0f0' },
  itemPressed:      { backgroundColor: '#fafafa' },
  itemContent:      { flex: 1 },
  itemName:         { fontWeight: '600' },
  goalText:         { opacity: 0.6, marginTop: 2 },
  statusText:       { fontSize: 11, fontWeight: '700', marginLeft: 8 },
  empty:            { textAlign: 'center', marginTop: 50, opacity: 0.45 },
  fab:              { position: 'absolute', margin: 16, right: 0, bottom: 0 },
});
