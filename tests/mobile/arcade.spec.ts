import { test, expect, type Page } from '@playwright/test';
const ids = ['count', 'colors', 'memory', 'shapes', 'patterns', 'bubbles'];
async function prepare(page: Page, lang = 'en', level = 0, sound = false) {
  await page.goto('/');
  await page.evaluate(
    ({ lang, level, sound, ids }) =>
      localStorage.setItem(
        'mia-arcade-v1',
        JSON.stringify({
          lang,
          sound,
          stars: Object.fromEntries(ids.map((id) => [id, level])),
        }),
      ),
    { lang, level, sound, ids },
  );
  await page.reload();
  await expect(page.locator('.game-card')).toHaveCount(6);
}
async function checkLayout(page: Page) {
  const result = await page.evaluate(() => ({
    width: innerWidth,
    client: document.documentElement.clientWidth,
    scroll: document.documentElement.scrollWidth,
    buttons: [...document.querySelectorAll('button')]
      .filter((b) => !b.disabled && b.getBoundingClientRect().width > 0)
      .map((b) => ({
        name: b.getAttribute('aria-label') || b.textContent,
        width: b.getBoundingClientRect().width,
        height: b.getBoundingClientRect().height,
      })),
  }));
  expect(result.width).toBeLessThanOrEqual(page.viewportSize()!.width + 1);
  expect(result.scroll).toBeLessThanOrEqual(result.client + 1);
  expect(
    result.buttons.filter((b) => b.width < 43.9 || b.height < 43.9),
    'Every enabled control has a 44px touch target',
  ).toEqual([]);
}
for (const lang of ['en', 'he']) {
  test(`${lang}: narrow phones, tablet and landscape layouts`, async ({
    page,
  }) => {
    await prepare(page, lang, 2);
    for (const [width, height] of [
      [320, 740],
      [360, 800],
      [390, 844],
      [430, 932],
      [768, 1024],
      [844, 390],
    ]) {
      await page.setViewportSize({ width, height });
      await checkLayout(page);
      for (const id of ids) {
        await page.locator(`.card-${id}`).tap();
        await expect(page.locator('.game-board')).toBeVisible();
        await checkLayout(page);
        await page.locator('.quiet-button').tap();
      }
    }
    await page.getByRole('tab').nth(1).tap();
    await expect(page.locator('.star-games button')).toHaveCount(6);
    await checkLayout(page);
  });
}
async function correctChoice(page: Page, id: string) {
  if (id === 'count')
    return page.locator('.answer-tile').filter({
      hasText: new RegExp(
        `^${await page.locator('.counting-stars button').count()}$`,
      ),
    });
  if (id === 'colors') {
    const color = await page
      .locator('.color-target')
      .evaluate((e) => getComputedStyle(e).backgroundColor);
    const index = await page
      .locator('.paint-swatch')
      .evaluateAll(
        (nodes, color) =>
          nodes.findIndex((e) => getComputedStyle(e).backgroundColor === color),
        color,
      );
    return page.locator('.answer-tile').nth(index);
  }
  if (id === 'shapes') {
    const shape = (await page.locator('.shape-target').textContent())!.trim();
    const index = await page
      .locator('.shape-option')
      .evaluateAll(
        (nodes, shape) =>
          nodes.findIndex((e) => e.textContent?.trim() === shape),
        shape,
      );
    return page.locator('.answer-tile').nth(index);
  }
  const seq = await page
    .locator('.pattern-row > span:not(.missing-pattern)')
    .allTextContents();
  const period = [2, 3].find((n) => seq.every((s, i) => s === seq[i % n]));
  expect(period).toBeTruthy();
  const target = seq[seq.length % period!];
  return page.locator('.answer-tile').filter({ hasText: target });
}
async function solveMemory(page: Page) {
  const cards = page.locator('.memory-tile');
  const seen = new Map<number, string>();
  const size = await cards.count();
  for (let attempt = 0; attempt < 80; attempt++) {
    const matched = await cards.evaluateAll((nodes) =>
      nodes
        .map((n, i) => (n.classList.contains('matched') ? i : -1))
        .filter((i) => i >= 0),
    );
    if (matched.length === size) return;
    const available = Array.from({ length: size }, (_, i) => i).filter(
      (i) => !matched.includes(i),
    );
    let first: number | undefined, second: number | undefined;
    for (const a of available) {
      const b = available.find(
        (b) => b !== a && seen.has(a) && seen.get(a) === seen.get(b),
      );
      if (b !== undefined) {
        first = a;
        second = b;
        break;
      }
    }
    first ??= available.find((i) => !seen.has(i)) ?? available[0];
    await cards.nth(first).tap();
    seen.set(first, (await cards.nth(first).locator('small').textContent())!);
    second ??= available.find(
      (i) => i !== first && seen.get(i) === seen.get(first),
    );
    second ??=
      available.find((i) => i !== first && !seen.has(i)) ??
      available.find((i) => i !== first)!;
    await cards.nth(second).tap();
    seen.set(second, (await cards.nth(second).locator('small').textContent())!);
    await expect(
      page.locator('.memory-tile.face-up:not(.matched)'),
    ).toHaveCount(0);
    if (seen.get(first) === seen.get(second)) {
      await expect(page.locator('.memory-tile.matched')).toHaveCount(
        matched.length + 2,
      );
      // A matched pair stays highlighted for 600ms before the next turn unlocks.
      await page.waitForTimeout(650);
    }
  }
  throw Error('Memory game did not finish.');
}
for (const { lang, level } of [
  { lang: 'en', level: 0 },
  { lang: 'he', level: 2 },
])
  for (const id of ids) {
    test(`${lang}: finish ${id} using touch and keep its star`, async ({
      page,
    }) => {
      const errors: string[] = [];
      page.on('pageerror', (e) => errors.push(e.message));
      await prepare(page, lang, level);
      await page.setViewportSize({ width: 360, height: 800 });
      await page.locator(`.card-${id}`).tap();
      if (id === 'memory') await solveMemory(page);
      else if (id === 'bubbles') {
        const order = Array.from({ length: 10 }, (_, i) =>
          level === 2 ? 10 - i : i + 1,
        );
        for (const n of order) {
          await page
            .locator('.bubble:not(.popped)')
            .filter({ hasText: new RegExp(`^${n}$`) })
            .tap();
        }
        await expect(page.locator('.bubble.popped')).toHaveCount(10);
      } else {
        for (let round = 0; round < 5; round++) {
          await checkLayout(page);
          const correct = await correctChoice(page, id);
          if (round === 0) {
            const label = await correct.getAttribute('aria-label');
            const wrong = page
              .locator('.answer-tile')
              .filter({ hasNot: page.locator('.never-match') });
            const options = await wrong.count();
            for (let i = 0; i < options; i++) {
              if ((await wrong.nth(i).getAttribute('aria-label')) !== label) {
                await wrong.nth(i).tap();
                break;
              }
            }
            await expect(page.locator('.game-feedback')).toContainText(
              lang === 'en' ? 'Nearly' : 'כמעט',
            );
            await expect(page.locator('.next-button')).toHaveCount(0);
          }
          await correct.tap();
          await expect(page.locator('.game-feedback')).toHaveClass(/good/);
          await page.locator('.next-button').tap();
        }
      }
      if (id === 'memory' || id === 'bubbles')
        await page.locator('.next-button').tap();
      await expect(page.locator('.celebration')).toBeVisible();
      const saved = await page.evaluate(() =>
        JSON.parse(localStorage.getItem('mia-arcade-v1')!),
      );
      expect(saved.stars[id]).toBe(level + 1);
      await page.reload();
      expect(
        await page.evaluate(
          (id) => JSON.parse(localStorage.getItem('mia-arcade-v1')!).stars[id],
          id,
        ),
      ).toBe(level + 1);
      expect(errors).toEqual([]);
    });
  }
