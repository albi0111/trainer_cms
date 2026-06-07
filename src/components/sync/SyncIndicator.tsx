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
  const {
    cancelLongPress,
    consumeLongPress,
    getLongPressHandlers,
    isHolding,
    progress: holdProgress,
  } = useLongPress();

  const requiresConnection = !isGoogleConnected
    || googleAuthStatus === 'revoked'
    || googleAuthStatus === 'failed'
    || googleAuthStatus === 'expired';
  const isSyncing = syncStatus === 'syncing';
  const hasSyncError = syncStatus === 'error' && !requiresConnection;
  const iconSize = compact ? 32 : 36;
  const googleFontSize = compact ? 20 : 23;
  const gearSize = compact ? 18 : 20;
  const gearTravelPx = compact ? 40 : 46;
  const gearOpacity = isHolding ? 0.18 + (Math.min(1, Math.max(0, holdProgress)) * 0.82) : 0;
  const gearOffset = (1 - holdProgress) * gearTravelPx;

  const label = requiresConnection
    ? (googleAuthStatus === 'expired' ? 'Reconnect Google' : 'Connect Google')
    : hasSyncError
      ? 'Google Sync Error'
    : isSyncing
      ? 'Syncing Google'
      : pendingSyncCount > 0
        ? `${pendingSyncCount} Pending`
        : 'Google Synced';
  const actionHint = `${label}. Tap ${requiresConnection ? 'to connect Google' : 'to sync Google'}. Hold for Settings.`;

  const handleClick = () => {
    if (consumeLongPress()) {
      return;
    }

    if (isSyncing) {
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
        color: requiresConnection ? '#FF5252' : hasSyncError ? '#FFB84D' : 'var(--color-primary)',
        cursor: onClick || onLongPress ? 'pointer' : 'default',
        background: 'none',
        border: 'none',
        padding: 0,
        overflow: 'visible',
      }}
      aria-label={actionHint}
      title={actionHint}
    >
      <span
        style={{
          position: 'relative',
          display: 'inline-flex',
          alignItems: 'center',
          justifyContent: 'center',
          width: iconSize,
          height: iconSize,
          overflow: 'visible',
        }}
      >
        {!isSyncing && (
          <span
            style={{
              position: 'relative',
              zIndex: 2,
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center',
              width: iconSize,
              height: iconSize,
              borderRadius: '50%',
              color: requiresConnection ? '#FF5252' : hasSyncError ? '#FFB84D' : 'var(--color-primary)',
              fontSize: googleFontSize,
              fontWeight: 850,
              lineHeight: 1,
              fontFamily: "system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
              background: requiresConnection || hasSyncError
                ? 'rgba(255, 255, 255, 0.03)'
                : 'rgba(var(--color-primary-rgb), 0.06)',
              boxShadow: requiresConnection
                ? '0 0 0 1px rgba(255, 82, 82, 0.32) inset'
                : hasSyncError
                  ? '0 0 0 1px rgba(255, 184, 77, 0.35) inset'
                  : '0 0 0 1px rgba(var(--color-primary-rgb), 0.22) inset, 0 0 14px rgba(var(--color-primary-rgb), 0.1)',
            }}
            aria-hidden="true"
          >
            G
          </span>
        )}
        {isSyncing && (
          <span
            style={{
              position: 'relative',
              zIndex: 2,
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center',
              width: iconSize,
              height: iconSize,
              borderRadius: '50%',
            }}
            aria-hidden="true"
          >
            <span
              style={{
                position: 'absolute',
                inset: 0,
                borderRadius: '50%',
                background: 'conic-gradient(var(--color-primary) 0 38%, var(--color-primary-deep) 38% 72%, rgba(var(--color-primary-rgb), 0.18) 72% 100%)',
                mask: 'radial-gradient(circle, transparent 57%, #000 60%)',
                WebkitMask: 'radial-gradient(circle, transparent 57%, #000 60%)',
                animation: 'googleSyncSpin 860ms linear infinite',
              }}
            />
            <svg
              width={compact ? 19 : 21}
              height={compact ? 19 : 21}
              viewBox="0 0 24 24"
              fill="none"
              stroke="var(--color-primary)"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M7 18a4 4 0 1 1 .8-7.92A5.5 5.5 0 0 1 18.5 12a3.5 3.5 0 1 1 .5 6H7z" />
            </svg>
          </span>
        )}
        <span
          style={{
            position: 'absolute',
            inset: -4,
            display: isHolding ? 'block' : 'none',
            borderRadius: '50%',
            background: `conic-gradient(var(--color-primary) ${Math.round(holdProgress * 360)}deg, rgba(255, 255, 255, 0.1) 0deg)`,
            mask: 'radial-gradient(circle, transparent 67%, #000 69%)',
            WebkitMask: 'radial-gradient(circle, transparent 67%, #000 69%)',
            zIndex: 1,
          }}
          aria-hidden="true"
        />
        <span
          style={{
            position: 'absolute',
            left: '50%',
            top: '50%',
            display: 'inline-flex',
            alignItems: 'center',
            justifyContent: 'center',
            width: gearSize,
            height: gearSize,
            color: 'var(--color-primary)',
            opacity: onLongPress ? gearOpacity : 0,
            pointerEvents: 'none',
            transform: `translate(calc(-50% - ${gearOffset}px), -50%) rotate(${Math.round(holdProgress * 460)}deg) scale(${0.76 + (holdProgress * 0.24)})`,
            transformOrigin: 'center',
            transition: isHolding ? 'none' : 'opacity 140ms ease, transform 160ms ease',
            filter: `drop-shadow(0 0 ${Math.round(2 + (holdProgress * 10))}px rgba(var(--color-primary-rgb), ${0.18 + (holdProgress * 0.42)}))`,
            zIndex: 3,
          }}
          aria-hidden="true"
        >
          <svg width={gearSize} height={gearSize} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.35" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="12" cy="12" r="3" />
            <path d="M19.4 15a1.7 1.7 0 0 0 .34 1.88l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06A1.7 1.7 0 0 0 15 19.4a1.7 1.7 0 0 0-1 .92V20.4a2 2 0 0 1-4 0v-.08a1.7 1.7 0 0 0-1-.92 1.7 1.7 0 0 0-1.88.34l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.7 1.7 0 0 0 4.6 15a1.7 1.7 0 0 0-.92-1H3.6a2 2 0 0 1 0-4h.08a1.7 1.7 0 0 0 .92-1 1.7 1.7 0 0 0-.34-1.88l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.7 1.7 0 0 0 9 4.6a1.7 1.7 0 0 0 1-.92V3.6a2 2 0 0 1 4 0v.08a1.7 1.7 0 0 0 1 .92 1.7 1.7 0 0 0 1.88-.34l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.7 1.7 0 0 0 19.4 9c.36.24.67.55.92 1h.08a2 2 0 0 1 0 4h-.08a1.7 1.7 0 0 0-.92 1z" />
          </svg>
        </span>
      </span>
      {!compact && <span style={{ fontSize: 12, fontWeight: 700 }}>{label}</span>}
      <style>
        {`
          @keyframes googleSyncSpin {
            from { transform: rotate(0deg); }
            to { transform: rotate(360deg); }
          }
        `}
      </style>
    </button>
  );
}
