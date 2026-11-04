import { CONTEST, REPO_URL } from '../config/links.ts';
import { useDatasetMeta } from './DatasetContext.ts';
import { Dialog } from './Dialog.tsx';

const TEAM_2017 = ['NatLee', '張語航（changyuhang）', 'impaulapple'];

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString('zh-TW', { year: 'numeric', month: '2-digit', day: '2-digit' });
}

export function AboutDialog({ open, onClose }: { open: boolean; onClose: () => void }) {
  const meta = useDatasetMeta();
  return (
    <Dialog open={open} onClose={onClose} title="關於問問台北市政府">
      <div className="space-y-5 text-sm leading-relaxed">
        <blockquote className="border-l-4 border-amber-300 pl-3 text-slate-600 dark:text-slate-300">
          <a href={CONTEST.url} target="_blank" rel="noreferrer" className="underline">
            {CONTEST.name}
          </a>
          的參賽作品。當年是 Facebook 和 LINE 上的聊天機器人，2026 年改寫成這個網頁。
          <span className="mt-1 block text-xs">2017 團隊：{TEAM_2017.join('、')}</span>
        </blockquote>

        <section>
          <h3 className="mb-1 font-semibold">它怎麼運作</h3>
          <p>
            網頁把臺北市政府公開的常見問答下載到你的瀏覽器，在本機建立搜尋索引，所以免費模式不需要伺服器，問題也不會離開你的電腦。
            開啟 AI 模式時，找到的 FAQ 和你的問題會直接送到 Anthropic API，由 Claude 整理答案並標出出處。
          </p>
        </section>

        <section>
          <h3 className="mb-1 font-semibold">資料來源</h3>
          {meta ? (
            <>
              <ul className="space-y-1.5">
                {meta.sources.map((source) => (
                  <li key={source.id}>
                    <a href={source.datasetUrl} target="_blank" rel="noreferrer" className="underline">
                      {source.name}
                    </a>
                    （{source.provider}，{source.records.toLocaleString()} 筆，{formatDate(source.fetchedAt)} 下載
                    {source.stale ? '，因無法連線而使用先前的備份' : ''}）
                  </li>
                ))}
              </ul>
              <p className="mt-2 text-xs text-slate-500 dark:text-slate-400">
                以上資料依
                <a href={meta.sources[0]?.license.url} target="_blank" rel="noreferrer" className="underline">
                  {meta.sources[0]?.license.title}
                </a>
                提供，由提供機關授權使用。整理後共 {meta.total.toLocaleString()} 題，網站資料於 {formatDate(meta.generatedAt)} 更新。
              </p>
            </>
          ) : (
            <p className="text-slate-500">資料載入中…</p>
          )}
        </section>

        <section>
          <h3 className="mb-1 font-semibold">原始碼</h3>
          <p>
            <a href={REPO_URL} target="_blank" rel="noreferrer" className="underline">
              GitHub：NatLee/ask-taipei-city-hall
            </a>
            ，Apache-2.0 授權。這不是臺北市政府的官方服務。
          </p>
        </section>
      </div>
    </Dialog>
  );
}
