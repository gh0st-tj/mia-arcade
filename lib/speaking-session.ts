// Minimal Web Speech interfaces; this API is not in TypeScript's DOM library.
export type RecognitionResult = {
  isFinal: boolean;
  0?: { transcript: string };
  length: number;
};
export type RecognitionEvent = {
  resultIndex: number;
  results: ArrayLike<RecognitionResult>;
};
export interface Recognition {
  lang: string;
  continuous: boolean;
  interimResults: boolean;
  maxAlternatives: number;
  onstart: (() => void) | null;
  onresult: ((event: RecognitionEvent) => void) | null;
  onerror: ((event: { error: string }) => void) | null;
  onend: (() => void) | null;
  start(): void;
  abort(): void;
}
export type RecognitionConstructor = new () => Recognition;
export function recognitionConstructor(): RecognitionConstructor | undefined {
  if (typeof window === 'undefined' || !window.isSecureContext)
    return undefined;
  const browser = window as unknown as {
    SpeechRecognition?: RecognitionConstructor;
    webkitSpeechRecognition?: RecognitionConstructor;
  };
  return browser.SpeechRecognition ?? browser.webkitSpeechRecognition;
}

/** One attempt, one final transcript. Aborted/late/duplicate callbacks do nothing. */
export function createSpeakingSession(
  recognition: Recognition,
  callbacks: {
    listening: () => void;
    result: (transcript: string) => void;
    error: (error: string) => void;
  },
) {
  let active = true;
  let timer: ReturnType<typeof setTimeout> | undefined;
  const cancel = () => {
    active = false;
    clearTimeout(timer);
    recognition.onstart =
      recognition.onresult =
      recognition.onerror =
      recognition.onend =
        null;
    try {
      recognition.abort();
    } catch {
      /* Already stopped. */
    }
  };
  const fail = (error: string) => {
    if (!active) return;
    cancel();
    callbacks.error(error);
  };
  recognition.lang = 'en-US';
  recognition.continuous = false;
  recognition.interimResults = false;
  recognition.maxAlternatives = 1;
  recognition.onstart = () => {
    if (active) callbacks.listening();
  };
  recognition.onresult = (event) => {
    if (!active) return;
    const results = Array.from(event.results);
    if (!results.length || results.some((result) => !result.isFinal)) return;
    const transcript = results
      .map((result) => result[0]?.transcript ?? '')
      .join(' ')
      .trim();
    if (!transcript) return fail('no-speech');
    cancel();
    callbacks.result(transcript);
  };
  recognition.onerror = (event) => fail(event.error);
  recognition.onend = () => fail('no-speech');
  return {
    cancel,
    start: () => {
      if (!active) return;
      timer = setTimeout(() => fail('no-speech'), 20000);
      try {
        recognition.start();
      } catch {
        fail('start-failed');
      }
    },
  };
}
