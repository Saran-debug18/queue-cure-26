import { useEffect, useRef } from 'react';
import { onTokenCalled, onEmergencyAlert } from './useSocket';
import { useQueueStore } from '../store/queueStore';

// Voices load async — cache them once available
let cachedVoices: SpeechSynthesisVoice[] = [];
function loadVoices() {
  const v = window.speechSynthesis?.getVoices() ?? [];
  if (v.length) cachedVoices = v;
}
if (typeof window !== 'undefined' && window.speechSynthesis) {
  loadVoices();
  window.speechSynthesis.addEventListener('voiceschanged', loadVoices);
}

function getVoice() {
  const voices = cachedVoices.length ? cachedVoices : (window.speechSynthesis?.getVoices() ?? []);
  return (
    voices.find(v => v.lang.startsWith('en') && v.localService) ??
    voices.find(v => v.lang.startsWith('en')) ??
    voices[0] ??
    null
  );
}

function speak(text: string, rate: number, pitch: number) {
  if (!window.speechSynthesis) return;
  window.speechSynthesis.cancel();

  const msg = new SpeechSynthesisUtterance(text);
  msg.rate = rate;
  msg.pitch = pitch;
  msg.volume = 1.0;
  const v = getVoice();
  if (v) msg.voice = v;

  // Chrome bug: speechSynthesis pauses in background tabs and can loop.
  // Resume every 10s to keep it alive; clear on finish.
  const heartbeat = setInterval(() => {
    if (!window.speechSynthesis.speaking) { clearInterval(heartbeat); return; }
    window.speechSynthesis.pause();
    window.speechSynthesis.resume();
  }, 10000);
  msg.onend = () => clearInterval(heartbeat);
  msg.onerror = () => clearInterval(heartbeat);

  window.speechSynthesis.speak(msg);
}

export function useSoundAlert() {
  const soundEnabled = useQueueStore(s => s.soundEnabled);
  const doctors = useQueueStore(s => s.doctors);
  const soundRef = useRef(soundEnabled);
  const doctorsRef = useRef(doctors);
  soundRef.current = soundEnabled;
  doctorsRef.current = doctors;

  useEffect(() => {
    const unsubToken = onTokenCalled(({ token, name, doctorId }) => {
      if (!soundRef.current || !window.speechSynthesis) return;
      window.speechSynthesis.cancel();

      const doctor = doctorId ? doctorsRef.current.find(d => d.id === doctorId) : null;
      const room = doctor ? `Dr. ${doctor.name}'s consultation room` : 'the consultation room';

      speak(`Now serving token number ${token}. ${name}, please proceed to ${room}.`, 0.9, 1.0);
    });

    const unsubEmergency = onEmergencyAlert(({ token, name, doctorId }) => {
      if (!soundRef.current || !window.speechSynthesis) return;
      window.speechSynthesis.cancel();

      const doctor = doctorId ? doctorsRef.current.find(d => d.id === doctorId) : null;
      const room = doctor ? `Dr. ${doctor.name}'s room` : 'the front';

      speak(`Attention! Emergency patient. Token number ${token}, ${name}, please come to ${room} immediately. I repeat — token ${token}, ${name}, to ${room} now.`, 1.2, 1.5);
    });

    return () => {
      unsubToken();
      unsubEmergency();
    };
  }, []);
}
