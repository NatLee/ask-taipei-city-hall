/**
 * Chinese-aware tokenisation for the FAQ search.
 *
 * Chinese has no spaces, so the index uses three kinds of terms:
 * - character bigrams for every run of Han characters ("敬老卡" → 敬老, 老卡),
 *   which need no dictionary and give the same result in every browser;
 * - whole words from the browser's own word segmenter (`Intl.Segmenter`),
 *   prefixed `w:`, which reward matches that line up with real words;
 * - single characters, prefixed `u:`, used only on short text (questions) so
 *   that one-character queries such as 「狗」 still find something.
 * Latin letters and digits are kept as whole tokens ("1999", "mrt").
 *
 * The 2017 bot pre-segmented every question with jieba; the segmenter here
 * plays the same role without shipping a dictionary.
 */

const HAN = /\p{Script=Han}/u;
/** A run of Han characters, of other letters, or of digits (「YouBike2.0E」 → youbike, 2, 0, e). */
const TOKEN_RUN = /\p{Script=Han}+|(?:(?!\p{Script=Han})\p{L})+|\p{N}+/gu;

export const WORD_PREFIX = 'w:';
export const CHAR_PREFIX = 'u:';

/** Variants people type interchangeably. Applied to both the index and the query. */
const CHARACTER_VARIANTS: Record<string, string> = { 臺: '台' };
const VARIANT_PATTERN = new RegExp(`[${Object.keys(CHARACTER_VARIANTS).join('')}]`, 'g');

/** Full-width to half-width, lower case, and the variants above. */
export function normalizeText(text: string): string {
  return text
    .normalize('NFKC')
    .toLowerCase()
    .replace(VARIANT_PATTERN, (char) => CHARACTER_VARIANTS[char] ?? char);
}

export interface WordSegmenter {
  segment(text: string): Iterable<{ segment: string; isWordLike?: boolean }>;
}

/** The browser's word segmenter, or null where `Intl.Segmenter` is missing. */
export function createWordSegmenter(): WordSegmenter | null {
  if (typeof Intl === 'undefined' || !('Segmenter' in Intl)) return null;
  return new Intl.Segmenter('zh-Hant', { granularity: 'word' });
}

export interface TokenOptions {
  /** Add whole words from this segmenter. */
  segmenter?: WordSegmenter | null;
  /** Add single Han characters. */
  chars?: boolean;
}

/**
 * Split text into search terms. The result keeps duplicates, so callers can
 * count term frequency.
 */
export function tokenize(text: string, options: TokenOptions = {}): string[] {
  const normalized = normalizeText(text);
  const terms: string[] = [];
  for (const match of normalized.matchAll(TOKEN_RUN)) {
    const run = match[0];
    if (!HAN.test(run[0] ?? '')) {
      terms.push(run);
      continue;
    }
    const chars = [...run];
    if (chars.length === 1) terms.push(run);
    for (let i = 0; i + 1 < chars.length; i += 1) terms.push(`${chars[i]}${chars[i + 1]}`);
    if (options.chars) for (const char of chars) terms.push(CHAR_PREFIX + char);
  }
  if (options.segmenter) {
    for (const { segment, isWordLike } of options.segmenter.segment(normalized)) {
      // Two or more Han characters: shorter words are already covered above.
      if (isWordLike && [...segment].length >= 2 && HAN.test(segment)) terms.push(WORD_PREFIX + segment);
    }
  }
  return terms;
}

/** Distinct terms with how often each occurs. */
export function termCounts(terms: string[]): Map<string, number> {
  const counts = new Map<string, number>();
  for (const term of terms) counts.set(term, (counts.get(term) ?? 0) + 1);
  return counts;
}

export interface SynonymMatch {
  /** Group members found in the query. */
  typed: string[];
  /** The other members, searched on the visitor's behalf. */
  others: string[];
}

export interface QueryVocabulary {
  questionWords: readonly string[];
  finalParticles: readonly string[];
  synonymGroups: readonly (readonly string[])[];
}

export interface PreparedQuery {
  /** The query with question words and final particles replaced by spaces. */
  text: string;
  /** Synonym groups the query touches. */
  synonyms: SynonymMatch[];
}

/**
 * Get a visitor's question ready for matching: find synonyms on the full
 * text, then drop words that only make it a question. If nothing is left
 * (「為什麼？」), the original text is kept.
 */
export function prepareQuery(query: string, vocabulary: QueryVocabulary): PreparedQuery {
  const normalized = normalizeText(query).trim();
  const synonyms: SynonymMatch[] = [];
  for (const group of vocabulary.synonymGroups) {
    const members = group.map(normalizeText);
    const typed = members.filter((member) => normalized.includes(member));
    if (typed.length > 0) synonyms.push({ typed, others: members.filter((member) => !typed.includes(member)) });
  }

  let text = normalized;
  for (const word of vocabulary.questionWords) text = text.split(normalizeText(word)).join(' ');
  const particles = vocabulary.finalParticles.map(normalizeText).join('');
  text = text.replace(new RegExp(`[${particles}]+(?=[^\\p{L}\\p{N}]*$)`, 'u'), ' ').trim();
  text = text.replace(/[^\p{L}\p{N}]+/gu, ' ').trim();
  if (!/[\p{L}\p{N}]/u.test(text)) text = normalized;
  return { text, synonyms };
}
