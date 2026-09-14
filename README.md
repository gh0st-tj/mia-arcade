# Mia’s Babylon Arcade

Thirteen learning games built with love by Uncle Tom for Mia, with baby brother Dean, dog Johnny, Mum Lee and Dad Gal: six gentle games for ages 4–6, three adventures for ages 5–6, three trickier games for ages 6–7, and an English speaking adventure for ages 4–7. English and Hebrew, touch and keyboard controls, spoken instructions, and 39 collectible stars saved in the browser. The original games have three difficulty levels each; the English game has 30 speaking levels.

- **Star Catcher:** count stars, with spoken counting on each tap.
- **Mia’s Color Studio:** match colors, with closer shades on later levels.
- **Johnny & Friends:** find 4, 6 or 8 pairs.
- **Dean’s Toy Box:** match shapes, then try rotated shapes and similar alternatives.
- **Picnic Patterns:** complete AB, AAB, ABB and ABC patterns.
- **Bubble Pop:** count to ten; the final level is a rocket countdown.
- **Johnny’s Treasure Trail (5–6):** guide Johnny around rocks, collect his bone, and find home. Maps grow from 4×4 to 5×5; every map has a safe route.
- **Mia’s Mini Market (5–6):** follow a visible shopping list, add and remove food, and pack exact quantities for a picnic. Two or three foods, with quantities no higher than three.
- **Uncle Tom’s Robot Lab (5–6):** choose a paint and color five robot parts to match a little model. Colors also have symbols. Three or four paint choices; mistakes can be repainted freely.
- **Rocket Sums (6–7):** adding within 10, then taking away, then sums up to 20 without star pictures.
- **Space Spelling (6–7):** find the missing letter of a picture word in English or Hebrew; the top level mixes in look-alike letters.
- **Galaxy Sequence (6–7):** watch planets light up and repeat the order, from three planets up to seven.
- **Mia’s English Adventure (4–7):** 150 speaking challenges, from words to sentences. Only a correctly recognized complete answer advances; progress is saved after every challenge.

Every card and game screen shows its current difficulty—Easy, Medium, or Tricky—with a three-bar indicator and a separate level number. Labels update as stars unlock later levels. The three new adventures stay Medium throughout. Uncle Tom has a visible, playable dedication and appears in the intro and fresh voice lines.

No countdown pressure or lives. The original games earn one star per completion, up to three per game, with each star unlocking a harder level. English awards its stars at levels 10, 20, and 30. Progress, language and sound preferences stay in the current browser.

## Local development

Node 22.13+ is required.

```sh
npm ci
npm run dev:web
```

Open the URL printed by the server. `dev:web` runs without Sites services. The original Sites development and Worker build remain available as `npm run dev` and `npm run build`.

## Vercel deployment

```sh
npm run build:vercel
vercel --prod
```

`vercel.json` configures the static export in `dist/client`. The arcade and its media run entirely in the browser; deployment does not require API keys or a backend. The Git repository can be connected with `vercel git connect https://github.com/gh0st-tj/mia-arcade.git` for automatic deployments from `main`.

## Tests

```sh
npm test
npx tsc --noEmit
npm run build:vercel
npx playwright install chromium webkit
npm run test:mobile
```

The mobile suite needs Python 3 for its local static file server. It tests Chromium and WebKit with touch-enabled Android/iPhone emulation: 320–430px phones, tablets, landscape, English and Hebrew, 44px touch targets, all twelve complete games, later levels, saved stars, voice playback, video, mute and reduced motion. These are automated browser tests, not physical-device certification. To run against a deployment, set `ARCADE_TEST_URL` to its origin.

## Optional media-generation keys

The game includes 236 ElevenLabs MP3s in English and Hebrew, a fal.ai welcome animation, and a new ten-second family intro movie. Every spoken event has at least two recordings. Victory celebrations have fourteen different lines per language; instructions have three. A shuffle bag plays every variation before repeating and prevents immediate repeats. Playing uses no generation credits. API keys are needed only to regenerate media.

The intro appears on the first visit and can be skipped immediately. “Watch my intro” reopens it anytime. Narration and motion start only after tapping play, with captions, language and mute controls. The existing arcade greeting also varies on each replay.

Copy `.env.example` to `.env` at the repository root. For the original workspace where this repository is inside a `site/` folder, generators also support the existing parent `.env`.

```dotenv
ELEVENLABS_API_KEY=your_key
ELEVENLABS_VOICE_ID=your_voice_id
ELEVENLABS_MODEL=eleven_turbo_v2_5
ELEVENLABS_HEBREW_VOICE_ID=your_reviewed_hebrew_voice_id
ELEVENLABS_HEBREW_MODEL=eleven_v3
FAL_KEY=your_key
```

The existing `fal_api_key` spelling is also accepted. Keys remain local and are excluded from Git and Vercel uploads. Never use `NEXT_PUBLIC_` or `VITE_` prefixes for secrets.

```sh
npm run generate:voices
npm run generate:video
npm run generate:video -- --intro
```

Edit the bilingual event catalogue in `lib/voice-lines.json` to add or change lines. Give a changed line a new ID, or intentionally regenerate its recording so text and audio stay in sync. Voice generation saves MP3s in `public/audio/` and updates `lib/audio-manifest.json`. Hebrew uses a separately configured adult Hebrew narration voice, `eleven_v3`, `language_code: he`, Natural stability (0.5), and targeted niqqud for names, feminine instructions and numbers. The generator refuses to reuse the English voice implicitly for Hebrew. No voice or model is automatically certified as suitable for children: review the actual delivery.

