# Mia’s Babylon Arcade

Twelve learning games built with love by Uncle Tom for Mia, with baby brother Dean, dog Johnny, Mum Lee and Dad Gal: six gentle games for ages 4–6, three adventures for ages 5–6, and three trickier games for ages 6–7. English and Hebrew, touch and keyboard controls, three difficulty levels per game, spoken instructions, and 36 collectible stars saved in the browser.

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

Every card and game screen shows its current difficulty—Easy, Medium, or Tricky—with a three-bar indicator and a separate level number. Labels update as stars unlock later levels. The three new adventures stay Medium throughout. Uncle Tom has a visible, playable dedication and appears in the intro and fresh voice lines.

No timers or lives. Every completed game earns one star, up to three per game, and each star unlocks a harder level of that game. Getting every answer right on the first try earns a special cheer. Progress, language and sound preferences stay in the current browser.

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
ELEVENLABS_HEBREW_MODEL=eleven_v3
FAL_KEY=your_key
```

The existing `fal_api_key` spelling is also accepted. Keys remain local and are excluded from Git and Vercel uploads. Never use `NEXT_PUBLIC_` or `VITE_` prefixes for secrets.

```sh
npm run generate:voices
npm run generate:video
npm run generate:video -- --intro
```

Edit the bilingual event catalogue in `lib/voice-lines.json` to add or change lines. Give a changed line a new ID, or intentionally regenerate its recording so text and audio stay in sync. Voice generation saves MP3s in `public/audio/` and updates `lib/audio-manifest.json`. It skips existing files. Use `npm run generate:voices -- --force` only to intentionally regenerate paid clips.

The five-second video uses **fal.ai / Kling 2.5 Turbo Standard** to animate the generated family portrait. Its request is saved in ignored `work/fal-welcome.json`, so reruns resume that job without another charge. The final clip is `public/video/mia-welcome.mp4`. The delivered video is optimized to 960×640 H.264 and about 0.5 MB. Reduced-motion users see the still portrait until they choose to play it. Press “A little hello for Mia” to replay the video with the ElevenLabs greeting.

The ten-second opening movie uses the same fal.ai model and illustrated family, with a slow pullback into the stars. Its separate resumable job is stored in `work/fal-intro.json`; its optimized output is `public/video/mia-intro.mp4`.

Rebuild and redeploy after generating new media. Browser speech is a fallback when an audio file cannot load; available fallback voices depend on the device. The original family photographs are not distributed with the app. Artwork provenance is in [ARTWORK.md](ARTWORK.md).

## Inspiration

[Babylon Park Israel](https://babylonpark.co.il/en/) inspired the space arcade theme. This is a personal family game, not an official Babylon product.
