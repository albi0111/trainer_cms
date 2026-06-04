import { useEffect, useState } from 'react';
import AppAlert from '../shared/AppAlert';
import { useHaptic } from '../../hooks/useHaptic';
import { useSoundFeedback } from '../../hooks/useSoundFeedback';
import { useAppStore } from '../../store/useAppStore';

interface DriveConnectAlertProps {
  visible: boolean;
  onClose: () => void;
  onConnected?: () => Promise<void> | void;
}

export default function DriveConnectAlert({
  visible,
  onClose,
  onConnected,
}: DriveConnectAlertProps) {
  const connectGoogle = useAppStore((state) => state.connectGoogle);
  const [isConnecting, setIsConnecting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const haptic = useHaptic();
  const { playConfirm, playError } = useSoundFeedback();

  useEffect(() => {
    if (!visible) {
      setIsConnecting(false);
      setErrorMessage(null);
    }
  }, [visible]);

  const handleConfirm = async () => {
    setErrorMessage(null);
    setIsConnecting(true);

    try {
      haptic.medium();
      await connectGoogle();
      playConfirm();
      await onConnected?.();
      onClose();
    } catch (error) {
      playError();
      setErrorMessage(error instanceof Error ? error.message : 'Failed to connect Google.');
      console.error('Failed to connect Google', error);
    } finally {
      setIsConnecting(false);
    }
  };

  return (
    <AppAlert
      visible={visible}
      title="Connect Google"
      message="Connect Google once to back up client data with Drive and create session reminders in Google Calendar."
      confirmLabel="Connect Google"
      cancelLabel="Not Now"
      variant="warning"
      confirmLoading={isConnecting}
      preventClose={isConnecting}
      onConfirm={() => void handleConfirm()}
      onCancel={onClose}
      icon={(
        <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M7 18a4 4 0 1 1 .8-7.92A5.5 5.5 0 0 1 18.5 12a3.5 3.5 0 1 1 .5 6H7z"></path>
          <path d="M12 8v4"></path>
          <path d="M12 16h.01"></path>
        </svg>
      )}
    >
      <p style={{ color: '#888', fontSize: 13, lineHeight: 1.6, margin: 0 }}>
        Google opens a secure popup for sign-in and consent. You stay on this screen and return here after approval.
      </p>
      {errorMessage ? (
        <p style={{ color: '#FF6B6B', fontSize: 13, lineHeight: 1.5, margin: '14px 0 0' }}>
          {errorMessage}
        </p>
      ) : null}
    </AppAlert>
  );
}
