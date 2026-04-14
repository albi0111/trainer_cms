// ─────────────────────────────────────────────────────────────────────────────
// Sync Indicator Component
// Displays current sync health and status
// ─────────────────────────────────────────────────────────────────────────────

import React, { useEffect, useState } from 'react';
import { StyleSheet, Text, View, TouchableOpacity, ActivityIndicator } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { getDB } from '../services/db/database';
import { formatDistanceToNow } from 'date-fns';

export type SyncStatus = 'idle' | 'syncing' | 'error' | 'not_connected';

export default function SyncIndicator({ onTriggerSync }: { onTriggerSync: () => void }) {
  const [status, setStatus] = useState<SyncStatus>('idle');
  const [pendingCount, setPendingCount] = useState(0);
  const [lastSynced, setLastSynced] = useState<Date | null>(null);

  useEffect(() => {
    const timer = setInterval(async () => {
      const db = getDB();
      const count = await db.getFirstAsync<{ c: number }>("SELECT COUNT(*) as c FROM sync_queue WHERE status = 'pending'");
      const errorCount = await db.getFirstAsync<{ c: number }>("SELECT COUNT(*) as c FROM sync_queue WHERE status = 'failed' AND retry_count >= 3");
      
      // Fetch global meta for last sync timestamp
      const meta = await db.getFirstAsync<{ last_global_sync: string }>("SELECT last_global_sync FROM global_meta LIMIT 1");
      if (meta?.last_global_sync) {
        setLastSynced(new Date(meta.last_global_sync));
      }

      setPendingCount(count?.c || 0);
      if ((errorCount?.c || 0) > 0) setStatus('error');
      else if ((count?.c || 0) > 0) setStatus('syncing');
      else setStatus('idle');
    }, 5000);

    return () => clearInterval(timer);
  }, []);

  const timeString = lastSynced ? `Synced ${formatDistanceToNow(lastSynced)} ago` : 'Never synced';

  return (
    <View style={styles.container}>
      <View style={styles.topRow}>
        {status === 'idle' && (
          <View style={styles.statusGroup}>
            <Ionicons name="cloud-done" size={12} color="#66BB6A" />
            <Text style={styles.statusText}>Cloud Backup Active</Text>
          </View>
        )}
        {status === 'error' && (
          <View style={styles.statusGroup}>
            <Ionicons name="cloud-offline" size={12} color="#FF5252" />
            <Text style={styles.errorLabel}>Offline / Error</Text>
          </View>
        )}
        <Text style={styles.timeText}>{timeString}</Text>
      </View>

      {status === 'syncing' ? (
        <View style={styles.row}>
          <ActivityIndicator size="small" color="#FFD700" />
          <Text style={styles.text}>Syncing {pendingCount} changes...</Text>
        </View>
      ) : status === 'error' ? (
        <TouchableOpacity style={styles.errorRow} onPress={onTriggerSync}>
          <Ionicons name="refresh-circle" size={16} color="#FF5252" />
          <Text style={styles.errorText}>Retry Cloud Backup</Text>
        </TouchableOpacity>
      ) : (
        <TouchableOpacity style={styles.row} onPress={onTriggerSync}>
          <Ionicons name="sync" size={14} color="#555" />
          <Text style={styles.idleText}>Force Sync Now</Text>
        </TouchableOpacity>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { paddingVertical: 12, paddingHorizontal: 20, backgroundColor: '#111', borderBottomWidth: 1, borderBottomColor: '#222' },
  topRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 },
  statusGroup: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  statusText: { color: '#66BB6A', fontSize: 10, fontWeight: '700', textTransform: 'uppercase' },
  errorLabel: { color: '#FF5252', fontSize: 10, fontWeight: '700', textTransform: 'uppercase' },
  timeText: { color: '#444', fontSize: 10, fontWeight: '500' },
  row: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  errorRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  text: { color: '#888', fontSize: 12, fontWeight: '600' },
  errorText: { color: '#FF5252', fontSize: 12, fontWeight: '700' },
  idleText: { color: '#555', fontSize: 11, fontWeight: '500' },
});
