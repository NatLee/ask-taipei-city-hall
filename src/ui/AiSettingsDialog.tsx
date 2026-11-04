import { Eye, EyeOff, ShieldAlert, Trash2 } from 'lucide-react';
import { type FormEvent, useState } from 'react';
import { AI_CONTEXT_ENTRIES, MODELS } from '../ai/config.ts';
import { looksLikeApiKey } from '../ai/keyStore.ts';
import type { AiSettings } from '../ai/useAiSettings.ts';
import { ANTHROPIC_CONSOLE } from '../config/links.ts';
import { Dialog } from './Dialog.tsx';

function KeyForm({ settings, onDone }: { settings: AiSettings; onDone: () => void }) {
  const [key, setKey] = useState(settings.apiKey ?? '');
  const [remember, setRemember] = useState(settings.remembered);
  const [visible, setVisible] = useState(false);
  const suspicious = key.trim().length > 0 && !looksLikeApiKey(key);

  const submit = (event: FormEvent) => {
    event.preventDefault();
    if (!key.trim()) return;
    settings.saveKey(key, remember);
    onDone();
  };

  return (
    <form onSubmit={submit} className="space-y-4">
      <div>
        <label htmlFor="api-key" className="mb-1 block text-sm font-medium">
          Claude API key
        </label>
        <div className="flex gap-2">
          <input
            id="api-key"
            type={visible ? 'text' : 'password'}
            autoComplete="off"
            spellCheck={false}
            value={key}
            onChange={(event) => setKey(event.target.value)}
            placeholder="sk-ant-…"
            aria-describedby="api-key-help"
            className="min-w-0 flex-1 rounded-lg border border-slate-300 bg-white px-3 py-2 font-mono text-sm dark:border-slate-700 dark:bg-slate-800"
          />
          <button
            type="button"
            onClick={() => setVisible(!visible)}
            aria-label={visible ? '隱藏金鑰' : '顯示金鑰'}
            className="rounded-lg border border-slate-300 px-2.5 dark:border-slate-700"
          >
            {visible ? <EyeOff className="size-4" aria-hidden /> : <Eye className="size-4" aria-hidden />}
          </button>
        </div>
        <p id="api-key-help" className="mt-1 text-xs text-slate-500 dark:text-slate-400">
          到{' '}
          <a href={ANTHROPIC_CONSOLE.keys} target="_blank" rel="noreferrer" className="underline">
            Claude Console
          </a>{' '}
          建立。{suspicious && <span className="text-amber-700 dark:text-amber-300">這看起來不像 Anthropic 的金鑰（通常以 sk-ant- 開頭）。</span>}
        </p>
      </div>

      <label className="flex items-start gap-2 text-sm">
        <input type="checkbox" checked={remember} onChange={(event) => setRemember(event.target.checked)} className="mt-1" />
        <span>
          在這台裝置記住金鑰
          <span className="block text-xs text-slate-500 dark:text-slate-400">
            不勾的話，金鑰只放在這個分頁的記憶體裡，關掉或重新整理就忘記。勾了會存進瀏覽器的 localStorage，直到你按「忘記金鑰」。
          </span>
        </span>
      </label>

      <fieldset>
        <legend className="mb-1 text-sm font-medium">模型</legend>
        <div className="space-y-2">
          {MODELS.map((model) => (
            <label
              key={model.id}
              className="flex cursor-pointer items-start gap-2 rounded-lg border border-slate-200 px-3 py-2 text-sm has-[:checked]:border-brand-500 has-[:checked]:bg-brand-50/60 dark:border-slate-700 dark:has-[:checked]:bg-brand-900/30"
            >
              <input
                type="radio"
                name="model"
                value={model.id}
                checked={settings.modelId === model.id}
                onChange={() => settings.setModel(model.id)}
                className="mt-1"
              />
              <span className="flex-1">
                <span className="font-medium">{model.label}</span>
                <span className="text-slate-500 dark:text-slate-400"> · {model.blurb}</span>
                <span className="block text-xs text-slate-500 dark:text-slate-400">
                  每百萬 tokens：輸入 US${model.inputPrice}、輸出 US${model.outputPrice}
                </span>
              </span>
            </label>
          ))}
        </div>
      </fieldset>

      <div className="flex flex-wrap gap-2">
        <button type="submit" disabled={!key.trim()} className="rounded-lg bg-brand-700 px-4 py-2 text-sm font-medium text-white hover:bg-brand-800 disabled:bg-slate-300 dark:disabled:bg-slate-700">
          儲存並開啟 AI 模式
        </button>
        {settings.apiKey && (
          <button
            type="button"
            onClick={() => {
              settings.forgetKey();
              setKey('');
              setRemember(false);
            }}
            className="inline-flex items-center gap-1.5 rounded-lg border border-red-300 px-4 py-2 text-sm text-red-700 hover:bg-red-50 dark:border-red-800 dark:text-red-300 dark:hover:bg-red-950/40"
          >
            <Trash2 className="size-4" aria-hidden />
            忘記金鑰
          </button>
        )}
      </div>
    </form>
  );
}

export function AiSettingsDialog({ open, onClose, settings }: { open: boolean; onClose: () => void; settings: AiSettings }) {
  return (
    <Dialog open={open} onClose={onClose} title="AI 模式">
      <div className="space-y-5 text-sm leading-relaxed">
        <section className="space-y-2">
          <p>
            AI 模式會先在市政 FAQ 裡找出最相關的 {AI_CONTEXT_ENTRIES} 則，連同你的問題一起送給 Anthropic 的 Claude，
            請它只根據這些 FAQ 回答、標出每個重點的出處；FAQ 沒寫到的，它會直說沒有。
          </p>
          <p>
            費用由你的 Anthropic 帳戶支付。以 Claude Opus 5.5 估計，每題大約 US$0.01–0.05；Sonnet 約一半，Haiku 不到 US$0.005。
            每個回答下面會顯示這次實際用了多少。
          </p>
        </section>

        <section className="rounded-xl border border-amber-300 bg-amber-50 px-4 py-3 dark:border-amber-700/60 dark:bg-amber-950/30">
          <h3 className="mb-1.5 flex items-center gap-1.5 font-semibold">
            <ShieldAlert className="size-4 text-amber-600" aria-hidden />
            使用前請先了解風險
          </h3>
          <ul className="list-disc space-y-1 pl-5">
            <li>金鑰從你的瀏覽器直接送到 api.anthropic.com，不經過任何其他伺服器；網頁的安全設定也禁止把資料送到其他網址。</li>
            <li>勾選「記住金鑰」後，能使用這個瀏覽器的人、或惡意的瀏覽器擴充功能，都可能讀到它。公用電腦請不要勾。</li>
            <li>
              建議為這個網站另外建一把金鑰，並在 Console 設定
              <a href={ANTHROPIC_CONSOLE.limits} target="_blank" rel="noreferrer" className="underline">
                每月用量上限
              </a>
              ；用完可以直接在 Console 刪除。
            </li>
            <li>你的問題和找到的 FAQ 會送給 Anthropic 處理，請不要輸入身分證字號等個人資料。</li>
          </ul>
        </section>

        <KeyForm settings={settings} onDone={onClose} />

        {settings.apiKey && (
          <p className="text-xs text-slate-500 dark:text-slate-400">
            目前狀態：金鑰{settings.remembered ? '已記在這台裝置' : '只在這個分頁的記憶體裡'}，AI 模式{settings.active ? '開啟中' : '關閉中（可在輸入框上方切換）'}。
          </p>
        )}
      </div>
    </Dialog>
  );
}