Generate Hebrew only with `npm run generate:voices -- --lang he`. Preview the count without spending credits with `--dry-run`, or generate samples with `--only welcome,count,number-8`. Requests and audio hashes are recorded in `lib/audio-generation.json`; unchanged recordings are reused, and interrupted runs resume without regenerating completed clips. Legacy English files are retained. Use `--force` only to deliberately regenerate matching paid clips. Old files are backed up under ignored `work/voice-backups/` before replacement. `lib/audio-versions.json` adds a content version to playback URLs so browsers fetch replacement clips.

ElevenLabs documents [Hebrew support in Eleven v3](https://elevenlabs.io/docs/overview/models), [native-language voice selection](https://help.elevenlabs.io/hc/en-us/articles/19450861739409-Which-voices-in-the-voice-library-are-native-to-a-specific-language), and [v3 prompting and stability](https://elevenlabs.io/docs/overview/capabilities/text-to-speech/best-practices). The v3 product guide does not offer the ordinary speed slider; this generator does not assume a speed parameter will slow v3 speech.

The five-second video uses **fal.ai / Kling 2.5 Turbo Standard** to animate the generated family portrait. Its request is saved in ignored `work/fal-welcome.json`, so reruns resume that job without another charge. The final clip is `public/video/mia-welcome.mp4`. The delivered video is optimized to 960×640 H.264 and about 0.5 MB. Reduced-motion users see the still portrait until they choose to play it. Press “A little hello for Mia” to replay the video with the ElevenLabs greeting.

The ten-second opening movie uses the same fal.ai model and illustrated family, with a slow pullback into the stars. Its separate resumable job is stored in `work/fal-intro.json`; its optimized output is `public/video/mia-intro.mp4`.

Rebuild and redeploy after generating new media. Browser speech is a fallback when an audio file cannot load; available fallback voices depend on the device. The original family photographs are not distributed with the app. Artwork provenance is in [ARTWORK.md](ARTWORK.md).

## English speaking adventure

The thirteenth game adds 30 sequential levels and 150 speaking challenges: 10 word levels, 8 short-phrase levels, and 12 sentence levels. Each prompt includes a saved ElevenLabs English recording, a picture cue, and a Hebrew translation. The interface and spoken coaching support both languages; recognition and example speech always use English.

**Hear it** uses Elise (a provider-listed native American English voice) with **Eleven Multilingual v2**, stability 0.75, similarity 0.75, no style exaggeration, speaker boost, and speed 0.85. These are teaching examples, so each recording says exactly its displayed target. Multilingual v2 is chosen for consistent speech rather than the legacy low-latency Turbo setting. **Eleven v3** handles the more expressive guidance in both languages, with explicit language codes. Hebrew uses a separately selected Bella voice and feminine pronunciation hints; the library returned no Hebrew-native voices at selection time, so this is not claimed to be a native Hebrew voice. Provider model guidance: [ElevenLabs models](https://elevenlabs.io/docs/overview/models).

There are **38 coaching lines per language** across 11 events: introduction, words, phrases, sentences, your turn, correct, retry, silence, microphone help, level completion, and course completion. Each event has 3–6 variants. The same shuffle-bag picker as the other games plays every variant before reusing one and prevents immediate repeats, independently for English and Hebrew. **Hear it** plays only the target word or sentence and immediately returns control, without an extra spoken turn prompt. **Explain it to me** replays an explanation. Captions match the selected recording. Microphone input is unavailable while any narration or example is playing; **Stop voice**, mute, navigation, and backgrounding cancel playback and queued turn cues. Correct-answer celebrations finish before advancing. The speaking game does not silently substitute a system TTS voice when a recording fails.

Regenerate only this course with `npm run generate:voices -- --course` (add `--lang en` or `--lang he` to limit it). `--dry-run` reports the clip and character counts without spending credits. The course contains 226 saved clips: 150 English examples plus 76 bilingual coaching recordings. Its explicit model choices override a legacy `ELEVENLABS_MODEL=eleven_turbo_v2_5` setting. `ELEVENLABS_ENGLISH_LESSON_VOICE_ID` optionally selects another English example voice. Original game recordings are retained by the scoped command. Generation hashes allow interrupted runs to resume without rebilling completed recordings.

Tap **Hear it**, then **My turn to speak**. Only a final recognition result matching the complete target advances the challenge. Partial phrases, extra words, wrong answers, silence, microphone errors, and canceled attempts do not advance. Formatting, number transcription, and selected equivalent contractions are normalized; there is no fuzzy spelling match, skip, or typed-answer fallback. The game uses the browser's top transcript, so this checks recognized speech, not phoneme-level pronunciation or speaker identity. Real children’s voices and background noise can be misrecognized.

Use a browser with Web Speech recognition (such as supported Chrome or Safari versions), a microphone, and HTTPS or localhost. Availability is feature-detected, with help for unsupported browsers, blocked permissions, and network problems. The browser speech service may send audio to its provider and require internet. No recording or transcript is stored by the game. Example playback cannot run alongside recognition; attempts stop when canceled, when leaving the game, or when the page is hidden.

Progress is saved after each successful challenge in `mia-speaking-english-v1`, independently of the other games. Reopening resumes the next uncompleted challenge. Completed levels can be replayed; future levels stay locked. Levels 10, 20, and 30 award the three arcade stars. Clearing browser data removes progress.

The Node suite covers lesson progression, strict matching, saved progress boundaries, recognition events, playback sequencing/cancellation, shuffle-bag coaching, and recording provenance. Generated sample transcripts were checked with ElevenLabs Scribe v2 for missing or altered words; this is not a human accent review. Live microphone accuracy requires a real-device check. The existing optional WebMCP game-start tool includes this game but cannot submit speech answers; its runtime contract was not verified in a supported WebMCP context for this change.

## Inspiration

[Babylon Park Israel](https://babylonpark.co.il/en/) inspired the space arcade theme. This is a personal family game, not an official Babylon product.
