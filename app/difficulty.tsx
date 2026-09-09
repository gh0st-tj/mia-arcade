import type { Lang } from '@/lib/game-data';
export default function Difficulty({
  value,
  lang,
}: {
  value: 1 | 2 | 3;
  lang: Lang;
}) {
  const text =
    lang === 'en'
      ? ['Easy', 'Medium', 'Tricky'][value - 1]
      : ['קל', 'בינוני', 'מאתגר'][value - 1];
  return (
    <span
      className={`difficulty difficulty-${value}`}
      aria-label={`${lang === 'en' ? 'Difficulty' : 'רמת קושי'}: ${text}`}
    >
      <span className="difficulty-bars" aria-hidden="true">
        {[1, 2, 3].map((n) => (
          <i key={n} className={n <= value ? 'filled' : ''} />
        ))}
      </span>
      {text}
    </span>
  );
}
