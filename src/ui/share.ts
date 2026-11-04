/** The page address that asks `question` when opened (`?q=`). */
export function questionUrl(question: string, location: Location = window.location): string {
  const url = new URL(location.href);
  url.search = '';
  url.hash = '';
  url.searchParams.set('q', question);
  return url.href;
}

/** The question in the address bar when the page was opened, if any. */
export function questionFromUrl(location: Location = window.location): string | null {
  const question = new URL(location.href).searchParams.get('q')?.trim();
  return question ? question : null;
}

/** Keep the address bar in step with the conversation, so it can be copied. */
export function rememberQuestionInUrl(question: string): void {
  try {
    window.history.replaceState(null, '', questionUrl(question));
  } catch {
    // Some embedded browsers refuse; sharing still works through the button.
  }
}

/** Share a question with the system share sheet, or copy its link. */
export async function shareQuestion(question: string): Promise<'shared' | 'copied' | 'failed'> {
  const url = questionUrl(question);
  try {
    if (navigator.share) {
      await navigator.share({ title: question, url });
      return 'shared';
    }
    await navigator.clipboard.writeText(url);
    return 'copied';
  } catch {
    return 'failed';
  }
}
