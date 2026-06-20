import { useState, useEffect, useRef } from 'react';

export default function Timer({ totalSeconds, onExpire, paused = false }) {
  const [remaining, setRemaining] = useState(totalSeconds);
  const intervalRef = useRef(null);

  useEffect(() => {
    if (paused) return;
    intervalRef.current = setInterval(() => {
      setRemaining(prev => {
        if (prev <= 1) {
          clearInterval(intervalRef.current);
          onExpire();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(intervalRef.current);
  }, [paused, onExpire]);

  const h = Math.floor(remaining / 3600);
  const m = Math.floor((remaining % 3600) / 60);
  const s = remaining % 60;
  const display = `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
  const pct = remaining / totalSeconds;
  const urgent = pct < 0.15;
  const warning = pct < 0.30;

  return (
    <div className={`timer ${urgent ? 'timer--urgent' : warning ? 'timer--warning' : ''}`}>
      <span className="timer__icon">⏱</span>
      <span className="timer__display">{display}</span>
    </div>
  );
}
