import { useEffect, useRef } from 'react';
import { PERSONA } from '../chat/persona.ts';
import type { ChatMessage } from '../chat/types.ts';
import type { FaqEntry } from '../data/types.ts';
import { AiReply } from './AiReply.tsx';
import { BotBubble, BotText, Typing, UserBubble } from './Bubbles.tsx';
import { EntryReply, FaqReply } from './FaqReply.tsx';

interface TranscriptProps {
  messages: ChatMessage[];
  /** Waiting for a reply that has not started yet. */
  waiting: boolean;
  onPick: (entry: FaqEntry) => void;
  onOpenSettings: () => void;
}

function Reply({ message, onPick, onOpenSettings }: { message: ChatMessage } & Omit<TranscriptProps, 'messages' | 'waiting'>) {
  if (message.role === 'user') return <UserBubble text={message.text} />;
  switch (message.kind) {
    case 'faq':
      return (
        <BotBubble>
          <FaqReply response={message.response} related={message.related} onPick={onPick} />
        </BotBubble>
      );
    case 'entry':
      return (
        <BotBubble>
          <EntryReply entry={message.entry} related={message.related} onPick={onPick} />
        </BotBubble>
      );
    case 'ai':
      return (
        <BotBubble>
          <AiReply message={message} onOpenSettings={onOpenSettings} />
        </BotBubble>
      );
    case 'smalltalk':
      return (
        <BotBubble>
          <BotText>{message.text}</BotText>
        </BotBubble>
      );
    case 'error':
      return (
        <BotBubble>
          <BotText>
            <p>{message.text}</p>
            {message.detail && <p className="mt-1 text-xs text-slate-500">{message.detail}</p>}
          </BotText>
        </BotBubble>
      );
  }
}

/** The conversation. New messages are announced to screen readers and scrolled into view. */
export function Transcript({ messages, waiting, onPick, onOpenSettings }: TranscriptProps) {
  const end = useRef<HTMLDivElement>(null);
  const count = messages.length;

  useEffect(() => {
    if (count > 0) end.current?.scrollIntoView({ behavior: 'smooth', block: 'end' });
  }, [count, waiting]);

  return (
    <div role="log" aria-live="polite" aria-relevant="additions" className="space-y-5">
      {messages.map((message) => (
        <Reply key={message.id} message={message} onPick={onPick} onOpenSettings={onOpenSettings} />
      ))}
      {waiting && (
        <BotBubble>
          <BotText>
            <Typing label={`${PERSONA.name} 正在找答案…`} />
          </BotText>
        </BotBubble>
      )}
      <div ref={end} />
    </div>
  );
}
