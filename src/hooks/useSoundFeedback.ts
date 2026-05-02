type ToneStep = {
  from: number;
  to?: number;
  durationMs: number;
  volume: number;
};

type BrowserAudioContext = AudioContext & {
  readonly state: AudioContextState;
};

let sharedAudioContext: BrowserAudioContext | null = null;

function getAudioContext(): BrowserAudioContext | null {
  if (typeof window === 'undefined') {
    return null;
  }

  const browserWindow = window as Window & {
    webkitAudioContext?: typeof AudioContext;
  };
  const AudioContextConstructor = globalThis.AudioContext || browserWindow.webkitAudioContext;
  if (!AudioContextConstructor) {
    return null;
  }

  if (!sharedAudioContext) {
    sharedAudioContext = new AudioContextConstructor() as BrowserAudioContext;
  }

  if (sharedAudioContext.state === 'suspended') {
    void sharedAudioContext.resume().catch(() => undefined);
  }

  return sharedAudioContext;
}

function playSequence(steps: ToneStep[]): void {
  try {
    const audioContext = getAudioContext();
    if (!audioContext) {
      return;
    }

    const startAt = audioContext.currentTime + 0.01;
    let cursor = startAt;

    for (const step of steps) {
      const durationSeconds = step.durationMs / 1000;
      const oscillator = audioContext.createOscillator();
      const gain = audioContext.createGain();

      oscillator.type = 'sine';
      oscillator.frequency.setValueAtTime(step.from, cursor);
      if (typeof step.to === 'number') {
        oscillator.frequency.linearRampToValueAtTime(step.to, cursor + durationSeconds);
      }

      gain.gain.setValueAtTime(step.volume, cursor);
      gain.gain.exponentialRampToValueAtTime(0.0001, cursor + durationSeconds);

      oscillator.connect(gain);
      gain.connect(audioContext.destination);

      oscillator.start(cursor);
      oscillator.stop(cursor + durationSeconds + 0.02);

      cursor += durationSeconds;
    }
  } catch {
    // Silent fail when audio is blocked or unavailable.
  }
}

export function useSoundFeedback() {
  const playTick = () => {
    playSequence([{ from: 800, durationMs: 50, volume: 0.1 }]);
  };

  const playConfirm = () => {
    playSequence([
      { from: 600, durationMs: 80, volume: 0.12 },
      { from: 900, durationMs: 80, volume: 0.12 },
    ]);
  };

  const playDelete = () => {
    playSequence([{ from: 300, durationMs: 80, volume: 0.1 }]);
  };

  const playError = () => {
    playSequence([{ from: 200, durationMs: 100, volume: 0.1 }]);
  };

  const playSuccess = () => {
    playSequence([
      { from: 500, durationMs: 60, volume: 0.12 },
      { from: 700, durationMs: 60, volume: 0.12 },
      { from: 1000, durationMs: 60, volume: 0.12 },
    ]);
  };

  return { playTick, playConfirm, playDelete, playError, playSuccess };
}
