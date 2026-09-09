/** Shuffle every variation before reusing one, including across bag boundaries. */
export function createVoicePicker(random: () => number = Math.random) {
  const bags = new Map<string, { remaining: string[]; last?: string }>();
  return (event: string, ids: string[]): string | undefined => {
    if (!ids.length) return undefined;
    let bag = bags.get(event);
    if (!bag) {
      bag = { remaining: [] };
      bags.set(event, bag);
    }
    if (!bag.remaining.length) {
      bag.remaining = [...ids];
      for (let i = ids.length - 1; i > 0; i--) {
        const j = Math.floor(random() * (i + 1));
        [bag.remaining[i], bag.remaining[j]] = [
          bag.remaining[j],
          bag.remaining[i],
        ];
      }
      const end = bag.remaining.length - 1;
      if (end > 0 && bag.remaining[end] === bag.last)
        [bag.remaining[0], bag.remaining[end]] = [
          bag.remaining[end],
          bag.remaining[0],
        ];
    }
    bag.last = bag.remaining.pop();
    return bag.last;
  };
}
