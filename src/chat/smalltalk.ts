import { normalizeText } from '../search/tokenize.ts';
import corpus from './smalltalk.json';

export interface SmalltalkEntry {
  patterns: string[];
  replies: string[];
}

/**
 * How close a message must be to a small-talk line. The 2017 bot answered
 * anything above 0.65 similarity; small talk here only wins when the message
 * is nearly the line itself, so real questions go to the FAQ search.
 */
export const SMALLTALK_THRESHOLD = 0.8;

/** Letters and digits only, normalised the same way as search queries. */
function compact(text: string): string {
  return normalizeText(text).replace(/[^\p{L}\p{N}]+/gu, '');
}

function bigrams(text: string): string[] {
  const chars = [...text];
  return chars.length < 2 ? chars : chars.slice(1).map((char, i) => `${chars[i]}${char}`);
}

/** Sørensen–Dice similarity of two strings' character bigrams, 0–1. */
export function similarity(a: string, b: string): number {
  if (a === b) return 1;
  const left = bigrams(a);
  const right = bigrams(b);
  if (left.length === 0 || right.length === 0) return 0;
  const counts = new Map<string, number>();
  for (const gram of left) counts.set(gram, (counts.get(gram) ?? 0) + 1);
  let shared = 0;
  for (const gram of right) {
    const count = counts.get(gram) ?? 0;
    if (count > 0) {
      shared += 1;
      counts.set(gram, count - 1);
    }
  }
  return (2 * shared) / (left.length + right.length);
}

/**
 * Reply to small talk, or return null when the message is a real question.
 * `random` picks among the replies (tests pass a fixed one).
 */
export function smalltalkReply(
  message: string,
  random: () => number = Math.random,
  entries: readonly SmalltalkEntry[] = corpus.entries,
): string | null {
  const text = compact(message);
  if (!text) return null;
  let best: { score: number; entry: SmalltalkEntry } | null = null;
  for (const entry of entries) {
    for (const pattern of entry.patterns) {
      const score = similarity(text, compact(pattern));
      if (!best || score > best.score) best = { score, entry };
    }
  }
  if (!best || best.score < SMALLTALK_THRESHOLD) return null;
  const replies = best.entry.replies;
  return replies[Math.min(replies.length - 1, Math.floor(random() * replies.length))] ?? null;
}
