/**
 * Outside links the page shows. Kept in one place so a changed URL is a
 * one-line fix.
 */

export const REPO_URL = 'https://github.com/NatLee/ask-taipei-city-hall';

/** The 2017 contest this project was built for. */
export const CONTEST = {
  name: '2017 台北市政 ChatBot 應用競賽',
  url: 'https://taipei.join.gov.tw/policies/detail/80c6fa3c-30a7-4899-8c88-de73349b4619',
};

/** Taipei's citizen hotline; the out-of-town number is the same line with an area code. */
export const HOTLINE = {
  name: '1999 市民當家熱線',
  local: '1999',
  outOfTown: '02-2720-8889',
  url: 'https://1999.gov.taipei/',
};

/** Search pages for a question the FAQ does not cover. */
export const SEARCH_LINKS = [
  { name: '臺北市政府網站', url: (query: string) => `https://www.gov.taipei/Search.aspx?q=${encodeURIComponent(query)}` },
  { name: 'Google', url: (query: string) => `https://www.google.com/search?q=${encodeURIComponent(`${query} site:gov.taipei`)}` },
];

export const ANTHROPIC_CONSOLE = {
  keys: 'https://platform.claude.com/settings/keys',
  limits: 'https://platform.claude.com/settings/limits',
  pricing: 'https://platform.claude.com/docs/en/about-claude/pricing',
};
