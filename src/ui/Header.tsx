import { Info, LayoutGrid, Monitor, Moon, Sparkles, Sun } from 'lucide-react';
import type { ReactNode } from 'react';
import { Avatar } from './Bubbles.tsx';
import type { ThemeChoice } from './useTheme.ts';

const THEME_LABEL: Record<ThemeChoice, { label: string; Icon: typeof Sun }> = {
  system: { label: '跟隨系統', Icon: Monitor },
  light: { label: '淺色', Icon: Sun },
  dark: { label: '深色', Icon: Moon },
};

function IconButton({ label, onClick, children }: { label: string; onClick: () => void; children: ReactNode }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={label}
      title={label}
      className="flex size-9 items-center justify-center rounded-full text-slate-600 hover:bg-slate-100 hover:text-slate-900 dark:text-slate-300 dark:hover:bg-slate-800 dark:hover:text-white"
    >
      {children}
    </button>
  );
}

interface HeaderProps {
  theme: ThemeChoice;
  aiActive: boolean;
  onCycleTheme: () => void;
  onBrowse: () => void;
  onOpenAi: () => void;
  onAbout: () => void;
}

export function Header({ theme, aiActive, onCycleTheme, onBrowse, onOpenAi, onAbout }: HeaderProps) {
  const { label, Icon } = THEME_LABEL[theme];
  return (
    <header className="sticky top-0 z-10 border-b border-slate-200/80 bg-stone-50/85 pt-[env(safe-area-inset-top,0px)] backdrop-blur dark:border-slate-800 dark:bg-slate-950/85">
      <div className="mx-auto flex max-w-3xl items-center justify-between gap-3 px-4 py-2.5">
        <a href={import.meta.env.BASE_URL} className="flex min-w-0 items-center gap-2.5">
          <Avatar size="lg" />
          <span className="min-w-0">
            <span className="block truncate text-lg leading-tight font-bold tracking-tight">問問台北市政府</span>
            <span className="block truncate text-xs text-slate-500 dark:text-slate-400">Ask Taipei City Hall · 市政 FAQ 小幫手</span>
          </span>
        </a>
        <nav className="flex shrink-0 items-center" aria-label="工具">
          <IconButton label="依主題瀏覽" onClick={onBrowse}>
            <LayoutGrid className="size-5" aria-hidden />
          </IconButton>
          <IconButton label={aiActive ? 'AI 設定（已開啟）' : 'AI 設定'} onClick={onOpenAi}>
            <Sparkles className={`size-5 ${aiActive ? 'text-amber-500' : ''}`} aria-hidden />
          </IconButton>
          <IconButton label={`外觀：${label}`} onClick={onCycleTheme}>
            <Icon className="size-5" aria-hidden />
          </IconButton>
          <IconButton label="關於這個網站" onClick={onAbout}>
            <Info className="size-5" aria-hidden />
          </IconButton>
        </nav>
      </div>
    </header>
  );
}
