/**
 * Language resources used on the query side only. The FAQ text is indexed
 * as published; these lists adjust what a visitor types.
 */

/**
 * Words that make a sentence a question but say nothing about the topic.
 * They are removed from the query before it is split into terms, so 「市長是誰」
 * is matched on 「市長」 and not on every FAQ that asks 「…是誰？」.
 * Longest first, so 「怎麼辦」 is removed before 「怎麼」.
 */
export const QUESTION_WORDS = [
  '可不可以', '能不能', '有沒有', '是不是', '為什麼', '怎麼辦', '怎麼樣', '要怎麼',
  '請問', '想問', '我想', '我要', '如何', '怎麼', '怎樣', '什麼', '甚麼', '為何', '是否',
  '可以', '哪裡', '哪裏', '哪些', '哪個', '多少', '何時', '是誰', '幾點',
];

/** Sentence-final particles, removed only at the end of the query. */
export const FINAL_PARTICLES = ['嗎', '呢', '吧', '啊', '呀', '了'];

/**
 * Everyday words next to the words the city's FAQ uses. When a query contains
 * one member of a group, the other members are searched too, at a lower
 * weight. Keep groups small and unambiguous; the AI mode handles real
 * paraphrasing.
 */
export const SYNONYM_GROUPS: readonly (readonly string[])[] = [
  ['狗', '犬', '寵物'],
  ['貓', '寵物'],
  ['腳踏車', '單車', '自行車'],
  ['摩托車', '機車'],
  ['小孩', '兒童', '幼兒'],
  ['老人', '長者', '敬老'],
  ['罰單', '罰鍰'],
  ['房租', '租金'],
  ['身份證', '身分證'],
  ['幾點', '時間'],
  ['不亮', '故障', '失明'],
  ['掉了', '弄丟', '不見', '遺失'],
];

/** How much a synonym counts compared with the word the visitor typed. */
export const SYNONYM_WEIGHT = 0.6;
