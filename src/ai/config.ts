/**
 * Settings for AI mode. The page calls the Anthropic Messages API straight
 * from the visitor's browser with the visitor's own key, so everything here
 * is about keeping that call cheap, grounded and predictable.
 */

/** Where the browser sends AI requests. The page's CSP allows only this origin. */
export const ANTHROPIC_API_ORIGIN = 'https://api.anthropic.com';

export interface ModelOption {
  id: string;
  label: string;
  /** One line shown in the model picker. */
  blurb: string;
  /** US dollars per million tokens, from Anthropic's price list (checked 2026-11-04). */
  inputPrice: number;
  outputPrice: number;
  /**
   * Whether the API may retry a safety decline on another model by itself
   * (`fallbacks: "default"`). Claude Haiku 5.5 has no server-side fallback.
   */
  serverFallback: boolean;
}

export const MODELS: readonly ModelOption[] = [
  {
    id: 'claude-opus-5-5',
    label: 'Claude Opus 5.5',
    blurb: '最聰明，預設選項',
    inputPrice: 4,
    outputPrice: 20,
    serverFallback: true,
  },
  {
    id: 'claude-sonnet-5-5',
    label: 'Claude Sonnet 5.5',
    blurb: '快一點，約一半價錢',
    inputPrice: 2,
    outputPrice: 10,
    serverFallback: true,
  },
  {
    id: 'claude-haiku-5-5',
    label: 'Claude Haiku 5.5',
    blurb: '最便宜、最快',
    inputPrice: 0.1,
    outputPrice: 0.5,
    serverFallback: false,
  },
];

export const DEFAULT_MODEL_ID = 'claude-opus-5-5';

/**
 * Answers are short summaries of a few FAQ passages, which does not need deep
 * reasoning; low effort keeps answers quick and cheap for the visitor.
 */
export const AI_EFFORT = 'low' as const;

/**
 * Hard cap per answer (thinking included). An FAQ answer needs a few hundred
 * tokens; the cap protects the visitor's bill if something goes wrong.
 */
export const AI_MAX_TOKENS = 4096;

/** How many retrieved FAQ entries go into each AI request. */
export const AI_CONTEXT_ENTRIES = 6;

/** Beta flag that enables `fallbacks: "default"`. */
export const SERVER_FALLBACK_BETA = 'server-side-fallback-2026-07-01';

export function findModel(id: string): ModelOption {
  return MODELS.find((model) => model.id === id) ?? (MODELS[0] as ModelOption);
}
