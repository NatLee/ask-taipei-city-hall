import { Fragment, type ReactNode } from 'react';

const URL_PATTERN = /(https?:\/\/[^\s<>「」（）()，。、]+)/g;

/** Plain text with web addresses turned into links (opened in a new tab). */
export function Linkified({ text }: { text: string }) {
  const pieces = text.split(URL_PATTERN);
  return (
    <>
      {pieces.map((piece, index) =>
        index % 2 === 1 ? (
          <a
            key={index}
            href={piece}
            target="_blank"
            rel="noreferrer"
            className="break-all text-brand-700 underline decoration-brand-300 underline-offset-2 hover:decoration-brand-600 dark:text-brand-300"
          >
            {piece}
          </a>
        ) : (
          <Fragment key={index}>{piece}</Fragment>
        ),
      )}
    </>
  );
}

/**
 * An FAQ answer: one paragraph per line, list items indented a little.
 * The text comes from open data, so it is rendered as text, never as HTML.
 */
export function AnswerText({ text, className = '' }: { text: string; className?: string }) {
  const lines = text.split('\n').filter((line) => line.trim().length > 0);
  return (
    <div className={`space-y-1.5 leading-relaxed ${className}`}>
      {lines.map((line, index) => (
        <p key={index} className={/^\s*(\d+[.、]|[•●○‧-]|\(?[一二三四五六七八九十]+[)、])/.test(line) ? 'pl-3' : undefined}>
          <Linkified text={line} />
        </p>
      ))}
    </div>
  );
}

export function Pill({ children }: { children: ReactNode }) {
  return (
    <span className="inline-flex items-center gap-1 rounded-full bg-slate-100 px-2 py-0.5 text-xs text-slate-600 dark:bg-slate-800 dark:text-slate-300">
      {children}
    </span>
  );
}
