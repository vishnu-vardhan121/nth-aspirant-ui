const MUTE_STORAGE_KEY = 'nth-messages-sound-muted';

let audioCtx = null;

export function isMessageSoundMuted() {
  try {
    return localStorage.getItem(MUTE_STORAGE_KEY) === 'true';
  } catch {
    return false;
  }
}

export function setMessageSoundMuted(muted) {
  try {
    localStorage.setItem(MUTE_STORAGE_KEY, muted ? 'true' : 'false');
  } catch {}
}

/** Call once after a user gesture so later notification sounds are allowed by the browser. */
export function primeMessageSound() {
  try {
    if (!audioCtx) {
      const Ctx = window.AudioContext || window.webkitAudioContext;
      if (!Ctx) return;
      audioCtx = new Ctx();
    }
    if (audioCtx.state === 'suspended') {
      void audioCtx.resume();
    }
  } catch {}
}

/**
 * Play a short notification sound for new messages.
 * Respects mute setting. Requires primeMessageSound() after a user click/tap for autoplay policy.
 */
export async function playMessageSound() {
  if (isMessageSoundMuted()) return;
  try {
    primeMessageSound();
    if (!audioCtx) return;
    if (audioCtx.state === 'suspended') {
      await audioCtx.resume();
    }
    if (audioCtx.state !== 'running') return;

    const osc = audioCtx.createOscillator();
    const gain = audioCtx.createGain();
    osc.connect(gain);
    gain.connect(audioCtx.destination);
    const t = audioCtx.currentTime;
    osc.frequency.setValueAtTime(880, t);
    osc.frequency.setValueAtTime(1100, t + 0.05);
    osc.frequency.setValueAtTime(880, t + 0.1);
    gain.gain.setValueAtTime(0.15, t);
    gain.gain.exponentialRampToValueAtTime(0.01, t + 0.2);
    osc.start(t);
    osc.stop(t + 0.2);
  } catch {}
}
