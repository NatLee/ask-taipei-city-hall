/**
 * What the bot says. Several lines come straight from the 2017 bot (marked),
 * so it keeps the same voice; its mascot Yee is back as the avatar.
 */
export const PERSONA = {
  name: 'Yee',
  /** 2017: the menu title on LINE and Messenger. */
  suggestTitle: '您是不是想問…？',
  directTitle: '我找到最相關的這一則：',
  relatedTitle: '你可能還想問',
  /** 2017: 「(,,・ω・,,)對不起我不太懂您的問題，我餵了估狗，希望對您有幫助」. */
  notFound: '(,,・ω・,,) 對不起，我不太懂您的問題。我幫您準備了搜尋連結，希望對您有幫助！',
  notFoundTip: '換個說法、用更短的關鍵字，或打開 AI 模式試試看。',
  /** 2017: the reply when the LINE API failed. */
  trouble: '啊哦！關於這個問題或許我們遇到了點麻煩。',
  loading: '正在載入市政 FAQ…',
  aiDisclaimer: 'AI 依上面的 FAQ 整理，可能出錯；重要的事請以機關公告為準。',
  refused: '這個問題被 Anthropic 的安全機制擋下了，換個說法再試試看。',
} as const;

export function welcomeText(total: number | null): string {
  const count = total === null ? '八千多' : total.toLocaleString('zh-TW');
  return `嗨！我是 ${PERSONA.name}，台北市政小幫手。我會從臺北市政府公開的 ${count} 則常見問答裡幫你找答案，每個答案都附上出處。`;
}
