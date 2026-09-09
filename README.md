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

**Current status:** ElevenLabs returned HTTP 402, `payment_required`; no paid voice clips were generated. Resolve billing/voice entitlement with ElevenLabs, then rerun the command. The browser uses its own speech synthesis in the meantime. Voice quality and Hebrew availability depend on the device’s installed voices. The sound button mutes speech and game sounds. No microphone is used. Rebuild and redeploy after generating clips to update the hosted copy.

### Images and video

The family illustration was generated with the built-in image tool using the supplied photo references. No OpenAI API key is needed for that artwork. The original family photographs are not included in the site.

`FAL_KEY` is reserved for a future optional video-generation feature. The current arcade uses lightweight game animation and does not call fal.ai or require video credits.

## Validation

- Production build and TypeScript check.
- Randomized question invariants across 2,000 generated rounds; sequence correctness; complete memory pairs; bubble shuffle invariants.
- HTTP checks for the local page and image.
- Browser interaction/visual testing was not performed. Optional WebMCP tools are feature-detected; a supported WebMCP validation context was not available, so those tools are unverified.

## Inspiration

[Babylon Park Israel](https://babylonpark.co.il/en/) inspired the space arcade theme. This is a personal family game, not an official Babylon product.
