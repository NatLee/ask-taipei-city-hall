import type { ReactNode } from 'react';
import { PERSONA } from '../chat/persona.ts';

export function Avatar({ size = 'md' }: { size?: 'md' | 'lg' }) {
  const box = size === 'lg' ? 'size-11' : 'size-9';
  return (
    <span className={`${box} shrink-0 overflow-hidden rounded-full bg-white ring-2 ring-amber-300 dark:ring-amber-400/70`}>
      <img src={`${import.meta.env.BASE_URL}yee.png`} alt="" className="size-full object-cover" width={44} height={44} />
    </span>
  );
}

/** A message from the bot: avatar, name, then content that may hold cards. */
export function BotBubble({ children, wide = false }: { children: ReactNode; wide?: boolean }) {
  return (
    <div className="flex items-start gap-2.5">
      <Avatar />
      <div className={`min-w-0 flex-1 ${wide ? '' : 'max-w-2xl'}`}>
        <p className="mb-1 text-xs font-medium text-slate-500 dark:text-slate-400">{PERSONA.name}</p>
        <div className="space-y-3">{children}</div>
      </div>
    </div>
  );
}

export function BotText({ children }: { children: ReactNode }) {
  return (
    <div className="w-fit max-w-full rounded-2xl rounded-tl-sm border border-slate-200 bg-white px-4 py-2.5 leading-relaxed shadow-sm dark:border-slate-700/80 dark:bg-slate-900">
      {children}
    </div>
  );
}

export function UserBubble({ text }: { text: string }) {
  return (
    <div className="flex justify-end">
      <p className="max-w-[85%] rounded-2xl rounded-tr-sm bg-brand-700 px-4 py-2.5 leading-relaxed whitespace-pre-wrap text-white shadow-sm dark:bg-brand-600">
        {text}
      </p>
    </div>
  );
}

/** Three bouncing dots, the web version of Messenger's "typing…" that the 2017 bot sent. */
export function Typing({ label }: { label: string }) {
  return (
    <span role="status" className="inline-flex items-center gap-2 text-sm text-slate-500 dark:text-slate-400">
      <span aria-hidden className="inline-flex gap-1">
        {[0, 150, 300].map((delay) => (
          <span key={delay} className="typing-dot size-1.5 rounded-full bg-brand-500" style={{ animationDelay: `${delay}ms` }} />
        ))}
      </span>
      {label}
    </span>
  );
}
