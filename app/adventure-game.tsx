'use client';
import { useRef, useState } from 'react';
import {
  ArrowDown,
  ArrowLeft,
  ArrowRight,
  ArrowUp,
  Check,
  Minus,
  Plus,
  Star,
} from 'lucide-react';
import { Progress } from '@/components/ui/progress';
import {
  makeTrail,
  neighbors,
  makeMarket,
  groceries,
  makeRobot,
  robotColors,
  robotParts,
  type AdventureId,
} from '@/lib/adventure-engine';
import type { Level } from '@/lib/game-engine';
import type { Lang } from '@/lib/game-data';
type Props = {
  id: AdventureId;
  lang: Lang;
  level: Level;
  speak: (key: string, text: string) => void;
  onWin: (perfect: boolean) => void;
};
type RoundProps = Omit<Props, 'onWin'> & {
  round: number;
  solved: boolean;
  onSolved: (perfect: boolean) => void;
};
const ROUNDS = 3;

export default function AdventureGame({
  id,
  lang,
  level,
  speak,
  onWin,
}: Props) {
  const [round, setRound] = useState(0);
  const [solved, setSolved] = useState(false);
  const perfect = useRef(true);
  const locked = useRef(false);
  const t = (en: string, he: string) => (lang === 'en' ? en : he);
  const onSolved = (firstTry: boolean) => {
    if (locked.current) return;
    locked.current = true;
    perfect.current = perfect.current && firstTry;
    setSolved(true);
    speak('correct', t('You did it, Mia!', 'הצלחת, מיה!'));
  };
  const next = () => {
    if (!locked.current) return;
    if (round === ROUNDS - 1) {
      onWin(perfect.current);
      return;
    }
    locked.current = false;
    setSolved(false);
    setRound((r) => r + 1);
  };
  const props = { id, lang, level, speak, round, solved, onSolved };
  return (
    <div className={`game-board board-${id} adventure-board level-${level}`}>
      <div className="round-progress">
        <span>
          {t(
            `Adventure ${round + 1} of ${ROUNDS}`,
            `הרפתקה ${round + 1} מתוך ${ROUNDS}`,
          )}
        </span>
        <Progress
          value={((round + Number(solved)) / ROUNDS) * 100}
          aria-label={t('Game progress', 'התקדמות במשחק')}
        />
        <span>{t(`Level ${level + 1}`, `שלב ${level + 1}`)}</span>
      </div>
      {id === 'trail' ? (
        <Trail key={round} {...props} />
      ) : id === 'market' ? (
        <Market key={round} {...props} />
      ) : (
        <Robot key={round} {...props} />
      )}
      {solved && (
        <>
          <output className="game-feedback good">
            <Check size={20} />
            {t('You did it, Mia!', 'הצלחת, מיה!')}
          </output>
          <button className="primary-button next-button" onClick={next}>
            {round === ROUNDS - 1 ? (
              <Star size={20} />
            ) : (
              <ArrowRight size={20} />
            )}{' '}
            {round === ROUNDS - 1
              ? t('Collect my star', 'לאסוף את הכוכב שלי')
              : t('Next adventure!', 'להרפתקה הבאה!')}
          </button>
        </>
      )}
    </div>
  );
}
function Trail({ lang, level, round, solved, onSolved, speak }: RoundProps) {
  const [map] = useState(() => makeTrail(level, round));
  const [position, setPosition] = useState(map.start);
  const [collected, setCollected] = useState<number[]>([]);
  const [message, setMessage] = useState('');
  const t = (en: string, he: string) => (lang === 'en' ? en : he);
  const move = (cell: number) => {
    if (solved) return;
    if (
      !neighbors(position, map.size).includes(cell) ||
      map.rocks.includes(cell)
    ) {
      setMessage(
        t('Try a glowing square beside Johnny.', 'נסי משבצת מוארת ליד ג׳וני.'),
      );
      speak('trail-blocked', '');
      return;
    }
    setPosition(cell);
    setMessage('');
    const found =
      map.treats.includes(cell) && !collected.includes(cell)
        ? [...collected, cell]
        : collected;
    setCollected(found);
    if (cell === map.goal) {
      if (found.length === map.treats.length) onSolved(true);
      else
        setMessage(
          t(
            'Find the bone first, then come home!',
            'קודם מצאי את העצם ואז חזרי הביתה!',
          ),
        );
    }
  };
  const direction = (delta: number) => move(position + delta);
  const arrows = [
    { name: t('Up', 'למעלה'), delta: -map.size, Icon: ArrowUp },
    { name: t('Left', 'שמאלה'), delta: -1, Icon: ArrowLeft },
    { name: t('Down', 'למטה'), delta: map.size, Icon: ArrowDown },
    { name: t('Right', 'ימינה'), delta: 1, Icon: ArrowRight },
  ];
  return (
    <>
      <div className="trail-mission">
        <span className={collected.length ? 'found' : ''}>
          🦴 {collected.length}/1
        </span>
        <span>→</span>
        <span>🏠 {t('Home', 'הביתה')}</span>
      </div>
      <div
        className="trail-map"
        dir="ltr"
        style={{ gridTemplateColumns: `repeat(${map.size},1fr)` }}
        aria-label={t('Johnny’s treasure map', 'מפת האוצר של ג׳וני')}
      >
        {Array.from({ length: map.size * map.size }, (_, cell) => {
          const rock = map.rocks.includes(cell),
            dog = cell === position,
            bone = map.treats.includes(cell) && !collected.includes(cell),
            home = cell === map.goal;
          const nearby = neighbors(position, map.size).includes(cell) && !rock;
          return (
            <button
              key={cell}
              data-cell={cell}
              data-rock={rock}
              data-dog={dog}
              data-bone={bone}
              data-home={home}
              disabled={solved || rock || dog}
              className={`trail-cell ${rock ? 'rock' : ''} ${nearby ? 'nearby' : ''} ${dog ? 'johnny' : ''}`}
              onClick={() => move(cell)}
              aria-label={`${t('Row', 'שורה')} ${Math.floor(cell / map.size) + 1}, ${t('column', 'עמודה')} ${(cell % map.size) + 1}: ${dog ? t('Johnny', 'ג׳וני') : rock ? t('rock', 'אבן') : bone ? t('bone', 'עצם') : home ? t('home', 'בית') : t('path', 'שביל')}`}
            >
              <span aria-hidden="true">
                {dog ? '🐶' : rock ? '🪨' : bone ? '🦴' : home ? '🏠' : '·'}
              </span>
            </button>
          );
        })}
      </div>
      {!solved && (
        <>
          <div className="trail-controls" dir="ltr">
            {arrows.map(({ name, delta, Icon }) => (
              <button
                key={name}
                className="secondary-button"
                disabled={
                  !neighbors(position, map.size).includes(position + delta) ||
                  map.rocks.includes(position + delta)
                }
                aria-label={name}
                onClick={() => direction(delta)}
              >
                <Icon size={23} />
              </button>
            ))}
          </div>
          <output className="adventure-hint" aria-live="polite">
            {message ||
              t(
                'Tap a glowing square, or use the arrows.',
                'לחצי על משבצת מוארת או השתמשי בחצים.',
              )}
          </output>
        </>
      )}
    </>
  );
}
function Market({ lang, level, round, solved, onSolved, speak }: RoundProps) {
  const [list] = useState(() => makeMarket(level, round));
  const [basket, setBasket] = useState([0, 0, 0, 0]);
  const [checked, setChecked] = useState(false);
  const missed = useRef(false);
  const t = (en: string, he: string) => (lang === 'en' ? en : he);
  const adjust = (i: number, delta: number) => {
    setBasket((b) =>
      b.map((v, j) => (i === j ? Math.max(0, Math.min(4, v + delta)) : v)),
    );
    setChecked(false);
  };
  const check = () => {
    if (solved) return;
    if (list.every((n, i) => n === basket[i])) onSolved(!missed.current);
    else {
      missed.current = true;
      setChecked(true);
      speak('market-retry', '');
    }
  };
  return (
    <>
      <div className="shopping-note">
        <h2>{t('Our picnic list', 'הרשימה לפיקניק')}</h2>
        <ul className="shopping-list">
          {list.map(
            (n, i) =>
              n > 0 && (
                <li key={i} data-item={i} data-quantity={n}>
                  <span aria-hidden="true">{groceries[i].emoji.repeat(n)}</span>
                  <b>
                    {n}{' '}
                    {n === 1
                      ? groceries[i][lang === 'en' ? 'enOne' : 'heOne']
                      : groceries[i][lang]}
                  </b>
                </li>
              ),
          )}
        </ul>
      </div>
      <h3 className="basket-title">
        🧺 {t('Pack your basket', 'ארזי את הסל שלך')}
      </h3>
      <div className="market-shelves">
        {groceries.map((item, i) => (
          <div
            className={`market-item ${checked && basket[i] !== list[i] ? 'needs-check' : ''}`}
            key={item.en}
            data-item={i}
          >
            <span className="food-emoji" aria-hidden="true">
              {item.emoji}
            </span>
            <span className="food-name">{item[lang]}</span>
            <div className="quantity-control" dir="ltr">
              <button
                disabled={solved || basket[i] === 0}
                onClick={() => adjust(i, -1)}
                aria-label={`${t('Remove', 'הסרת')} ${item[lang]}`}
              >
                <Minus size={19} />
              </button>
              <output aria-label={`${item[lang]}: ${basket[i]}`}>
                {basket[i]}
              </output>
              <button
                disabled={solved || basket[i] === 4}
                onClick={() => adjust(i, 1)}
                aria-label={`${t('Add', 'הוספת')} ${item[lang]}`}
              >
                <Plus size={19} />
              </button>
            </div>
          </div>
        ))}
      </div>
      {!solved && (
        <>
          <output className="adventure-hint" aria-live="polite">
            {checked
              ? t(
                  'Check the marked food. Add or take away to match the list.',
                  'בדקי את האוכל המסומן. הוסיפי או הוציאי לפי הרשימה.',
                )
              : t(
                  'Only pack the food on the list.',
                  'ארזי רק את האוכל שברשימה.',
                )}
          </output>
          <button className="primary-button check-basket" onClick={check}>
            <Check size={20} />
            {t('Check my basket', 'בדיקת הסל שלי')}
          </button>
        </>
      )}
    </>
  );
}
function Robot({ lang, level, solved, onSolved, speak }: RoundProps) {
  const [model] = useState(() => makeRobot(level));
  const [paint, setPaint] = useState<number | null>(null);
  const [painted, setPainted] = useState<number[]>([-1, -1, -1, -1, -1]);
  const [checked, setChecked] = useState(false);
  const [hint, setHint] = useState('');
  const missed = useRef(false);
  const t = (en: string, he: string) => (lang === 'en' ? en : he);
  const palette = [...new Set(model)].sort((a, b) => a - b);
  const putPaint = (i: number) => {
    if (solved) return;
    if (paint === null) {
      setHint(
        t(
          'Pick a paint first, then tap a robot part.',
          'בחרי קודם צבע ואז לחצי על חלק של הרובוט.',
        ),
      );
      return;
    }
    setPainted((prev) => prev.map((v, j) => (j === i ? paint : v)));
    setChecked(false);
    setHint('');
  };
  const check = () => {
    if (model.every((v, i) => v === painted[i])) onSolved(!missed.current);
    else {
      missed.current = true;
      setChecked(true);
      setHint(
        t(
          'Look at the marked parts. Match their colors to the little robot.',
          'הסתכלי בחלקים המסומנים. התאימי את הצבעים לרובוט הקטן.',
        ),
      );
      speak('retry', '');
    }
  };
  return (
    <>
      <div className="robot-workshop">
        <div className="robot-blueprint">
          <h2>{t('Tom’s little plan', 'הדגם של טום')}</h2>
          <div className="robot-shape mini-robot" dir="ltr">
            {robotParts.map((part, i) => (
              <span
                key={part.id}
                className={`robot-part part-${part.id}`}
                data-part={part.id}
                data-paint={model[i]}
                style={
                  {
                    '--paint': robotColors[model[i]].color,
                  } as React.CSSProperties
                }
                aria-label={`${part[lang]}: ${robotColors[model[i]][lang]}`}
              >
                <span>{robotColors[model[i]].symbol}</span>
                {i === 0 && <i className="robot-eyes">••</i>}
              </span>
            ))}
          </div>
        </div>
        <div className="robot-build">
          <h3>{t('Your robot', 'הרובוט שלך')}</h3>
          <div
            className={`robot-shape big-robot ${solved ? 'robot-happy' : ''}`}
            dir="ltr"
          >
            {robotParts.map((part, i) => (
              <button
                key={part.id}
                data-part={part.id}
                disabled={solved}
                onClick={() => putPaint(i)}
                className={`robot-part part-${part.id} ${checked && painted[i] !== model[i] ? 'needs-check' : ''}`}
                style={
                  {
                    '--paint':
                      painted[i] < 0
                        ? '#493d63'
                        : robotColors[painted[i]].color,
                  } as React.CSSProperties
                }
                aria-label={`${t('Paint', 'צביעת')} ${part[lang]}${painted[i] >= 0 ? `: ${robotColors[painted[i]][lang]}` : ''}`}
              >
                <span>
                  {painted[i] < 0 ? '?' : robotColors[painted[i]].symbol}
                </span>
                {i === 0 && <i className="robot-eyes">••</i>}
              </button>
            ))}
          </div>
        </div>
      </div>
      {!solved && (
        <>
          <div
            className="robot-palette"
            aria-label={t('Choose a paint', 'בחירת צבע')}
          >
            {palette.map((i) => (
              <button
                key={i}
                className={paint === i ? 'selected' : ''}
                data-paint={i}
                aria-pressed={paint === i}
                aria-label={robotColors[i][lang]}
                onClick={() => {
                  setPaint(i);
                  setHint('');
                }}
                style={
                  { '--paint': robotColors[i].color } as React.CSSProperties
                }
              >
                <span aria-hidden="true">{robotColors[i].symbol}</span>
                <small>{robotColors[i][lang]}</small>
              </button>
            ))}
          </div>
          <output className="adventure-hint" aria-live="polite">
            {hint ||
              t(
                'Pick a paint, then tap a robot part.',
                'בחרי צבע ואז לחצי על חלק של הרובוט.',
              )}
          </output>
          <button className="primary-button check-robot" onClick={check}>
            <Check size={20} />
            {t('Wake up my robot!', 'להעיר את הרובוט שלי!')}
          </button>
        </>
      )}
    </>
  );
}
