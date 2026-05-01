import { useEffect, useState } from 'react';
import './SettingsScreen.css';

import TopNavBar from '../components/layout/TopNavBar';
import PageWrapper from '../components/layout/PageWrapper';
import Card from '../components/ui/Card';
import Button from '../components/ui/Button';
import DriveConnectAlert from '../components/sync/DriveConnectAlert';
import SyncIndicator from '../components/sync/SyncIndicator';
import { useAppStore } from '../store/useAppStore';

export default function SettingsScreen() {
  const isConnectedToDrive = useAppStore((state) => state.isConnectedToDrive);
  const pendingSyncCount = useAppStore((state) => state.pendingSyncCount);
  const lastSyncedAt = useAppStore((state) => state.lastSyncedAt);
  const lastSyncError = useAppStore((state) => state.lastSyncError);
  const disconnectDrive = useAppStore((state) => state.disconnectDrive);
  const refreshSyncState = useAppStore((state) => state.refreshSyncState);
  const runSync = useAppStore((state) => state.runSync);
  const [isDrivePromptOpen, setIsDrivePromptOpen] = useState(false);

  useEffect(() => {
    void refreshSyncState();
  }, [refreshSyncState]);

  return (
    <div className="settings-page">
      <TopNavBar showLogo showBack />

      <PageWrapper>
        <div className="settings-content">
          <h1 className="settings-title">Settings</h1>

          <div className="settings-groups">
            <section className="settings-group">
              <h2 className="settings-group-title">CLOUD SYNC</h2>
              <Card padding="lg" className="settings-card">
                <div className="sync-status">
                  <div className={`sync-status-icon ${isConnectedToDrive ? 'sync-status-icon--active' : ''}`}>
                    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path>
                      <polyline points="22 4 12 14.01 9 11.01"></polyline>
                    </svg>
                  </div>
                  <div className="sync-status-info">
                    <h3 className="sync-status-text">{isConnectedToDrive ? 'Connected to Google Drive' : 'Google Drive not connected'}</h3>
                    <p className="sync-email">{pendingSyncCount > 0 ? `${pendingSyncCount} changes waiting to sync` : 'Offline-first local storage is active'}</p>
                  </div>
                </div>
                <div className="sync-meta">
                  <div>
                    <p className="sync-time">Last synced: {lastSyncedAt ? new Date(lastSyncedAt).toLocaleString() : 'Never'}</p>
                    {lastSyncError && <p className="sync-time sync-time--error">{lastSyncError}</p>}
                  </div>
                  <div className="sync-meta__actions">
                    <SyncIndicator />
                    <Button variant="secondary" size="sm" onClick={() => void runSync()}>
                      Sync Now
                    </Button>
                  </div>
                </div>
              </Card>
            </section>

            <section className="settings-group">
              <h2 className="settings-group-title">PREFERENCES</h2>
              <Card padding="md" className="settings-card">
                <div className="setting-item">
                  <span className="setting-item-label">Fonts</span>
                  <span className="setting-item-value">System Optimized</span>
                </div>
                <div className="setting-item">
                  <span className="setting-item-label">Units</span>
                  <span className="setting-item-value">Metric (kg, cm)</span>
                </div>
              </Card>
            </section>

            <section className="settings-group">
              <h2 className="settings-group-title">ABOUT</h2>
              <Card padding="md" className="settings-card">
                <div className="setting-item">
                  <span className="setting-item-label">Runtime</span>
                  <span className="setting-item-value">Vite PWA</span>
                </div>
                <div className="setting-item">
                  <span className="setting-item-label">Storage</span>
                  <span className="setting-item-value">Dexie + Google Drive</span>
                </div>
              </Card>
            </section>

            {isConnectedToDrive ? (
              <Button variant="danger" fullWidth size="lg" onClick={() => void disconnectDrive()}>
                Disconnect Google Drive
              </Button>
            ) : (
              <Button variant="primary" fullWidth size="lg" onClick={() => setIsDrivePromptOpen(true)}>
                Connect Google Drive
              </Button>
            )}
          </div>
        </div>
      </PageWrapper>

      <DriveConnectAlert
        visible={isDrivePromptOpen}
        onClose={() => setIsDrivePromptOpen(false)}
        onConnected={refreshSyncState}
      />
    </div>
  );
}
