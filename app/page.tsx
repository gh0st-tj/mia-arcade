'use client';

import { useEffect, useRef, useState } from 'react';
import {
  ArrowLeft,
  Gamepad2,
  Heart,
  Sparkles,
  Star,
  Volume2,
  VolumeX,
  Trophy,
  RotateCcw,
  Home,
  Play,
} from 'lucide-react';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Progress } from '@/components/ui/progress';
import {
  games,
  instructionFor,
  instructionKey,
  type Lang,
  type GameId,
} from '@/lib/game-data';
import { levelFor } from '@/lib/game-engine';
import Game from './game';
import SequenceGame from './sequence-game';
import WelcomeScene from './welcome-scene';
import IntroWelcome from './intro-welcome';
import voiceLines from '@/lib/voice-lines.json';
import { createVoicePicker } from '@/lib/voice-picker';
import audioManifest from '@/lib/audio-manifest.json';

export default function Arcade() {
  const [lang, setLang] = useState<Lang>('en');
  const [sound, setSound] = useState(true);
  const [active, setActive] = useState<GameId | null>(null);
  const [stars, setStars] = useState<Record<string, number>>({});
  const [ready, setReady] = useState(false);
  const [run, setRun] = useState(0);
  const [won, setWon] = useState(false);
  const [perfect, setPerfect] = useState(false);
  const [tab, setTab] = useState('play');
  const [welcomeReplay, setWelcomeReplay] = useState(0);
  const [introOpen, setIntroOpen] = useState(false);
  const [introCaption, setIntroCaption] = useState('');
  const voicePicker = useRef(createVoicePicker());
  const audio = useRef<HTMLAudioElement | null>(null);
  const t = (en: string, he: string) => (lang === 'en' ? en : he);
  // Preferences are browser-only; restore after hydration so server markup stays stable.
  /* eslint-disable react/react-compiler */
  useEffect(() => {
    try {
      const saved = JSON.parse(localStorage.getItem('mia-arcade-v1') || '{}');
      setStars(
        Object.fromEntries(
          games.map((g) => [
            g.id,
            Math.max(
              0,
              Math.min(
                3,
                Number.isFinite(saved.stars?.[g.id])
                  ? Math.floor(saved.stars[g.id])
                  : 0,
              ),
            ),
          ]),
        ),
      );
      setLang(saved.lang === 'he' ? 'he' : 'en');
      setSound(saved.sound !== false);
    } catch {}
    try {
      setIntroOpen(localStorage.getItem('mia-intro-seen-v1') !== '1');
    } catch {
      setIntroOpen(true);
    }
    setReady(true);
  }, []);
  /* eslint-enable react/react-compiler */
  useEffect(() => {
    if (ready)
      try {
        localStorage.setItem(
          'mia-arcade-v1',
          JSON.stringify({ stars, lang, sound }),
        );
      } catch {}
  }, [stars, lang, sound, ready]);
  useEffect(() => {
    document.documentElement.lang = lang;
    document.documentElement.dir = lang === 'he' ? 'rtl' : 'ltr';
  }, [lang]);
  const stopAudio = () => {
    audio.current?.pause();
    audio.current = null;
    if (typeof speechSynthesis !== 'undefined') speechSynthesis.cancel();
  };
  const speak = (key: string, text: string) => {
    stopAudio();
    const lines = (
      voiceLines as Record<string, { id: string; en: string; he: string }[]>
    )[key];
    const id = voicePicker.current(
      `${lang}/${key}`,
      lines?.map((line) => line.id) ?? [],
    );
    const line = lines?.find((line) => line.id === id);
    text = line?.[lang] ?? text;
    key = line?.id ?? key;
    if (key === 'intro' || key.startsWith('intro-')) setIntroCaption(text);
    if (!sound) return;
    let fallbackStarted = false;
    const fallback = () => {
      if (fallbackStarted) return;
      fallbackStarted = true;
      if (typeof speechSynthesis !== 'undefined') {
        const s = new SpeechSynthesisUtterance(text);
        s.lang = lang === 'he' ? 'he-IL' : 'en-US';
        s.rate = 0.85;
        speechSynthesis.speak(s);
      }
    };
    if (!(audioManifest as Record<string, boolean>)[`${lang}/${key}`]) {
      fallback();
      return;
    }
    const a = new Audio(`/audio/${lang}/${key}.mp3`);
    audio.current = a;
    const onFailure = () => {
      if (audio.current === a) fallback();
    };
    a.onerror = onFailure;
    a.play().catch(onFailure);
  };
  const enter = (id: GameId) => {
    stopAudio();
    setActive(id);
    setWon(false);
    setPerfect(false);
    setRun((x) => x + 1);
    const level = levelFor(stars[id]);
    speak(instructionKey(id, level), instructionFor(id, level, lang));
  };
  const back = () => {
    stopAudio();
    setActive(null);
    setWon(false);
  };
  const win = (flawless: boolean) => {
    setWon(true);
    setPerfect(flawless);
    setStars((s) => ({ ...s, [active!]: Math.min(3, (s[active!] || 0) + 1) }));
    speak(
      'win',
      t(
        'Amazing, Mia! You earned a star! Lee, Gal, Dean and Johnny are cheering for you!',
        'כל הכבוד מיה! זכית בכוכב! לי, גל, דין וג׳וני שמחים איתך!',
      ),
    );
  };
  const actionsRef = useRef({ enter, back, active, stars });
  useEffect(() => {
    actionsRef.current = { enter, back, active, stars };
  });
  useEffect(() => {
    const context = (
      document as unknown as {
        modelContext?: {
          registerTool: (
            tool: unknown,
            options: { signal: AbortSignal },
          ) => void | Promise<void>;
        };
      }
    ).modelContext;
    if (!context?.registerTool) return;
    const lifecycle = new AbortController();
    const options = { signal: lifecycle.signal };
    const register = (tool: unknown) => {
      try {
        void Promise.resolve(context.registerTool(tool, options)).catch(
          () => {},
        );
      } catch {}
    };
    register({
      name: 'get_arcade_state',
      description: 'Read the current game and Mia’s locally collected stars.',
      inputSchema: {
        type: 'object',
        properties: {},
        additionalProperties: false,
      },
      annotations: { readOnlyHint: true },
      execute: () => ({
        game: actionsRef.current.active,
        stars: actionsRef.current.stars,
        games: games.map((g) => ({ id: g.id, title: g.title })),
      }),
    });
    register({
      name: 'start_arcade_game',
      description:
        'Open one of the nine games for Mia to play. Does not answer questions or award stars.',
      inputSchema: {
        type: 'object',
        properties: { game: { type: 'string', enum: games.map((g) => g.id) } },
        required: ['game'],
        additionalProperties: false,
      },
      annotations: { readOnlyHint: false },
      execute: async (input: unknown) => {
        const id = (input as { game?: unknown })?.game;
        if (typeof id !== 'string' || !games.some((g) => g.id === id))
          throw Error('Choose a valid arcade game.');
        actionsRef.current.enter(id as GameId);
        await new Promise<void>((resolve) =>
          requestAnimationFrame(() => resolve()),
        );
        return { started: actionsRef.current.active };
      },
    });
    return () => lifecycle.abort();
  }, []);
  const closeIntro = () => {
    stopAudio();
    setIntroOpen(false);
    try {
      localStorage.setItem('mia-intro-seen-v1', '1');
    } catch {}
  };
  const total = Object.values(stars).reduce((a, b) => a + b, 0);
  const selected = games.find((g) => g.id === active);
  return (
    <div className="arcade-shell" dir={lang === 'he' ? 'rtl' : 'ltr'}>
      {ready && introOpen && (
        <IntroWelcome
          lang={lang}
          sound={sound}
          caption={introCaption}
          onPlay={() => speak('intro', '')}
          onClose={closeIntro}
          onStop={stopAudio}
          onLanguage={() => {
            setIntroCaption('');
            setLang(lang === 'en' ? 'he' : 'en');
          }}
          onSound={() => {
            stopAudio();
            setSound(!sound);
          }}
        />
      )}
      <header className="topbar">
        <button
          className="brand"
          onClick={back}
          aria-label={t('Mia’s arcade home', 'הארקייד של מיה')}
        >
          <span className="brand-icon">
            <Gamepad2 size={29} />
          </span>
          <span>
            BABYLON<span className="brand-sub">MIA’S LITTLE ARCADE</span>
          </span>
        </button>
        <div className="top-controls">
          <div className="star-counter">
            <Star size={19} fill="currentColor" />
            <b>{total}</b>
            <span>{t('stars', 'כוכבים')}</span>
          </div>
          <button
            className="icon-button"
            aria-label={t(
              sound ? 'Mute sound' : 'Enable sound',
              sound ? 'כיבוי צלילים' : 'הפעלת צלילים',
            )}
            onClick={() => {
              stopAudio();
              setSound(!sound);
            }}
          >
            {sound ? <Volume2 size={21} /> : <VolumeX size={21} />}
          </button>
          <button
            className="language-button"
            onClick={() => {
              stopAudio();
              setLang(lang === 'en' ? 'he' : 'en');
            }}
          >
            {lang === 'en' ? 'עברית' : 'English'}
          </button>
          <div className="avatar" aria-label="Mia">
            M<span>✦</span>
          </div>
        </div>
      </header>
      <main>
        {active && selected ? (
          <section
            className="game-view"
            style={{ '--game-color': selected.color } as React.CSSProperties}
          >
            <div className="game-toolbar">
              <button className="quiet-button" onClick={back}>
                <ArrowLeft size={19} />
                {t('All games', 'כל המשחקים')}
              </button>
              <span className="game-category">{selected.skill[lang]}</span>
              <button
                className="icon-button"
                aria-label={t('Restart game', 'התחלה מחדש')}
                onClick={() => enter(active)}
              >
                <RotateCcw size={20} />
              </button>
            </div>
            {won ? (
              <div className="celebration">
                <div className="star-burst" aria-hidden="true">
                  ✦
                </div>
                <div className="celebration-stars">⭐ ⭐ ⭐</div>
                <p className="eyebrow">
                  {t('ONE MORE LITTLE VICTORY', 'עוד הצלחה קטנה')}
                </p>
                <h1>{t('You did it, Mia!', 'הצלחת, מיה!')}</h1>
                <p>
                  {perfect && active === 'memory'
                    ? t('What a sharp memory! Wow!', 'איזה זיכרון חד! וואו!')
                    : perfect
                      ? t(
                          'Every answer right on the first try. Wow!',
                          'כל התשובות נכונות בפעם הראשונה. וואו!',
                        )
                      : t(
                          'A new star for our superstar.',
                          'כוכב חדש לכוכבת שלנו.',
                        )}
                </p>
                {(stars[active] || 0) < 3 && (
                  <p className="level-up-note">
                    {t(
                      'Play again for a trickier level and your next star!',
                      'שחקי שוב לשלב קשה יותר ולכוכב הבא!',
                    )}
                  </p>
                )}
                <p className="family-cheer">
                  {t(
                    'Mum Lee, Dad Gal, Dean & Johnny are cheering for you!',
                    'אמא לי, אבא גל, דין וג׳וני שמחים איתך!',
                  )}{' '}
                  💜
                </p>
                <div className="win-actions">
                  <button className="primary-button" onClick={back}>
                    <Home size={20} />
                    {t('More adventures', 'עוד הרפתקאות')}
                  </button>
                  <button
                    className="secondary-button"
                    onClick={() => enter(active)}
                  >
                    <RotateCcw size={20} />
                    {t('Play again', 'שוב!')}
                  </button>
                </div>
              </div>
            ) : (
              <>
                <div className="game-heading">
                  <span className="eyebrow">
                    {t('LET’S PLAY TOGETHER', 'בואי נשחק יחד')}
                  </span>
                  <h1>{selected.title[lang]}</h1>
                  <button
                    className="instruction"
                    onClick={() =>
                      speak(
                        instructionKey(active, levelFor(stars[active])),
                        instructionFor(active, levelFor(stars[active]), lang),
                      )
                    }
                  >
                    <Volume2 size={20} />
                    {instructionFor(active, levelFor(stars[active]), lang)}
                  </button>
                </div>
                {active === 'sequence' ? (
                  <SequenceGame
                    key={`${active}-${run}-${lang}`}
                    lang={lang}
                    level={levelFor(stars[active])}
                    onWin={win}
                    speak={speak}
                    sound={sound}
                  />
                ) : (
                  <Game
                    key={`${active}-${run}-${lang}`}
                    id={active}
                    lang={lang}
                    level={levelFor(stars[active])}
                    onWin={win}
                    speak={speak}
                    sound={sound}
                  />
                )}
              </>
            )}
          </section>
        ) : (
          <>
            <section className="welcome">
              <div className="welcome-copy">
                <div className="welcome-label">
                  <span /> {t('YOUR VERY OWN HAPPY PLACE', 'המקום השמח שלך')}
                </div>
                <h1>
                  {t('Hey, Mia!', 'היי, מיה!')} <span className="wave">✦</span>
                  <br />
                  {t('Let’s play.', 'בואי נשחק.')}
                </h1>
                <p>
                  <span className="welcome-extra">
                    {t(
                      'Big adventures for our little superstar.',
                      'הרפתקאות גדולות לכוכבת הקטנה שלנו.',
                    )}
                    <br />
                  </span>
                  {t(
                    'Pick a game. Play your way. Shine bright.',
                    'בחרי משחק, שחקי בכיף ואספי כוכבים.',
                  )}
                </p>
                <button
                  className="welcome-audio"
                  onClick={() => {
                    setWelcomeReplay((value) => value + 1);
                    speak(
                      'welcome',
                      t(
                        'Welcome to your Babylon arcade, Mia! Choose a game and let’s play!',
                        'ברוכה הבאה לבבילון שלך, מיה! בחרי משחק ובואי נשחק!',
                      ),
                    );
                  }}
                >
                  <span>
                    <Volume2 size={18} />
                  </span>
                  {t('A little hello for Mia', 'ברכה קטנה למיה')}
                  <Play size={13} fill="currentColor" />
                </button>
                <button
                  className="intro-launch quiet-button"
                  onClick={() => {
                    stopAudio();
                    setIntroCaption('');
                    setIntroOpen(true);
                  }}
                >
                  <Play size={17} />
                  {t('Watch my intro', 'הפתיח שלי')}
                </button>
              </div>
              <div className="welcome-art">
                <WelcomeScene lang={lang} replay={welcomeReplay} />
                <div className="art-label">
                  <Sparkles size={15} />
                  {t('Made just for you', 'נוצר במיוחד בשבילך')}
                </div>
              </div>
            </section>
            <Tabs
              value={tab}
              onValueChange={(v) => setTab(String(v))}
              className="arcade-tabs"
            >
              <div className="section-heading">
                <TabsList className="lobby-tabs">
                  <TabsTrigger value="play">
                    <Gamepad2 size={19} />
                    {t('Let’s play', 'בואי נשחק')}
                  </TabsTrigger>
                  <TabsTrigger value="stars">
                    <Star size={18} />
                    {t('My stars', 'הכוכבים שלי')}
                  </TabsTrigger>
                </TabsList>
                <span className="gentle-note">
                  <Heart size={15} />
                  {t('Little steps. Lots of happy.', 'בקצב שלך, עם המון שמחה.')}
                </span>
              </div>
              <TabsContent value="play">
                <div className="game-grid">
                  {games.map((g, i) => (
                    <button
                      key={g.id}
                      className={`game-card card-${g.id}`}
                      style={{ '--game-color': g.color } as React.CSSProperties}
                      onClick={() => enter(g.id)}
                      aria-label={`${t('Play', 'שחקי')} ${g.title[lang]}`}
                    >
                      <div className="card-art">
                        <span className="game-number">0{i + 1}</span>
                        <span className="skill-badge">{g.skill[lang]}</span>
                        <div
                          className={`preview preview-${g.id}`}
                          aria-hidden="true"
                        >
                          {g.id === 'count' ? (
                            <>
                              <span>⭐</span>
                              <span>⭐</span>
                              <span>⭐</span>
                              <b>1 2 3</b>
                            </>
                          ) : g.id === 'colors' ? (
                            <>
                              <i style={{ background: '#f987b7' }} />
                              <i style={{ background: '#ffcf60' }} />
                              <i style={{ background: '#74e2c8' }} />
                              <span>🎨</span>
                            </>
                          ) : g.id === 'memory' ? (
                            <>
                              <span>🐶</span>
                              <span>✦</span>
                              <span>✦</span>
                              <span>🐶</span>
                            </>
                          ) : g.id === 'shapes' ? (
                            <>
                              <span>●</span>
                              <span>▲</span>
                              <span>■</span>
                            </>
                          ) : g.id === 'patterns' ? (
                            <>
                              <span>🍓</span>
                              <span>🍋</span>
                              <span>🍓</span>
                              <b>?</b>
                            </>
                          ) : g.id === 'sums' ? (
                            <>
                              <span>3</span>
                              <i>+</i>
                              <span>4</span>
                              <b>🚀</b>
                            </>
                          ) : g.id === 'letters' ? (
                            <>
                              <b>{lang === 'en' ? '⭐' : '⭐'}</b>
                              {(lang === 'en' ? 'ST?R' : 'כו?ב')
                                .split('')
                                .map((ch, i) => (
                                  <span
                                    key={i}
                                    className={ch === '?' ? 'gap' : ''}
                                  >
                                    {ch}
                                  </span>
                                ))}
                            </>
                          ) : g.id === 'sequence' ? (
                            <>
                              <span>🪐</span>
                              <span>🌍</span>
                              <span>🌕</span>
                              <span>☀️</span>
                            </>
                          ) : (
                            <>
                              <span>1</span>
                              <span>2</span>
                              <span>3</span>
                            </>
                          )}
                        </div>
                        <div className="card-art-stars">
                          ✧<span>✦</span>✧
                        </div>
                      </div>
                      <div className="card-body">
                        <div>
                          <h2>{g.title[lang]}</h2>
                          <p>{g.description[lang]}</p>
                        </div>
                        <span className="card-play">
                          <Play size={20} fill="currentColor" />
                        </span>
                      </div>
                      <div className="card-bottom">
                        <span>{g.ages[lang]}</span>
                        <span
                          className="mini-stars"
                          aria-label={`${stars[g.id] || 0} / 3`}
                        >
                          {[0, 1, 2].map((n) => (
                            <Star
                              key={n}
                              size={13}
                              fill={
                                (stars[g.id] || 0) > n ? 'currentColor' : 'none'
                              }
                              className={(stars[g.id] || 0) > n ? 'earned' : ''}
                            />
                          ))}
                        </span>
                      </div>
                    </button>
                  ))}
                </div>
              </TabsContent>
              <TabsContent value="stars">
                <section className="collection">
                  <div className="collection-heading">
                    <Trophy size={36} />
                    <h2>
                      {t('Mia’s little constellation', 'קבוצת הכוכבים של מיה')}
                    </h2>
                    <p>
                      {t(
                        'Finish a game to earn a star. Play again to collect all three!',
                        'סיימי משחק כדי לזכות בכוכב. שחקי שוב כדי לאסוף שלושה!',
                      )}
                    </p>
                    <Progress
                      value={(total / (games.length * 3)) * 100}
                      aria-label={t(
                        'Star collection progress',
                        'התקדמות אוסף הכוכבים',
                      )}
                    />
                    <b>
                      {total} / {games.length * 3} ⭐
                    </b>
                  </div>
                  <div className="star-games">
                    {games.map((g) => (
                      <button key={g.id} onClick={() => enter(g.id)}>
                        <span>{g.emoji}</span>
                        <h3>{g.title[lang]}</h3>
                        <div>
                          {[0, 1, 2].map((n) => (
                            <Star
                              key={n}
                              fill={(stars[g.id] || 0) > n ? '#ffda78' : 'none'}
                              color={
                                (stars[g.id] || 0) > n ? '#ffda78' : '#706683'
                              }
                            />
                          ))}
                        </div>
                      </button>
                    ))}
                  </div>
                </section>
              </TabsContent>
            </Tabs>
            <div className="family-note">
              <Heart size={18} />
              <span>
                {t(
                  'A whole universe of love. From Mum Lee, Dad Gal, baby Dean & Johnny.',
                  'עולם שלם של אהבה. מאמא לי, אבא גל, התינוק דין וג׳וני.',
                )}
              </span>
              <span>🐾</span>
            </div>
          </>
        )}
      </main>
      <footer>
        <span>
          BABYLON <span>×</span> MIA
        </span>
        <p>
          {t(
            'Made for little hands & big imaginations',
            'לידיים קטנות ולדמיון גדול',
          )}{' '}
          <Heart size={12} />
        </p>
        <span>{t('Always free to play', 'תמיד אפשר לשחק')}</span>
      </footer>
    </div>
  );
}
