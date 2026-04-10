import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { 
  Pressable, 
  StyleSheet, 
  View, 
  FlatList,
  TextInput,
  useWindowDimensions
} from 'react-native';
import { useNavigation, useIsFocused } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import { MaterialCommunityIcons as Icon } from '@expo/vector-icons';

import { ClientCard } from '../components/ClientCard';

import { useAppTheme, useAppStyle } from '../../../theme/ThemeContext';
import { AppTheme } from '../../../theme';
import { ScreenContainer } from '../../../shared/components/layout/ScreenContainer';
import { ThemeText } from '../../../shared/components/ThemeText';
import { LoadingState } from '../../../shared/components/feedback/LoadingState';
import { EmptyState } from '../../../shared/components/feedback/EmptyState';
import { ErrorState } from '../../../shared/components/feedback/ErrorState';

import { useClientStore } from '../../../store/useClientStore';
import { ClientWithProfile, ClientDisplayStatus } from '../types';
import { ClientStackParamList } from '../../../app/navigation/AppNavigator';

// ─── Types ────────────────────────────────────────────────────────────────────

type ListNav = StackNavigationProp<ClientStackParamList, 'ClientList'>;



// ─── Screen ───────────────────────────────────────────────────────────────────

const SEARCH_DEBOUNCE_MS = 300;

export const ClientListScreen = () => {
  const theme = useAppTheme();
  const navigation = useNavigation<ListNav>();
  const isFocused = useIsFocused();

  const { 
    clients, 
    isInitialLoading, 
    isSyncing,
    isOnline,
    error, 
    subscribeClients, 
    unsubscribeClients,
    setSelectedClient 
  } = useClientStore();

  const { width } = useWindowDimensions();
  const isTablet = width >= 768;
  const isLandscape = width > 1000;
  // Calculate columns based on layout for iPad
  const numColumns = isTablet ? (isLandscape ? 3 : 2) : 1;

  const [rawQuery, setRawQuery] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const debounceTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Clear selection when looking at the list (Hides sidebar on tablet)
  useEffect(() => {
    if (isFocused) {
      setSelectedClient(null);
    }
  }, [isFocused, setSelectedClient]);

  useEffect(() => {
    subscribeClients();
    return () => unsubscribeClients();
  }, [subscribeClients, unsubscribeClients]);

  const onSearchChange = (text: string) => {
    setRawQuery(text);
    if (debounceTimer.current) clearTimeout(debounceTimer.current);
    debounceTimer.current = setTimeout(
      () => setSearchQuery(text.trim().toLowerCase()),
      SEARCH_DEBOUNCE_MS
    );
  };

  const displayedClients = useMemo(() => {
    if (!searchQuery) return clients;
    return clients.filter((c) => c.name.toLowerCase().includes(searchQuery));
  }, [clients, searchQuery]);

  const styles = useAppStyle((t: AppTheme) => StyleSheet.create({
    header: {
      paddingVertical: t.spacing.xl,
    },
    title: {
      fontSize: 32,
      fontWeight: '900',
      textTransform: 'uppercase',
      letterSpacing: 1.5,
    },
    searchContainer: {
      backgroundColor: t.colors.surface,
      borderRadius: 16,
      paddingHorizontal: t.spacing.md,
      height: 54,
      flexDirection: 'row',
      alignItems: 'center',
      marginBottom: t.spacing.lg,
      borderWidth: 1,
      borderColor: t.colors.border,
    },
    searchIcon: {
      marginRight: t.spacing.sm,
    },
    searchInput: {
      flex: 1,
      ...t.typography.body1,
      color: t.colors.textPrimary,
    },
    list: {
      flex: 1,
    },
    listContent: {
      paddingBottom: 100, // Space for FAB
    },
    columnWrapper: {
      justifyContent: 'flex-start',
      gap: t.spacing.md,
      marginBottom: t.spacing.md,
    },
    gridItem: {
      flex: 1,
      maxWidth: numColumns > 1 ? `${100 / numColumns - 2}%` : '100%',
      marginBottom: numColumns === 1 ? t.spacing.md : 0,
    },
    fab: {
      position: 'absolute',
      bottom: 24,
      right: 24,
      width: 64,
      height: 64,
      borderRadius: 32,
      backgroundColor: t.colors.primary,
      justifyContent: 'center',
      alignItems: 'center',
      elevation: 8,
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.3,
      shadowRadius: 8,
    }
  }));

  const renderItem = useCallback(
    ({ item }: { item: ClientWithProfile }) => (
      <View style={styles.gridItem}>
        <ClientCard
          client={item}
          onPress={() => {
            setSelectedClient(item);
            navigation.navigate('ClientDetail', { clientId: item.id });
          }}
        />
      </View>
    ),
    [navigation, setSelectedClient, styles.gridItem]
  );

  return (
    <ScreenContainer>
      <View style={styles.header}>
        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
          <ThemeText style={styles.title}>fit.persona</ThemeText>
          {isSyncing && (
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
              <Icon name="cloud-sync" size={18} color={theme.colors.primary} />
              <ThemeText level="caption" color="primary">SYNCING</ThemeText>
            </View>
          )}
        </View>
      </View>

      <View style={styles.searchContainer}>
        <Icon name="magnify" size={24} color={theme.colors.textSecondary} style={styles.searchIcon} />
        <TextInput
          placeholder="Search clients..."
          placeholderTextColor={theme.colors.textSecondary}
          onChangeText={onSearchChange}
          value={rawQuery}
          style={styles.searchInput}
        />
      </View>

      {isInitialLoading && clients.length === 0 ? (
        <LoadingState variant="skeleton" skeletonCount={5} />
      ) : error ? (
        <ErrorState message={error} onRetry={subscribeClients} />
      ) : (
        <FlatList
          key={`grid-${numColumns}`} // Forces re-render when columns change
          data={displayedClients}
          renderItem={renderItem}
          keyExtractor={(item) => item.client_uuid || item.id}
          numColumns={numColumns}
          style={styles.list}
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
          columnWrapperStyle={numColumns > 1 ? styles.columnWrapper : undefined}
          ListEmptyComponent={
            <EmptyState 
              title={searchQuery ? "No results" : "No clients yet"} 
              message={searchQuery ? "Try a different search term" : "Tap + to add your first client"}
              icon={searchQuery ? "account-search-outline" : "account-plus-outline"}
              actionLabel={searchQuery ? undefined : "Add Client"}
              onAction={() => navigation.navigate('CreateClient')}
            />
          }
        />
      )}

      <Pressable 
        style={styles.fab} 
        onPress={() => navigation.navigate('CreateClient')}
      >
        <Icon name="plus" size={32} color={theme.colors.background} />
      </Pressable>
    </ScreenContainer>
  );
};
