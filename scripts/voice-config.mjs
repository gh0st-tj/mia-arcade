import { createHash } from 'node:crypto';

// Exact words only: keep captions readable; disambiguate speech with niqqud.
const pronunciation = {
  מיה: 'מִיָה',
  למיה: 'לְמִיָה',
  דין: 'דִּין',
  לי: 'לִי',
  גל: 'גַּל',
  טום: 'טוֹם',
  דוד: 'דּוֹד',
  לדוד: 'לְדוֹד',
  מדוד: 'מִדּוֹד',
  'ג׳וני': 'ג׳וֹנִי',
  'לג׳וני': 'לְג׳וֹנִי',
  'וג׳וני': 'וְג׳וֹנִי',
  בבילון: 'בַּבִּילוֹן',
  לבבילון: 'לְבַּבִּילוֹן',
  בבבילון: 'בְּבַּבִּילוֹן',
  ספרי: 'סִפְרִי',
  וספרי: 'וְסִפְרִי',
  בחרי: 'בַּחֲרִי',
  ובחרי: 'וּבַחֲרִי',
  פתרי: 'פִּתְרִי',
  ופתרי: 'וּפִתְרִי',
  פתרת: 'פָּתַרְתְּ',
  לחצי: 'לַחֲצִי',
  ולחצי: 'וְלַחֲצִי',
  שימי: 'שִׂימִי',
  בואי: 'בּוֹאִי',
  ובואי: 'וּבוֹאִי',
  מצאי: 'מִצְאִי',
  ומצאי: 'וּמִצְאִי',
  עזרי: 'עִזְרִי',
  ועזרי: 'וְעִזְרִי',
  הפכי: 'הִפְכִי',
  זכרי: 'זִכְרִי',
  נסי: 'נַסִּי',
  ונסי: 'וְנַסִּי',
  חזרי: 'חִזְרִי',
  קחי: 'קְחִי',
  תני: 'תְּנִי',
  תורך: 'תּוֹרֵךְ',
  צבעי: 'צִבְעִי',
  וצבעי: 'וְצִבְעִי',
  תיהני: 'תֵּיהָנִי',
  ותיהני: 'וְתֵיהָנִי',
  אספי: 'אִסְפִי',
  עקפי: 'עִקְפִי',
  עקבי: 'עִקְבִי',
  אמרי: 'אִמְרִי',
  ואמרי: 'וְאִמְרִי',
  הקשיבי: 'הַקְשִׁיבִי',
  והקשיבי: 'וְהַקְשִׁיבִי',
  בקשי: 'בַּקְּשִׁי',
  חכי: 'חַכִּי',
  אחת: 'אַחַת',
  שתיים: 'שְׁתַּיִם',
  שלוש: 'שָׁלוֹשׁ',
  ארבע: 'אַרְבַּע',
  חמש: 'חָמֵשׁ',
  שש: 'שֵׁשׁ',
  שבע: 'שֶׁבַע',
  שמונה: 'שְׁמוֹנֶה',
  תשע: 'תֵּשַׁע',
  עשר: 'עֶשֶׂר',
};

export function speechRequest(line, lang, env) {
  if (line.purpose === 'english-example') {
    if (lang !== 'en')
      throw Error('English pronunciation examples must remain English.');
    const voiceId =
      env.ELEVENLABS_ENGLISH_LESSON_VOICE_ID || env.ELEVENLABS_VOICE_ID;
    if (!voiceId)
      throw Error(
        'Set ELEVENLABS_ENGLISH_LESSON_VOICE_ID or ELEVENLABS_VOICE_ID.',
      );
    return {
      voiceId,
      body: {
        text: /[.!?]$/.test(line.en) ? line.en : `${line.en}.`,
        model_id: 'eleven_multilingual_v2',
        voice_settings: {
          stability: 0.75,
          similarity_boost: 0.75,
          style: 0,
          use_speaker_boost: true,
          speed: 0.85,
        },
      },
    };
  }
  if (lang === 'he') {
    const model = env.ELEVENLABS_HEBREW_MODEL || 'eleven_v3';
    if (model !== 'eleven_v3')
      throw Error('Hebrew prerecorded speech requires eleven_v3.');
    if (!env.ELEVENLABS_HEBREW_VOICE_ID)
      throw Error(
        'Set ELEVENLABS_HEBREW_VOICE_ID to a reviewed Hebrew voice; English voice fallback is disabled.',
      );
    return {
      voiceId: env.ELEVENLABS_HEBREW_VOICE_ID,
      body: {
        text: line.he.replace(
          /[א-ת׳]+/gu,
          (word) => pronunciation[word] || word,
        ),
        model_id: model,
        language_code: 'he',
        voice_settings: { stability: 0.5, similarity_boost: 0.75 },
      },
    };
  }
  if (!env.ELEVENLABS_VOICE_ID)
    throw Error('Set ELEVENLABS_VOICE_ID for English.');
  const model = line.id?.startsWith('speaking-')
    ? 'eleven_v3'
    : env.ELEVENLABS_MODEL || 'eleven_multilingual_v2';
  return {
    voiceId: env.ELEVENLABS_VOICE_ID,
    body: {
      text: line.en,
      model_id: model,
      ...(model === 'eleven_v3'
        ? {
            language_code: 'en',
            voice_settings: { stability: 0.5, similarity_boost: 0.75 },
          }
        : {}),
    },
  };
}

export const fingerprint = (value) =>
  createHash('sha256')
    .update(
      typeof value === 'string' || Buffer.isBuffer(value)
        ? value
        : JSON.stringify(value),
    )
    .digest('hex');
