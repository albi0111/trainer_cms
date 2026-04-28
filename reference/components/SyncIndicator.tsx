// ─────────────────────────────────────────────────────────────────────────────
// Sync Indicator Component
// Displays current sync health and status as a compact inline pill
// ─────────────────────────────────────────────────────────────────────────────

import React, { useEffect, useState } from 'react';
import { StyleSheet, TouchableOpacity, ActivityIndicator } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { getDB } from '../services/db/database';

export type SyncStatus = 'idle' | 'syncing' | 'error';

export default function SyncIndicator({ onTriggerSync }: { onTriggerSync: () => void }) {
  const [status, setStatus] = useState<SyncStatus>('idle');

  useEffect(() => {
    const timer = setInterval(async () => {
      try {
        const db = getDB();
        const count = await db.getFirstAsync<{ c: number }>("SELECT COUNT(*) as c FROM sync_queue WHERE status = 'pending'");
        const errorCount = await db.getFirstAsync<{ c: number }>("SELECT COUNT(*) as c FROM sync_queue WHERE status = 'failed' AND retry_count >= 3");
        
        if ((errorCount?.c || 0) > 0) setStatus('error');
        else if ((count?.c || 0) > 0) setStatus('syncing');
        else setStatus('idle');
      } catch (e) {
        console.error("Sync config error", e);
      }
    }, 5000);

    return () => clearInterval(timer);
  }, []);

  if (status === 'syncing') {
    return (
      <TouchableOpacity style={styles.container} onPress={onTriggerSync}>
        <ActivityIndicator size="small" color="#FFD700" />
      </TouchableOpacity>
    );
  }

  if (status === 'error') {
    return (
      <TouchableOpacity style={[styles.container, styles.errorBorder]} onPress={onTriggerSync}>
        <Ionicons name="cloud-offline" size={14} color="#FF5252" />
      </TouchableOpacity>
    );
  }

  return (
    <TouchableOpacity style={styles.container} onPress={onTriggerSync}>
      <Ionicons name="cloud-done" size={14} color="#4ade80" />
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  container: {
    padding: 6,
    borderRadius: 8,
    backgroundColor: '#1E1E1E',
    borderWidth: 1,
    borderColor: '#333',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: 12,
  },
  errorBorder: {
    borderColor: '#FF5252',
  }
});
