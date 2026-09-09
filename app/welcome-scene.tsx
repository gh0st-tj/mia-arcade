'use client';

import { useEffect, useRef, useState } from 'react';
import { Pause, Play } from 'lucide-react';
import type { Lang } from '@/lib/game-data';

export default function WelcomeScene({
  lang,
  replay,
}: {
  lang: Lang;
  replay: number;
}) {
  const video = useRef<HTMLVideoElement>(null);
  const [playing, setPlaying] = useState(false);
  const [failed, setFailed] = useState(false);
  const description =
    lang === 'en'
      ? 'Mia waves hello with baby Dean and Johnny on their moon.'
      : 'מיה מנופפת לשלום עם התינוק דין וג׳וני על הירח שלהם.';

  useEffect(() => {
    const player = video.current;
    if (!player || failed) return;
    // Explicit replay remains available when automatic motion is disabled.
    if (
      replay === 0 &&
      window.matchMedia('(prefers-reduced-motion: reduce)').matches
    )
      return;
    player.currentTime = 0;
    void player.play().catch(() => setPlaying(false));
    return () => player.pause();
  }, [replay, failed]);

  function toggle() {
    const player = video.current;
    if (!player) return;
    if (!player.paused) player.pause();
    else {
      if (player.ended) player.currentTime = 0;
      void player.play().catch(() => setPlaying(false));
    }
  }

  return (
    <div className="welcome-scene">
      {failed ? (
        <img src="/images/mia-space.png" alt={description} />
      ) : (
        <video
          ref={video}
          src="/video/mia-welcome.mp4"
          poster="/images/mia-space.png"
          muted
          playsInline
          preload="none"
          aria-label={description}
          onPlay={() => setPlaying(true)}
          onPause={() => setPlaying(false)}
          onEnded={() => setPlaying(false)}
          onError={() => {
            setPlaying(false);
            setFailed(true);
          }}
        />
      )}
      {!failed && (
        <button
          className="scene-control"
          onClick={toggle}
          aria-label={
            lang === 'en'
              ? playing
                ? 'Pause welcome animation'
                : 'Play welcome animation'
              : playing
                ? 'עצירת סרטון הברכה'
                : 'הפעלת סרטון הברכה'
          }
        >
          {playing ? (
            <Pause size={15} />
          ) : (
            <Play size={15} fill="currentColor" />
          )}
          <span>
            {lang === 'en'
              ? playing
                ? 'Pause'
                : 'Say hello!'
              : playing
                ? 'עצירה'
                : 'בואי נגיד שלום!'}
          </span>
        </button>
      )}
    </div>
  );
}
