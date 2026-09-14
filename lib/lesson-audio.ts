export const englishExampleId = (level: number, prompt: number) =>
  `english-example-${String(level + 1).padStart(2, '0')}-${prompt + 1}`;

export interface LessonAudio {
  onended: ((event: Event) => unknown) | null;
  onerror: ((event: Event) => unknown) | null;
  play(): Promise<void>;
  pause(): void;
}

/** One playback owner for examples and narration; canceled clips cannot chain. */
export function createLessonPlayer(makeAudio: (url: string) => LessonAudio) {
  let cancelCurrent: (() => void) | undefined;
  const stop = () => {
    cancelCurrent?.();
    cancelCurrent = undefined;
  };
  return {
    stop,
    play(url: string): Promise<'ended' | 'failed' | 'canceled'> {
      stop();
      return new Promise((resolve) => {
        let settled = false;
        let clip: LessonAudio;
        try {
          clip = makeAudio(url);
        } catch {
          resolve('failed');
          return;
        }
        const finish = (result: 'ended' | 'failed' | 'canceled') => {
          if (settled) return;
          settled = true;
          clearTimeout(timeout);
          clip.onended = clip.onerror = null;
          clip.pause();
          if (cancelCurrent === cancel) cancelCurrent = undefined;
          resolve(result);
        };
        const cancel = () => finish('canceled');
        cancelCurrent = cancel;
        const timeout = setTimeout(() => finish('failed'), 45000);
        clip.onended = () => finish('ended');
        clip.onerror = () => finish('failed');
        try {
          void clip.play().catch(() => finish('failed'));
        } catch {
          finish('failed');
        }
      });
    },
  };
}
