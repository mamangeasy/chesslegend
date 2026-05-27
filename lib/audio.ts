let audioCtx: AudioContext | null = null;

function getAudioContext(): AudioContext | null {
  if (typeof window === 'undefined') return null;
  if (!audioCtx) {
    audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
  }
  if (audioCtx.state === 'suspended') {
    audioCtx.resume();
  }
  return audioCtx;
}

export function playMoveSound() {
  const ctx = getAudioContext();
  if (!ctx) return;

  const osc = ctx.createOscillator();
  const gainNode = ctx.createGain();

  osc.connect(gainNode);
  gainNode.connect(ctx.destination);

  // Pleasant, soft sine wave shape
  osc.type = 'sine';
  
  // Frequency: start slightly lower and end slightly higher for a soft "upward" tick
  const now = ctx.currentTime;
  osc.frequency.setValueAtTime(392, now); // G4
  osc.frequency.exponentialRampToValueAtTime(493.88, now + 0.1); // B4

  // Smooth gain envelope: instant-ish start then quick fade out
  gainNode.gain.setValueAtTime(0, now);
  gainNode.gain.linearRampToValueAtTime(0.12, now + 0.01);
  gainNode.gain.exponentialRampToValueAtTime(0.001, now + 0.12);

  osc.start(now);
  osc.stop(now + 0.13);
}

export function playCaptureSound() {
  const ctx = getAudioContext();
  if (!ctx) return;

  const now = ctx.currentTime;

  // Bright, double-tap high chime for chess capture
  // First tone: E5 (659.25 Hz)
  const osc1 = ctx.createOscillator();
  const gain1 = ctx.createGain();
  osc1.connect(gain1);
  gain1.connect(ctx.destination);
  
  osc1.type = 'triangle'; // triangle has slightly more "bite" than sine, good for capture
  osc1.frequency.setValueAtTime(659.25, now);
  gain1.gain.setValueAtTime(0, now);
  gain1.gain.linearRampToValueAtTime(0.12, now + 0.01);
  gain1.gain.exponentialRampToValueAtTime(0.001, now + 0.15);
  
  osc1.start(now);
  osc1.stop(now + 0.16);

  // Second oscillator slightly offset for a rich ringing interval: C6 (1046.50 Hz)
  const osc2 = ctx.createOscillator();
  const gain2 = ctx.createGain();
  osc2.connect(gain2);
  gain2.connect(ctx.destination);
  
  osc2.type = 'sine';
  osc2.frequency.setValueAtTime(1046.50, now + 0.05);
  
  gain2.gain.setValueAtTime(0, now + 0.05);
  gain2.gain.linearRampToValueAtTime(0.08, now + 0.06);
  gain2.gain.exponentialRampToValueAtTime(0.001, now + 0.2);

  osc2.start(now + 0.05);
  osc2.stop(now + 0.21);
}

export function playGameOverSound(isWinner: boolean) {
  const ctx = getAudioContext();
  if (!ctx) return;

  const now = ctx.currentTime;
  if (isWinner) {
    // Beautiful ascending major triad: C5 (523.25) -> E5 (659.25) -> G5 (783.99) -> C6 (1046.50)
    const tones = [523.25, 659.25, 783.99, 1046.50];
    tones.forEach((freq, idx) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.type = 'sine';
      osc.frequency.setValueAtTime(freq, now + idx * 0.1);
      gain.gain.setValueAtTime(0, now + idx * 0.1);
      gain.gain.linearRampToValueAtTime(0.12, now + idx * 0.1 + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.001, now + idx * 0.1 + 0.35);
      osc.start(now + idx * 0.1);
      osc.stop(now + idx * 0.1 + 0.37);
    });
  } else {
    // Descending minor/sad intervals: G3 (196.00) -> Eb3 (155.56) -> C3 (130.81)
    const tones = [196.00, 155.56, 130.81];
    tones.forEach((freq, idx) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.type = 'sine';
      osc.frequency.setValueAtTime(freq, now + idx * 0.15);
      gain.gain.setValueAtTime(0, now + idx * 0.15);
      gain.gain.linearRampToValueAtTime(0.12, now + idx * 0.15 + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.001, now + idx * 0.15 + 0.5);
      osc.start(now + idx * 0.15);
      osc.stop(now + idx * 0.15 + 0.55);
    });
  }
}
