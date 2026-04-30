import './SettingsScreen.css';

// UI & Layout Components
import TopNavBar from '../components/layout/TopNavBar';
import PageWrapper from '../components/layout/PageWrapper';
import Card from '../components/ui/Card';
import Button from '../components/ui/Button';

export default function SettingsScreen() {
  return (
    <div className="settings-page">
      <TopNavBar showLogo showBack={true} />

      <PageWrapper>
        <div className="settings-content">
          <h1 className="settings-title">Settings</h1>

          <div className="settings-groups">
            <section className="settings-group">
              <h2 className="settings-group-title">CLOUD SYNC</h2>
              <Card padding="lg" className="settings-card">
                <div className="sync-status">
                  <div className="sync-status-icon sync-status-icon--active">
                    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path>
                      <polyline points="22 4 12 14.01 9 11.01"></polyline>
                    </svg>
                  </div>
                  <div className="sync-status-info">
                    <h3 className="sync-status-text">Connected to Google Drive</h3>
                    <p className="sync-email">albin@example.com</p>
                  </div>
                </div>
                <div className="sync-meta">
                  <p className="sync-time">Last synced: Today, 14:05</p>
                  <Button variant="secondary" size="sm">Sync Now</Button>
                </div>
              </Card>
            </section>

            <section className="settings-group">
              <h2 className="settings-group-title">PREFERENCES</h2>
              <Card padding="md" className="settings-card">
                <div className="setting-item">
                  <span className="setting-item-label">Dark Mode</span>
                  <span className="setting-item-value">Always On</span>
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
                  <span className="setting-item-label">Version</span>
                  <span className="setting-item-value">1.2.0</span>
                </div>
                <div className="setting-item">
                  <span className="setting-item-label">Environment</span>
                  <span className="setting-item-value">Production PWA</span>
                </div>
              </Card>
            </section>

            <Button variant="danger" fullWidth size="lg">Log Out</Button>
          </div>
        </div>
      </PageWrapper>

    </div>
  );
}
