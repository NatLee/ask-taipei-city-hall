import { Parser } from 'htmlparser2';
import type { FaqLink } from '../../src/data/types.ts';

/** Tags whose start and end break the text into a new line. */
const BLOCK_TAGS = new Set([
  'p', 'div', 'br', 'li', 'tr', 'table', 'thead', 'tbody', 'ul', 'ol', 'blockquote', 'hr',
  'caption', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6', 'section', 'article', 'dd', 'dt',
]);
/** Tags whose text is never shown to a reader. */
const HIDDEN_TAGS = new Set(['script', 'style', 'noscript', 'template']);
const CELL_TAGS = new Set(['td', 'th']);
const CELL_SEPARATOR = '｜';
const LINK_PROTOCOLS = new Set(['http:', 'https:', 'mailto:']);

export interface HtmlText {
  /** Plain text; one paragraph per line. */
  text: string;
  /** Links and images found in the HTML, in document order, without duplicates. */
  links: FaqLink[];
}

/** Resolve `href` against `baseUrl`; returns null for anything a reader cannot open. */
export function resolveUrl(href: string | undefined, baseUrl: string): string | null {
  if (!href) return null;
  try {
    const url = new URL(href.trim(), baseUrl);
    return LINK_PROTOCOLS.has(url.protocol) ? url.href : null;
  } catch {
    return null;
  }
}

/** Collapse runs of spaces inside each line and drop empty lines. */
export function tidyText(raw: string): string {
  return raw
    .split('\n')
    .map((line) => line.replace(/[ \t\r\f\v\u00a0]+/g, ' ').trim())
    .filter((line) => line.length > 0 && line !== CELL_SEPARATOR)
    .join('\n');
}

/**
 * Turn an FAQ answer written in HTML into plain text plus a list of the links
 * it contains. Lists keep their bullets or numbers and table cells are joined
 * with a full-width bar, so the text still reads well without markup.
 */
export function htmlToText(html: string, baseUrl: string): HtmlText {
  let out = '';
  const links: FaqLink[] = [];
  const seen = new Set<string>();
  let hiddenDepth = 0;
  let anchor: { url: string | null; text: string } | null = null;
  const listCounters: (number | null)[] = [];
  let cellIndex = 0;

  const addLink = (title: string, url: string | null) => {
    if (!url || seen.has(url)) return;
    seen.add(url);
    links.push({ title: tidyText(title).replace(/\n/g, ' ') || url, url });
  };
  const newline = () => {
    out += '\n';
  };

  const parser = new Parser(
    {
      onopentag(name, attrs) {
        if (HIDDEN_TAGS.has(name)) {
          hiddenDepth += 1;
          return;
        }
        if (BLOCK_TAGS.has(name)) newline();
        if (name === 'ul') listCounters.push(null);
        if (name === 'ol') listCounters.push(0);
        if (name === 'li') {
          const depth = listCounters.length - 1;
          const counter = listCounters[depth];
          if (typeof counter === 'number') {
            listCounters[depth] = counter + 1;
            out += `${counter + 1}. `;
          } else {
            out += '• ';
          }
        }
        if (name === 'tr') cellIndex = 0;
        if (CELL_TAGS.has(name)) {
          if (cellIndex > 0) out += CELL_SEPARATOR;
          cellIndex += 1;
        }
        if (name === 'a') anchor = { url: resolveUrl(attrs.href, baseUrl), text: '' };
        if (name === 'img') addLink(attrs.alt || attrs.title || '圖片', resolveUrl(attrs.src, baseUrl));
      },
      ontext(text) {
        if (hiddenDepth > 0) return;
        out += text;
        if (anchor) anchor.text += text;
      },
      onclosetag(name) {
        if (HIDDEN_TAGS.has(name)) {
          hiddenDepth = Math.max(0, hiddenDepth - 1);
          return;
        }
        if (name === 'a' && anchor) {
          addLink(anchor.text, anchor.url);
          anchor = null;
        }
        if (name === 'ul' || name === 'ol') listCounters.pop();
        if (BLOCK_TAGS.has(name)) newline();
      },
    },
    { decodeEntities: true, lowerCaseTags: true },
  );
  parser.write(html);
  parser.end();

  return { text: tidyText(out), links };
}
