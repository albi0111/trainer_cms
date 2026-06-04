import { Suspense, lazy, useEffect, useRef, useState } from 'react';
import pkg from '../../package.json';
import './SettingsScreen.css';

import TopNavBar from '../components/layout/TopNavBar';
import PageWrapper from '../components/layout/PageWrapper';
import BrandMark from '../components/branding/BrandMark';
import Card from '../components/ui/Card';
import Button from '../components/ui/Button';
import { useSoundFeedback } from '../hooks/useSoundFeedback';
import { useAppStore } from '../store/useAppStore';

const DriveConnectAlert = lazy(() => import('../components/sync/DriveConnectAlert'));

export default function SettingsScreen() {
  const isGoogleConnected = useAppStore((state) => state.isGoogleConnected);
  const googleAuthStatus = useAppStore((state) => state.googleAuthStatus);
  const googleAccountEmail = useAppStore((state) => state.googleAccountEmail);
  const googlePendingSyncCount = useAppStore((state) => state.googlePendingSyncCount);
  const googleLastSyncedAt = useAppStore((state) => state.googleLastSyncedAt);
  const googleLastSyncError = useAppStore((state) => state.googleLastSyncError);
  const syncStatus = useAppStore((state) => state.syncStatus);
  const pendingSyncCount = useAppStore((state) => state.pendingSyncCount);
  const calendarPendingSyncCount = useAppStore((state) => state.calendarPendingSyncCount);
  const lastSyncedAt = useAppStore((state) => state.lastSyncedAt);
  const calendarLastSyncedAt = useAppStore((state) => state.calendarLastSyncedAt);
  const lastSyncError = useAppStore((state) => state.lastSyncError);
  const calendarLastSyncError = useAppStore((state) => state.calendarLastSyncError);
  const isCalendarEnabledOnThisDevice = useAppStore((state) => state.isCalendarEnabledOnThisDevice);
  const calendarName = useAppStore((state) => state.calendarName);
  const connectGoogle = useAppStore((state) => state.connectGoogle);
  const disconnectGoogle = useAppStore((state) => state.disconnectGoogle);
  const refreshSyncState = useAppStore((state) => state.refreshSyncState);
  const runSync = useAppStore((state) => state.runSync);
  const [isDrivePromptOpen, setIsDrivePromptOpen] = useState(false);
  const [isBuilderToastVisible, setIsBuilderToastVisible] = useState(false);
  const [hasLoadedDrivePrompt, setHasLoadedDrivePrompt] = useState(false);
  const builderTapCountRef = useRef(0);
  const builderTapResetTimeoutRef = useRef<number | null>(null);
  const builderToastTimeoutRef = useRef<number | null>(null);
  const { playTick } = useSoundFeedback();
  const version = typeof pkg.version === 'string' && pkg.version.trim() ? pkg.version : '1.0.0';

  useEffect(() => {
    void refreshSyncState();
  }, [refreshSyncState]);

  useEffect(() => {
    return () => {
      if (builderTapResetTimeoutRef.current !== null) {
        window.clearTimeout(builderTapResetTimeoutRef.current);
      }

      if (builderToastTimeoutRef.current !== null) {
        window.clearTimeout(builderToastTimeoutRef.current);
      }
    };
  }, []);

  useEffect(() => {
    if (isDrivePromptOpen) {
      setHasLoadedDrivePrompt(true);
    }
  }, [isDrivePromptOpen]);

  const handleBuilderTap = () => {
    builderTapCountRef.current += 1;

    if (builderTapResetTimeoutRef.current !== null) {
      window.clearTimeout(builderTapResetTimeoutRef.current);
    }

    builderTapResetTimeoutRef.current = window.setTimeout(() => {
      builderTapCountRef.current = 0;
      builderTapResetTimeoutRef.current = null;
    }, 3000);

    if (builderTapCountRef.current < 3) {
      return;
    }

    builderTapCountRef.current = 0;

    if (builderTapResetTimeoutRef.current !== null) {
      window.clearTimeout(builderTapResetTimeoutRef.current);
      builderTapResetTimeoutRef.current = null;
    }

    if (builderToastTimeoutRef.current !== null) {
      window.clearTimeout(builderToastTimeoutRef.current);
    }

    playTick();
    setIsBuilderToastVisible(true);
    builderToastTimeoutRef.current = window.setTimeout(() => {
      setIsBuilderToastVisible(false);
      builderToastTimeoutRef.current = null;
    }, 2500);
  };

  return (
    <div className="settings-page">
      <TopNavBar showLogo showBack />

      <PageWrapper>
        <div className="settings-content">
          <h1 className="settings-title">Settings</h1>

          <div className="settings-groups">
            <section className="settings-group">
              <h2 className="settings-group-title">GOOGLE ACCOUNT</h2>
              <Card padding="lg" className="settings-card">
                <div className="sync-status">
                  <div className={`sync-status-icon ${isGoogleConnected ? 'sync-status-icon--active' : ''}`}>
                    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path>
                      <polyline points="22 4 12 14.01 9 11.01"></polyline>
                    </svg>
                  </div>
                  <div className="sync-status-info">
                    <h3 className="sync-status-text">
                      {isGoogleConnected ? 'Google connected' : googleAuthStatus === 'expired' ? 'Reconnect Google' : 'Google not connected'}
                    </h3>
                    <p className="sync-email">
                      {googleAccountEmail || (googlePendingSyncCount > 0 ? `${googlePendingSyncCount} Google changes waiting` : 'Backup and reminders are offline-first')}
                    </p>
                  </div>
                </div>

                <div className="google-feature-list">
                  <div className="google-feature-item">
                    <span className="google-feature-item__check">✓</span>
                    <div>
                      <span className="setting-item-label">Backup & Sync</span>
                      <p className="sync-email">
                        {pendingSyncCount > 0 ? `${pendingSyncCount} Drive backup changes waiting` : 'Client data syncs through Google Drive'}
                      </p>
                    </div>
                  </div>
                  <div className="google-feature-item">
                    <span className="google-feature-item__check">✓</span>
                    <div>
                      <span className="setting-item-label">Calendar Reminders</span>
                      <p className="sync-email">
                        {calendarPendingSyncCount > 0
                          ? `${calendarPendingSyncCount} Calendar reminder changes waiting`
                          : isCalendarEnabledOnThisDevice
                            ? `${calendarName || 'fit.persona Sessions'} manages reminders from this device`
                          : 'Connect Google to enable session reminders on this device'}
                      </p>
                    </div>
                  </div>
                </div>

                <p className="calendar-owner-note">
                  Calendar reminders are managed from this device. Use only one device for Calendar reminders to avoid duplicate Google Calendar events.
                </p>

                <div className="sync-meta">
                  <div>
                    <p className="sync-time">Last synced: {googleLastSyncedAt ? new Date(googleLastSyncedAt).toLocaleString() : 'Never'}</p>
                    {googleLastSyncError && <p className="sync-time sync-time--error">{googleLastSyncError}</p>}
                    {(lastSyncError || calendarLastSyncError) && (
                      <p className="sync-time sync-time--muted">
                        Drive: {lastSyncError || 'OK'} · Calendar: {calendarLastSyncError || 'OK'}
                      </p>
                    )}
                    <p className="sync-time sync-time--muted">
                      Drive last: {lastSyncedAt ? new Date(lastSyncedAt).toLocaleString() : 'Never'} · Calendar last: {calendarLastSyncedAt ? new Date(calendarLastSyncedAt).toLocaleString() : 'Never'}
                    </p>
                  </div>
                  <div className="sync-meta__actions">
                    {isGoogleConnected ? (
                      <>
                        <Button
                          variant="secondary"
                          size="sm"
                          loading={syncStatus === 'syncing'}
                          onClick={() => void runSync()}
                        >
                          Sync with Google
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          loading={syncStatus === 'syncing'}
                          onClick={() => void connectGoogle()}
                        >
                          Reconnect Google
                        </Button>
                      </>
                    ) : (
                      <Button
                        variant="primary"
                        size="sm"
                        loading={syncStatus === 'syncing'}
                        onClick={() => setIsDrivePromptOpen(true)}
                      >
                        Connect Google
                      </Button>
                    )}
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
              <Card padding="lg" className="settings-card settings-about-card">
                <div className="settings-about-card__brand">
                  <BrandMark className="settings-about-card__logo" decorative />
                  <h3 className="settings-about-card__name">fit.persona</h3>
                  <p className="settings-about-card__version">Version {version}</p>
                </div>

                <div className="settings-about-card__divider" />

                <div className="settings-about-card__credits">
                  <span className="settings-about-card__eyebrow">Powered by</span>
                  <button
                    type="button"
                    className="settings-about-card__builder"
                    onClick={handleBuilderTap}
                  >
                    0111
                  </button>
                </div>

                <div className="settings-about-card__divider" />

                <div className="settings-about-card__dedication">
                  <span className="settings-about-card__eyebrow">Built with ♥ for</span>
                  <span className="settings-about-card__trainer">Ajith</span>
                </div>
              </Card>
            </section>

            {isGoogleConnected ? (
              <Button variant="danger" fullWidth size="lg" onClick={() => void disconnectGoogle()}>
                Disconnect Google
              </Button>
            ) : (
              <Button variant="primary" fullWidth size="lg" onClick={() => setIsDrivePromptOpen(true)}>
                Connect Google
              </Button>
            )}
          </div>
        </div>
      </PageWrapper>

      {hasLoadedDrivePrompt ? (
        <Suspense fallback={null}>
          <DriveConnectAlert
            visible={isDrivePromptOpen}
            onClose={() => setIsDrivePromptOpen(false)}
            onConnected={refreshSyncState}
          />
        </Suspense>
      ) : null}

      <div
        className={`settings-builder-toast ${isBuilderToastVisible ? 'settings-builder-toast--visible' : ''}`}
        role="status"
        aria-live="polite"
      >
        Hello from the builder 👋
      </div>
    </div>
  );
}
