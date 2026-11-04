import { MessageSquarePlus } from 'lucide-react';
import { useCallback, useEffect, useRef, useState } from 'react';
import { useAiSettings } from './ai/useAiSettings.ts';
import { useChat } from './chat/useChat.ts';
import type { FaqEntry } from './data/types.ts';
import { useSearchEngine } from './search/useSearchEngine.ts';
import { AboutDialog } from './ui/AboutDialog.tsx';
import { AiSettingsDialog } from './ui/AiSettingsDialog.tsx';
import { CategoryBrowser } from './ui/CategoryBrowser.tsx';
import { Composer } from './ui/Composer.tsx';
import { DatasetContext } from './ui/DatasetContext.ts';
import { Header } from './ui/Header.tsx';
import { questionFromUrl, rememberQuestionInUrl } from './ui/share.ts';
import { Transcript } from './ui/Transcript.tsx';
import { useTheme } from './ui/useTheme.ts';
import { Welcome } from './ui/Welcome.tsx';

type Panel = { kind: 'none' } | { kind: 'ai' } | { kind: 'about' } | { kind: 'browse'; categoryId: string | null };

export default function App() {
  const engine = useSearchEngine();
  const ai = useAiSettings();
  const chat = useChat();
  const theme = useTheme();
  const [panel, setPanel] = useState<Panel>({ kind: 'none' });
  const closePanel = () => setPanel({ kind: 'none' });

  const ask = useCallback(
    (question: string) => {
      rememberQuestionInUrl(question.trim());
      const mode = ai.active && ai.apiKey ? { apiKey: ai.apiKey, modelId: ai.modelId } : null;
      void chat.ask(question, mode);
    },
    [ai.active, ai.apiKey, ai.modelId, chat],
  );

  const pick = useCallback(
    (entry: FaqEntry) => {
      closePanel();
      rememberQuestionInUrl(entry.q);
      void chat.showEntry(entry);
    },
    [chat],
  );

  // A shared link (?q=…) asks its question once, as soon as the page opens.
  const askedFromUrl = useRef(false);
  useEffect(() => {
    if (askedFromUrl.current) return;
    askedFromUrl.current = true;
    const question = questionFromUrl();
    if (question) ask(question);
  }, [ask]);

  const lastMessage = chat.messages.at(-1);
  const streaming = lastMessage?.role === 'bot' && lastMessage.kind === 'ai' && lastMessage.status === 'streaming';
  const waiting = chat.busy && lastMessage?.role === 'user';

  return (
    <DatasetContext.Provider value={engine.status === 'ready' ? engine.meta : null}>
      <div className="flex h-full flex-col">
        <a href="#question" className="sr-only focus:not-sr-only focus:absolute focus:top-2 focus:left-2 focus:z-50 focus:rounded focus:bg-white focus:px-3 focus:py-2">
          跳到輸入框
        </a>
        <Header
          theme={theme.choice}
          aiActive={ai.active}
          onCycleTheme={theme.cycle}
          onBrowse={() => setPanel({ kind: 'browse', categoryId: null })}
          onOpenAi={() => setPanel({ kind: 'ai' })}
          onAbout={() => setPanel({ kind: 'about' })}
        />

        <main className="flex-1 overflow-y-auto">
          <div className="mx-auto max-w-3xl space-y-5 px-4 py-6">
            <Welcome
              engine={engine}
              aiActive={ai.active}
              onAsk={ask}
              onBrowse={(categoryId) => setPanel({ kind: 'browse', categoryId })}
              onOpenAi={() => setPanel({ kind: 'ai' })}
            />
            <Transcript messages={chat.messages} waiting={waiting} onPick={pick} onOpenSettings={() => setPanel({ kind: 'ai' })} />
          </div>
        </main>

        <footer className="border-t border-slate-200/80 bg-stone-50/90 px-4 pt-3 pb-[max(0.75rem,env(safe-area-inset-bottom,0px))] backdrop-blur dark:border-slate-800 dark:bg-slate-950/90">
          {chat.messages.length > 0 && (
            <div className="mx-auto mb-2 flex max-w-3xl justify-end">
              <button
                type="button"
                onClick={chat.reset}
                className="inline-flex items-center gap-1 text-xs text-slate-500 hover:text-brand-700 dark:text-slate-400 dark:hover:text-brand-300"
              >
                <MessageSquarePlus className="size-3.5" aria-hidden />
                新對話
              </button>
            </div>
          )}
          <Composer
            busy={chat.busy}
            canStop={streaming}
            aiActive={ai.active}
            modelId={ai.modelId}
            onSend={ask}
            onStop={chat.stop}
            onMode={(wantAi) => {
              if (wantAi && !ai.apiKey) setPanel({ kind: 'ai' });
              else ai.setActive(wantAi);
            }}
          />
        </footer>
      </div>

      <AiSettingsDialog open={panel.kind === 'ai'} onClose={closePanel} settings={ai} />
      <AboutDialog open={panel.kind === 'about'} onClose={closePanel} />
      <CategoryBrowser
        open={panel.kind === 'browse'}
        categoryId={panel.kind === 'browse' ? panel.categoryId : null}
        onChoose={(categoryId) => setPanel({ kind: 'browse', categoryId })}
        onClose={closePanel}
        onPick={pick}
      />
    </DatasetContext.Provider>
  );
}
