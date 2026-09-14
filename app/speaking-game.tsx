'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { Check, LockKeyhole, Mic, Square, Star, Volume2 } from 'lucide-react';
import { Progress } from '@/components/ui/progress';
import type { Lang } from '@/lib/game-data';
import speakingLines from '@/lib/speaking-lines.json';
import audioManifest from '@/lib/audio-manifest.json';
import audioVersions from '@/lib/audio-versions.json';
import { createLessonPlayer, englishExampleId } from '@/lib/lesson-audio';
type SpeakingEvent = keyof typeof speakingLines;
import {
  englishCourse,
  englishPosition,
  ENGLISH_STORAGE,
  ENGLISH_TOTAL,
  restoreEnglishProgress,
  advanceEnglishProgress,
  levelStart,
  matchesSpeech,
} from '@/lib/english-course';
import {
  createSpeakingSession,
  recognitionConstructor,
} from '@/lib/speaking-session';

type Status =
  | 'ready'
  | 'starting'
  | 'listening'
  | 'example'
  | 'retry'
  | 'correct'
  | 'error';

export default function SpeakingGame({
  lang,
  sound,
  onStars,
  pickVoice,
}: {
  lang: Lang;
  sound: boolean;
  onStars: (stars: number) => void;
  pickVoice: (event: string, ids: string[]) => string | undefined;
}) {
  const t = (en: string, he: string) => (lang === 'en' ? en : he);
  const [loaded, setLoaded] = useState(false);
  const [supported, setSupported] = useState(false);
  const [progress, setProgress] = useState(0);
  const [level, setLevel] = useState(0);
  const [prompt, setPrompt] = useState(0);
  const [status, setStatus] = useState<Status>('ready');
  const [heard, setHeard] = useState('');
  const [error, setError] = useState('');
  const [levelDone, setLevelDone] = useState(false);
  const [saveFailed, setSaveFailed] = useState(false);
  const [narrating, setNarrating] = useState(false);
  const [caption, setCaption] = useState('');
  const [audioProblem, setAudioProblem] = useState(false);
  const player = useRef(createLessonPlayer((url) => new Audio(url)));
  const voiceEpoch = useRef(0);
  const screenEpoch = useRef({ value: 0 });
  const session = useRef<ReturnType<typeof createSpeakingSession> | null>(null);
  const advanceTimer = useRef<ReturnType<typeof setTimeout> | undefined>(
    undefined,
  );
  const frontier = useRef(0);
  const lesson = englishCourse[level];
  const item = lesson.prompts[prompt];

  const stopVoice = useCallback(() => {
    voiceEpoch.current++;
    player.current.stop();
    setNarrating(false);
    setCaption('');
  }, []);
  const playRecording = useCallback(
    async (id: string, language: Lang, text: string) => {
      stopVoice();
      const epoch = voiceEpoch.current;
      setCaption(text);
      setAudioProblem(false);
      if (!sound || document.hidden) return 'ended' as const;
      const key = `${language}/${id}`;
      if (!(audioManifest as Record<string, boolean>)[key]) {
        setAudioProblem(true);
        return 'failed' as const;
      }
      setNarrating(true);
      const version = (audioVersions as Record<string, string>)[key];
      const result = await player.current.play(
        `/audio/${key}.mp3${version ? `?v=${version}` : ''}`,
      );
      if (voiceEpoch.current !== epoch) return 'canceled' as const;
      setNarrating(false);
      if (result === 'failed') setAudioProblem(true);
      return result;
    },
    [sound, stopVoice],
  );
  const narrate = useCallback(
    (event: SpeakingEvent) => {
      const lines = speakingLines[event];
      const id = pickVoice(
        `${lang}/speaking-${event}`,
        lines.map((line) => line.id),
      );
      const line = lines.find((line) => line.id === id)!;
      return playRecording(line.id, lang, line[lang]);
    },
    [lang, playRecording, pickVoice],
  );
  const currentNarrate = useRef(narrate);
  useEffect(() => {
    currentNarrate.current = narrate;
  }, [narrate]);
  const stopAttempt = useCallback(() => {
    session.current?.cancel();
    session.current = null;
    stopVoice();
  }, [stopVoice]);

  // Match the arcade's hydration flow: browser storage must be read after SSR.
  /* eslint-disable react/react-compiler */
  useEffect(() => {
    const lifecycle = screenEpoch.current;
    let saved = 0;
    try {
      saved = restoreEnglishProgress(
        JSON.parse(localStorage.getItem(ENGLISH_STORAGE) || '0'),
      );
    } catch {
      /* Start at the first word if storage is unavailable or malformed. */
    }
    frontier.current = saved;
    setProgress(saved);
    const position = englishPosition(saved);
    setLevel(position.level);
    setPrompt(position.prompt);
    setLevelDone(saved === ENGLISH_TOTAL);
    onStars(Math.floor(saved / 50));
    setSupported(Boolean(recognitionConstructor()));
    setLoaded(true);
    return () => {
      lifecycle.value++;
      stopAttempt();
      clearTimeout(advanceTimer.current);
    };
    // Restoration belongs to this game run, not to language or sound changes.
  }, [onStars, stopAttempt]);
  /* eslint-enable react/react-compiler */

  useEffect(() => {
    const pause = () => {
      stopAttempt();
      setStatus((current) =>
        ['starting', 'listening', 'example'].includes(current)
          ? 'ready'
          : current,
      );
    };
    pause();
    const onVisibility = () => {
      if (document.hidden) pause();
    };
    document.addEventListener('visibilitychange', onVisibility);
    window.addEventListener('pagehide', pause);
    return () => {
      document.removeEventListener('visibilitychange', onVisibility);
      window.removeEventListener('pagehide', pause);
    };
  }, [sound, lang, stopAttempt]);

  useEffect(() => {
    if (!loaded || !sound) return;
    // Wait until restoration and the language/mute cleanup have completed.
    const timer = setTimeout(() => {
      void narrate('intro');
    }, 0);
    return () => clearTimeout(timer);
  }, [loaded, sound, narrate]);

  function chooseLevel(index: number) {
    if (levelStart(index) > frontier.current || status === 'correct') return;
    screenEpoch.current.value++;
    stopAttempt();
    clearTimeout(advanceTimer.current);
    setLevel(index);
    const start = levelStart(index);
    // Resume the frontier lesson, replay completed lessons from their beginning.
    setPrompt(
      frontier.current < start + englishCourse[index].prompts.length
        ? frontier.current - start
        : 0,
    );
    setLevelDone(false);
    setHeard('');
    setError('');
    setStatus('ready');
    void narrate(englishCourse[index].stage);
  }

  async function playExample() {
    if (!sound || status === 'correct' || narrating || session.current) return;
    stopAttempt();
    const screen = screenEpoch.current.value;
    setStatus('example');
    setHeard('');
    const result = await playRecording(
      englishExampleId(level, prompt),
      'en',
      item.en,
    );
    if (screenEpoch.current.value !== screen || result === 'canceled') return;
    if (result === 'failed') {
      setError('voice-unavailable');
      setStatus('error');
      return;
    }
    setStatus('ready');
  }

  function listen() {
    if (
      session.current ||
      narrating ||
      status === 'correct' ||
      status === 'example'
    )
      return;
    const Constructor = recognitionConstructor();
    if (!Constructor) {
      setSupported(false);
      return;
    }
    stopVoice();
    setHeard('');
    setError('');
    setStatus('starting');
    try {
      const attempt = createSpeakingSession(new Constructor(), {
        listening: () => setStatus('listening'),
        error: (reason) => {
          session.current = null;
          setError(reason);
          setStatus('error');
          void narrate(reason === 'no-speech' ? 'no-speech' : 'mic-help');
        },
        result: (transcript) => {
          session.current = null;
          setHeard(transcript);
          if (!matchesSpeech(transcript, item.en)) {
            setStatus('retry');
            void narrate('retry');
            return;
          }
          setStatus('correct');
          const next = advanceEnglishProgress(frontier.current, level, prompt);
          frontier.current = next;
          setProgress(next);
          try {
            localStorage.setItem(ENGLISH_STORAGE, JSON.stringify(next));
            setSaveFailed(false);
          } catch {
            setSaveFailed(true);
          }
          onStars(Math.floor(next / 50));
          const screen = screenEpoch.current.value;
          // Only a recognized answer reaches this path. Even muted/failed audio
          // can finish the celebration; navigation/unmount invalidate the result.
          void narrate('correct').then(() => {
            if (screenEpoch.current.value !== screen) return;
            advanceTimer.current = setTimeout(() => {
              if (screenEpoch.current.value !== screen) return;
              setHeard('');
              setStatus('ready');
              setCaption('');
              if (prompt + 1 === lesson.prompts.length) {
                setLevelDone(true);
                void currentNarrate.current(
                  level === englishCourse.length - 1
                    ? 'course-done'
                    : 'level-done',
                );
              } else setPrompt(prompt + 1);
            }, 450);
          });
        },
      });
      session.current = attempt;
      attempt.start();
    } catch {
      session.current = null;
      setStatus('error');
      setError('start-failed');
    }
  }

  const errors: Record<string, string> = {
    'not-allowed': t(
      'Ask a grown-up to allow the microphone for this site, then try again.',
      'בקשי ממבוגר לאפשר מיקרופון באתר ואז נסי שוב.',
    ),
    'service-not-allowed': t(
      'Speech recognition is blocked. Ask a grown-up to check browser permissions or open this game in Chrome or Safari.',
      'זיהוי הדיבור חסום. בקשי ממבוגר לבדוק הרשאות או לפתוח את המשחק בכרום או בספארי.',
    ),
    'audio-capture': t(
      'I can’t find a microphone. Ask a grown-up to check it, then try again.',
      'לא מצאתי מיקרופון. בקשי ממבוגר לבדוק אותו ואז נסי שוב.',
    ),
    network: t(
      'The connection slipped. Check the internet and try again.',
      'החיבור התנתק. בדקו את האינטרנט ונסי שוב.',
    ),
    'no-speech': t(
      'I didn’t catch that. Tap the microphone and try again.',
      'לא הצלחתי לשמוע. לחצי על המיקרופון ונסי שוב.',
    ),
    'language-not-supported': t(
      'English speech recognition is unavailable here. Try Chrome or Safari with English speech enabled.',
      'זיהוי דיבור באנגלית לא זמין כאן. נסו כרום או ספארי עם דיבור באנגלית.',
    ),
    'voice-unavailable': t(
      'The recording couldn’t play. Check your connection and tap Hear it to try again.',
      'ההקלטה לא התנגנה. בדקו את החיבור ולחצי שוב על הרמקול.',
    ),
  };
  const busy = status === 'starting' || status === 'listening';
  const stageLabel =
    lesson.stage === 'words'
      ? t('Words', 'מילים')
      : lesson.stage === 'phrases'
        ? t('Short phrases', 'צירופים קצרים')
        : t('Sentences', 'משפטים');

  if (!loaded)
    return (
      <output>{t('Getting your words ready…', 'מכינים את המילים שלך…')}</output>
    );

  return (
    <div className="speaking-game">
      <div className="game-heading speaking-heading">
        <span className="eyebrow">
          {t('ONE LITTLE WORD, ONE BIG ADVENTURE', 'מילה קטנה, הרפתקה גדולה')}
        </span>
        <h1>{t('Mia’s English Adventure', 'הרפתקת האנגלית של מיה')}</h1>
        <p>
          {t(
            'Listen, tap the microphone, and say it in English.',
            'הקשיבי, לחצי על המיקרופון ואמרי באנגלית.',
          )}
        </p>
      </div>
      <div className="speaking-coach">
        <button
          className="secondary-button"
          disabled={!sound || busy || status === 'correct'}
          onClick={() => {
            stopAttempt();
            setStatus('ready');
            void narrate(
              levelDone
                ? level === 29
                  ? 'course-done'
                  : 'level-done'
                : 'intro',
            );
          }}
        >
          <Volume2 size={20} />
          {t('Explain it to me', 'הסבירי לי איך משחקים')}
        </button>
        {narrating && (
          <button
            className="quiet-button"
            onClick={() => {
              stopVoice();
              setStatus((current) =>
                current === 'example' ? 'ready' : current,
              );
            }}
          >
            <Square size={16} />
            {t('Stop voice', 'עצרי את ההסבר')}
          </button>
        )}
        {caption && (
          <p className="speaking-coach-caption" aria-live="polite">
            {caption}
          </p>
        )}
        {audioProblem && (
          <p className="speaking-hint">
            {t(
              'The recording couldn’t play. Check your connection and try again.',
              'ההקלטה לא התנגנה. בדקו את החיבור ונסו שוב.',
            )}
          </p>
        )}
      </div>
      <div className="speaking-layout">
        <section
          className="speaking-board"
          aria-label={t('Speaking challenge', 'אתגר דיבור')}
        >
          <div className="speaking-level-heading">
            <span>
              {t(`Level ${level + 1} of 30`, `שלב ${level + 1} מתוך 30`)} ·{' '}
              {stageLabel}
            </span>
            <span>{levelDone ? 5 : prompt + 1} / 5</span>
          </div>
          <h2>{lesson.title[lang]}</h2>
          <Progress
            value={
              ((levelDone ? 5 : prompt + (status === 'correct' ? 1 : 0)) / 5) *
              100
            }
            aria-label={t('Level progress', 'התקדמות בשלב')}
          />
          {levelDone ? (
            <div className="speaking-complete" aria-live="polite">
              <span className="speaking-picture" aria-hidden="true">
                {level === 29 ? '🏆' : '🌟'}
              </span>
              <h3>
                {level === 29
                  ? t('You’re an English superstar!', 'את כוכבת באנגלית!')
                  : t('You said them all, Mia!', 'אמרת את הכול, מיה!')}
              </h3>
              <p>
                {level === 29
                  ? t(
                      '30 levels, 150 speaking challenges. Look how far you’ve come!',
                      '30 שלבים, 150 אתגרי דיבור. תראי כמה התקדמת!',
                    )
                  : t(
                      'Five little victories. Ready for your next adventure?',
                      'חמש הצלחות קטנות. מוכנה להרפתקה הבאה?',
                    )}
              </p>
              {level < 29 && (
                <button
                  className="primary-button"
                  onClick={() => chooseLevel(level + 1)}
                >
                  {t('Next level', 'לשלב הבא')} <Star size={19} />
                </button>
              )}
              <button
                className="quiet-button"
                onClick={() => chooseLevel(level)}
              >
                {t('Practice this level again', 'נתרגל שוב את השלב')}
              </button>
            </div>
          ) : (
            <>
              <div
                className={`speaking-prompt ${status === 'correct' ? 'is-correct' : ''}`}
              >
                <span className="speaking-picture" aria-hidden="true">
                  {status === 'correct' ? '🌟' : item.emoji}
                </span>
                <span className="speaking-say-label">
                  {t('Say it in English', 'אמרי באנגלית')}
                </span>
                <h3 dir="ltr" lang="en">
                  {item.en}
                </h3>
                <p dir="rtl" lang="he" className="speaking-translation">
                  {item.he}
                </p>
              </div>
              <div className="speaking-actions">
                <button
                  className="secondary-button"
                  onClick={playExample}
                  disabled={
                    !sound ||
                    status === 'correct' ||
                    status === 'example' ||
                    narrating ||
                    busy
                  }
                >
                  <Volume2 size={21} />
                  {status === 'example'
                    ? t('Listen…', 'הקשיבי…')
                    : t('Hear it', 'הקשיבי לדוגמה')}
                </button>
                <button
                  className={`primary-button speaking-mic ${busy ? 'is-listening' : ''}`}
                  disabled={
                    !supported ||
                    narrating ||
                    status === 'correct' ||
                    status === 'example'
                  }
                  onClick={() => {
                    if (busy) {
                      stopAttempt();
                      setStatus('ready');
                    } else listen();
                  }}
                >
                  {busy ? (
                    <Square size={22} />
                  ) : status === 'correct' ? (
                    <Check size={24} />
                  ) : (
                    <Mic size={24} />
                  )}
                  {busy
                    ? t('Stop listening', 'הפסיקי להקשיב')
                    : status === 'correct'
                      ? t('You got it!', 'הצלחת!')
                      : t('My turn to speak', 'תורי לדבר')}
                </button>
              </div>
              {!sound && (
                <p className="speaking-hint">
                  {t(
                    'Turn on sound at the top to hear the example.',
                    'הפעילי צלילים למעלה כדי לשמוע את הדוגמה.',
                  )}
                </p>
              )}
              <div
                className={`speaking-feedback ${status}`}
                aria-live="polite"
                aria-atomic="true"
              >
                {status === 'correct'
                  ? t('Yes! You said it! ✨', 'כן! אמרת את זה! ✨')
                  : status === 'retry'
                    ? t(
                        'Let’s try once more. Listen, then say the whole thing.',
                        'ננסה עוד פעם. הקשיבי ואז אמרי את הכול.',
                      )
                    : status === 'starting'
                      ? t(
                          'Getting the microphone ready…',
                          'מכינים את המיקרופון…',
                        )
                      : status === 'listening'
                        ? t('I’m listening. Your turn!', 'אני מקשיבה. תורך!')
                        : status === 'example'
                          ? t(
                              'Listen first. Then it’s your turn.',
                              'קודם הקשיבי. אחר כך תורך.',
                            )
                          : status === 'error'
                            ? (errors[error] ??
                              t(
                                'I couldn’t listen this time. Try again, or ask a grown-up for help.',
                                'לא הצלחתי להקשיב הפעם. נסי שוב או בקשי עזרה ממבוגר.',
                              ))
                            : t(
                                'Take your time. Your voice unlocks the next word.',
                                'יש לך זמן. הקול שלך פותח את האתגר הבא.',
                              )}
                {heard && (
                  <p>
                    {t('I heard:', 'שמעתי:')} <bdi lang="en">“{heard}”</bdi>
                  </p>
                )}
              </div>
              {!supported && (
                <p className="speaking-support" role="alert">
                  {t(
                    'This browser can’t listen to speech here. Ask a grown-up to open the game in Chrome or Safari over HTTPS and allow the microphone. Your place is safe.',
                    'הדפדפן הזה לא יכול להקשיב כאן. בקשי ממבוגר לפתוח את המשחק בכרום או בספארי דרך HTTPS ולאפשר מיקרופון. המקום שלך נשמר.',
                  )}
                </p>
              )}
            </>
          )}
        </section>
        <aside
          className="speaking-journey"
          aria-label={t('English learning path', 'מסלול לימוד האנגלית')}
        >
          <div className="speaking-journey-title">
            <Star size={22} />
            <h2>{t('Your English journey', 'מסע האנגלית שלך')}</h2>
          </div>
          <p>
            {t(
              `${progress} of ${ENGLISH_TOTAL} challenges mastered`,
              `${progress} מתוך ${ENGLISH_TOTAL} אתגרים הושלמו`,
            )}
          </p>
          <Progress
            value={(progress / ENGLISH_TOTAL) * 100}
            aria-label={t('English course progress', 'התקדמות בקורס האנגלית')}
          />
          {(['words', 'phrases', 'sentences'] as const).map((stage) => (
            <div className="speaking-stage" key={stage}>
              <h3>
                {stage === 'words'
                  ? t('1. Words', '1. מילים')
                  : stage === 'phrases'
                    ? t('2. Short phrases', '2. צירופים קצרים')
                    : t('3. Sentences', '3. משפטים')}
              </h3>
              <div className="speaking-levels">
                {englishCourse.map((courseLevel, index) => {
                  if (courseLevel.stage !== stage) return null;
                  const locked = levelStart(index) > progress;
                  const completed =
                    levelStart(index) + courseLevel.prompts.length <= progress;
                  return (
                    <button
                      key={index}
                      disabled={locked || status === 'correct'}
                      className={completed ? 'completed' : ''}
                      aria-current={index === level ? 'step' : undefined}
                      aria-label={`${t('Level', 'שלב')} ${index + 1}: ${courseLevel.title[lang]}${locked ? t(', locked', ', נעול') : completed ? t(', completed', ', הושלם') : ''}`}
                      title={courseLevel.title[lang]}
                      onClick={() => chooseLevel(index)}
                    >
                      <span>{index + 1}</span>
                      {locked ? (
                        <LockKeyhole size={12} />
                      ) : completed ? (
                        <Check size={13} />
                      ) : null}
                    </button>
                  );
                })}
              </div>
            </div>
          ))}
          <p className="speaking-hint">
            {t(
              'Earn an arcade star at levels 10, 20, and 30. You can revisit any completed level.',
              'קבלי כוכב ארקייד בשלבים 10, 20 ו־30. תמיד אפשר לחזור לשלב שהושלם.',
            )}
          </p>
          {saveFailed && (
            <p role="alert">
              {t(
                'Your browser couldn’t save your place. Keep this game open to continue.',
                'הדפדפן לא הצליח לשמור. השאירי את המשחק פתוח כדי להמשיך.',
              )}
            </p>
          )}
        </aside>
      </div>
      <details className="speaking-parent-note">
        <summary>
          {t(
            'For grown-ups: how listening works',
            'למבוגרים: איך ההקשבה עובדת',
          )}
        </summary>
        <p>
          {t(
            'The game checks whether the browser recognized the complete English word or sentence. It is not a pronunciation score; background noise and children’s voices can sometimes be misheard. Try a quiet room and listen to the example again. There is no skip or typed-answer option.',
            'המשחק בודק אם הדפדפן זיהה את כל המילה או המשפט באנגלית. זה אינו ציון הגייה; לפעמים קולות ילדים ורעש רקע אינם מזוהים היטב. נסו חדר שקט והקשיבו שוב לדוגמה. אין אפשרות לדלג או להקליד תשובה.',
          )}
        </p>
        <p>
          {t(
            'The microphone runs only after a tap and stops after each attempt. The browser’s speech service may send audio for processing and need internet. This game does not save recordings or transcripts; only learning progress is saved on this device.',
            'המיקרופון פועל רק לאחר לחיצה ונעצר בסוף כל ניסיון. שירות הדיבור של הדפדפן עשוי לשלוח קול לעיבוד ולדרוש אינטרנט. המשחק אינו שומר הקלטות או תמלילים; רק ההתקדמות נשמרת במכשיר הזה.',
          )}
        </p>
      </details>
    </div>
  );
}
