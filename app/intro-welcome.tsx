'use client';
import { useRef, useState } from 'react';
import { Play, Pause, Rocket, Volume2, VolumeX } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import type { Lang } from '@/lib/game-data';

type Props = {
  lang: Lang;
  sound: boolean;
  caption: string;
  onPlay: () => void;
  onClose: () => void;
  onStop: () => void;
  onLanguage: () => void;
  onSound: () => void;
};
export default function IntroWelcome({
  lang,
  sound,
  caption,
  onPlay,
  onClose,
  onStop,
  onLanguage,
  onSound,
}: Props) {
  const video = useRef<HTMLVideoElement>(null);
  const [playing, setPlaying] = useState(false);
  const t = (en: string, he: string) => (lang === 'en' ? en : he);
  const stop = () => {
    video.current?.pause();
    setPlaying(false);
    onStop();
  };
  return (
    <Dialog
      open
      onOpenChange={(open) => {
        if (!open) onClose();
      }}
    >
      <DialogContent
        className="intro-dialog"
        showCloseButton={false}
        dir={lang === 'he' ? 'rtl' : 'ltr'}
      >
        <div className="intro-top">
          <span className="eyebrow">
            {t('A LITTLE WORLD, ALL YOURS', 'עולם קטן, כולו שלך')}
          </span>
          <div>
            <button
              className="icon-button"
              onClick={onSound}
              aria-label={t(
                sound ? 'Mute intro' : 'Enable intro sound',
                sound ? 'השתקת הפתיח' : 'הפעלת צלילי הפתיח',
              )}
            >
              {sound ? <Volume2 size={20} /> : <VolumeX size={20} />}
            </button>
            <button
              className="language-button"
              onClick={() => {
                stop();
                onLanguage();
              }}
            >
              {lang === 'en' ? 'עברית' : 'English'}
            </button>
          </div>
        </div>
        <div className="intro-movie">
          <video
            ref={video}
            src="/video/mia-intro.mp4"
            poster="/images/mia-space.png"
            muted
            playsInline
            preload="none"
            onEnded={() => setPlaying(false)}
            aria-label={t(
              'Mia, Dean and Johnny welcome you to space',
              'מיה, דין וג׳וני מקבלים את פנייך בחלל',
            )}
          />
          <span className="intro-movie-label">✦ BABYLON ✦</span>
        </div>
        <div className="intro-copy">
          <DialogTitle>
            {t(
              'Your adventure starts here, Mia.',
              'ההרפתקה שלך מתחילה כאן, מיה.',
            )}
          </DialogTitle>
          <DialogDescription>
            {t(
              'With Dean, Johnny, Mum Lee & Dad Gal. And a whole galaxy of possibilities.',
              'עם דין, ג׳וני, אמא לי ואבא גל. וגלקסיה שלמה של אפשרויות.',
            )}
          </DialogDescription>
          {caption && (
            <p className="intro-caption" aria-live="polite">
              {caption}
            </p>
          )}
        </div>
        <div className="intro-actions">
          <button
            className="secondary-button intro-play"
            onClick={() => {
              if (playing) {
                stop();
                return;
              }
              if (video.current) {
                video.current.currentTime = 0;
                void video.current
                  .play()
                  .then(() => setPlaying(true))
                  .catch(() => setPlaying(false));
              }
              onPlay();
            }}
          >
            {playing ? <Pause size={20} /> : <Play size={20} />}{' '}
            {playing
              ? t('Pause intro', 'השהיית הפתיח')
              : t('Play my intro', 'הפעלת הפתיח שלי')}
          </button>
          <button className="primary-button intro-enter" onClick={onClose}>
            <Rocket size={20} />
            {t('Let’s play!', 'בואי נשחק!')}
          </button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