test('voice, video, mute and reduced motion work on mobile', async ({
  page,
}) => {
  await page.addInitScript(() => {
    const original = HTMLMediaElement.prototype.play;
    (window as any).__media = [];
    HTMLMediaElement.prototype.play = function () {
      (window as any).__media.push(this);
      return original.call(this);
    };
  });
  await prepare(page, 'en', 0, true);
  await expect(page.locator('video')).toHaveJSProperty('paused', true);
  const audioResponse = page.waitForResponse((r) =>
    r.url().endsWith('/audio/en/welcome.mp3'),
  );
  await page.locator('.welcome-audio').tap();
  expect((await audioResponse).ok()).toBeTruthy();
  await expect
    .poll(() =>
      page
        .locator('video')
        .evaluate((v) => (v as HTMLVideoElement).currentTime),
    )
    .toBeGreaterThan(0);
  await expect
    .poll(() =>
      page.evaluate(() =>
        (window as any).__media.some(
          (m: HTMLMediaElement) => m.tagName === 'AUDIO' && !m.paused,
        ),
      ),
    )
    .toBeTruthy();
  await page.getByRole('button', { name: 'Mute sound', exact: true }).tap();
  expect(
    await page.evaluate(() =>
      (window as any).__media
        .filter((m: HTMLMediaElement) => m.tagName === 'AUDIO')
        .every((m: HTMLMediaElement) => m.paused),
    ),
  ).toBeTruthy();
  await page.locator('.language-button').tap();
  await expect(page.locator('html')).toHaveAttribute('dir', 'rtl');
  await page.getByRole('button', { name: 'הפעלת צלילים', exact: true }).tap();
  const hebrew = page.waitForResponse((r) =>
    r.url().endsWith('/audio/he/welcome.mp3'),
  );
  await page.locator('.welcome-audio').tap();
  expect((await hebrew).ok()).toBeTruthy();
});
