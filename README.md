# Mia’s Babylon Arcade

A personal Babylon-inspired space arcade for Mia, ages 4–6, with her baby brother Dean, dog Johnny, Mum Lee and Dad Gal. English and Hebrew, touch and keyboard controls, optional spoken instructions, six games, no time pressure, and 18 collectible stars saved on the current device.

- **Star Catcher:** count 2–6 stars; tap stars to count aloud.
- **Mia’s Color Studio:** visually match colors without needing to read.
- **Johnny & Friends:** find four pairs, including Johnny and Dean.
- **Dean’s Toy Box:** match five familiar shapes.
- **Picnic Patterns:** complete AB and AAB fruit patterns.
- **Bubble Pop:** find and pop numbers from 1 to 10.

Each completed game earns one star, up to three per game. Games remain replayable. Wrong answers invite another attempt. Progress is stored in this browser only; clearing site data removes it. Sound and language preferences are also stored locally.

## Run locally

Requires Node 22.13 or later.

```sh
npm install --prefix site
npm run dev
```

Open the local address printed by the server. The app lives in `site/`; the top-level package forwards the common commands.

```sh
npm test
npm run build
```

## API keys

Keep keys in the existing **`/Users/tom/Desktop/scripts/mia-arcade/.env`**. Its existing contents have been preserved. `.env.example` lists the supported names:

```dotenv
ELEVENLABS_API_KEY=your_key
ELEVENLABS_VOICE_ID=your_voice_id
ELEVENLABS_MODEL=eleven_turbo_v2_5
ELEVENLABS_HEBREW_MODEL=eleven_v3
FAL_KEY=
```

The app works without API keys. No secret is sent to the browser or included in the hosted site. Do not prefix secrets with `NEXT_PUBLIC_` or `VITE_`.

### ElevenLabs voice clips

```sh
npm run generate:voices
npm run build
```

The generator reads the parent `.env`, or `site/.env` when the site is used on its own. It generates 38 short MP3s (instructions, encouragement, numbers and welcome in both languages) into `site/public/audio/`, and updates the audio manifest. Already generated clips are skipped; to regenerate intentionally use `npm run generate:voices --prefix site -- --force`. Generation uses ElevenLabs credits. The selected Hebrew model must support Hebrew; the default is `eleven_v3`.

**Current status:** all 38 English and Hebrew ElevenLabs clips have been generated. The game uses these saved clips without live API calls during play. Browser speech remains a fallback if a clip cannot load; its voices depend on the device. The sound button mutes speech and game sounds. No microphone is used. Rebuild and redeploy after generating new clips to update the hosted copy.

### fal.ai welcome video

The welcome portrait is animated using **fal.ai / Kling 2.5 Turbo Standard**, with a five-second silent clip featuring Mia waving, Dean smiling, and Johnny tilting his head. The ElevenLabs greeting plays when “A little hello for Mia” is pressed. The animation plays once on arrival and can be paused or replayed; reduced-motion users initially see the still portrait.

```sh
npm run generate:video
```

The generator accepts `FAL_KEY` or your existing `fal_api_key` entry in the root `.env`. It uses the generated illustration as the input, not the original photographs. A submitted job is saved in `site/work/fal-welcome.json`; rerunning resumes that job instead of paying for another generation. An existing video is reused. The finished video is saved to `site/public/video/mia-welcome.mp4` and served as part of the game; playing it does not spend credits.

The original family illustration used the built-in image tool and needs no OpenAI API key. The original family photographs are not included in the site.

## Validation

- Production build and TypeScript check.
- Randomized question invariants across 2,000 generated rounds; sequence correctness; complete memory pairs; bubble shuffle invariants.
- HTTP checks for the local page and image.
- Browser interaction/visual testing was not performed. Optional WebMCP tools are feature-detected; a supported WebMCP validation context was not available, so those tools are unverified.

## Inspiration

[Babylon Park Israel](https://babylonpark.co.il/en/) inspired the space arcade theme. This is a personal family game, not an official Babylon product.
