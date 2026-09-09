# Mia’s Babylon Arcade

Six gentle learning games made for Mia, ages 4–6, with her baby brother Dean, dog Johnny, Mum Lee and Dad Gal. English and Hebrew, touch and keyboard controls, three difficulty levels, spoken instructions, and 18 collectible stars saved in the browser.

- **Star Catcher:** count stars, with spoken counting on each tap.
- **Mia’s Color Studio:** match colors, with closer shades on later levels.
- **Johnny & Friends:** find 4, 6 or 8 pairs.
- **Dean’s Toy Box:** match shapes, then try rotated shapes and similar alternatives.
- **Picnic Patterns:** complete AB, AAB, ABB and ABC patterns.
- **Bubble Pop:** count to ten; the final level is a rocket countdown.

No timers or lives. Every completed game earns one star, up to three per game. Progress, language and sound preferences stay in the current browser.

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

The mobile suite needs Python 3 for its local static file server. It tests Chromium and WebKit with touch-enabled Android/iPhone emulation: 320–430px phones, tablets, landscape, English and Hebrew, 44px touch targets, all six complete games, later levels, saved stars, voice playback, video, mute and reduced motion. These are automated browser tests, not physical-device certification. To run against a deployment, set `ARCADE_TEST_URL` to its origin.

## Optional media-generation keys

The game includes 38 ElevenLabs MP3s and a fal.ai welcome video. Playing uses no generation credits. API keys are needed only to regenerate media.

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
```

Voice generation saves MP3s in `public/audio/` and updates `lib/audio-manifest.json`. It skips existing files. Use `npm run generate:voices -- --force` only to intentionally regenerate paid clips.

The five-second video uses **fal.ai / Kling 2.5 Turbo Standard** to animate the generated family portrait. Its request is saved in ignored `work/fal-welcome.json`, so reruns resume that job without another charge. The final clip is `public/video/mia-welcome.mp4`. The delivered video is optimized to 960×640 H.264 and about 0.5 MB. Reduced-motion users see the still portrait until they choose to play it. Press “A little hello for Mia” to replay the video with the ElevenLabs greeting.

Rebuild and redeploy after generating new media. Browser speech is a fallback when an audio file cannot load; available fallback voices depend on the device. The original family photographs are not distributed with the app. Artwork provenance is in [ARTWORK.md](ARTWORK.md).

## Inspiration

[Babylon Park Israel](https://babylonpark.co.il/en/) inspired the space arcade theme. This is a personal family game, not an official Babylon product.
