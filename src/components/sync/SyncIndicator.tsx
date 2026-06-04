import { useLongPress } from '../../hooks/useLongPress';
import { useAppStore } from '../../store/useAppStore';

interface SyncIndicatorProps {
  compact?: boolean;
  onClick?: () => void;
  onLongPress?: () => void;
}

export default function SyncIndicator({ compact = false, onClick, onLongPress }: SyncIndicatorProps) {
  const syncStatus = useAppStore((state) => state.syncStatus);
  const pendingSyncCount = useAppStore((state) => state.googlePendingSyncCount);
  const isGoogleConnected = useAppStore((state) => state.isGoogleConnected);
  const googleAuthStatus = useAppStore((state) => state.googleAuthStatus);
  const { cancelLongPress, consumeLongPress, getLongPressHandlers } = useLongPress();

  const requiresConnection = !isGoogleConnected || googleAuthStatus === 'revoked' || googleAuthStatus === 'failed';
  const hasError = syncStatus === 'error' || requiresConnection;
  const color = hasError
    ? '#FF5252'
    : syncStatus === 'syncing'
      ? 'var(--color-primary)'
      : '#E8E0B8';

  const label = requiresConnection
    ? 'Connect Google'
    : syncStatus === 'error'
      ? 'Google Sync Error'
    : syncStatus === 'syncing'
      ? 'Syncing Google'
      : pendingSyncCount > 0
        ? `${pendingSyncCount} Pending`
        : 'Google Synced';

  const handleClick = () => {
    if (consumeLongPress()) {
      return;
    }

    if (syncStatus === 'syncing') {
      return;
    }

    onClick?.();
  };

  const longPressHandlers = onLongPress ? getLongPressHandlers(onLongPress) : undefined;

  return (
    <button
      type="button"
      className="pressable"
      onClick={handleClick}
      onTouchStart={longPressHandlers?.onTouchStart}
      onTouchEnd={longPressHandlers?.onTouchEnd}
      onTouchCancel={longPressHandlers?.onTouchCancel}
      onMouseDown={longPressHandlers?.onMouseDown}
      onMouseUp={longPressHandlers?.onMouseUp}
      onMouseLeave={cancelLongPress}
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: compact ? 6 : 8,
        color,
        cursor: onClick || onLongPress ? 'pointer' : 'default',
        background: 'none',
        border: 'none',
        padding: 0,
      }}
      aria-label={label}
      title={label}
    >
      <span
        style={{
          position: 'relative',
          display: 'inline-flex',
          alignItems: 'center',
          justifyContent: 'center',
          width: compact ? 18 : 20,
          height: compact ? 18 : 20,
        }}
      >
        <svg
          width={compact ? 16 : 18}
          height={compact ? 16 : 18}
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.9"
          strokeLinecap="round"
          strokeLinejoin="round"
          style={{
            opacity: syncStatus === 'syncing' ? 0.95 : 1,
            transform: syncStatus === 'syncing' ? 'translateY(-1px)' : 'none',
            animation: syncStatus === 'syncing' ? 'cloudFloat 1.2s ease-in-out infinite' : 'none',
          }}
        >
          <path d="M7 18a4 4 0 1 1 .8-7.92A5.5 5.5 0 0 1 18.5 12a3.5 3.5 0 1 1 .5 6H7z" />
        </svg>
        <span
          style={{
            position: 'absolute',
            inset: 0,
            display: syncStatus === 'syncing' ? 'flex' : 'none',
            alignItems: 'center',
            justifyContent: 'center',
            animation: 'cloudSpin 1.1s linear infinite',
          }}
        >
          <svg width={compact ? 9 : 10} height={compact ? 9 : 10} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M12 6v3"></path>
            <path d="M12 15l2.5-2.5"></path>
          </svg>
        </span>
      </span>
      {!compact && <span style={{ fontSize: 12, fontWeight: 700 }}>{label}</span>}
      <style>
        {`
          @keyframes cloudSpin {
            from { transform: rotate(0deg); }
            to { transform: rotate(360deg); }
          }
          @keyframes cloudFloat {
            0%, 100% { transform: translateY(-1px); }
            50% { transform: translateY(1px); }
          }
        `}
      </style>
    </button>
  );
}
