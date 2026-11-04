import { X } from 'lucide-react';
import { type ReactNode, useEffect, useId, useRef } from 'react';

interface DialogProps {
  open: boolean;
  onClose: () => void;
  title: ReactNode;
  children: ReactNode;
  /** Wider dialogs for lists. */
  wide?: boolean;
}

/**
 * A modal built on the native <dialog>: the browser handles focus trapping,
 * Esc to close and the backdrop. Full screen on phones, centred on larger screens.
 */
export function Dialog({ open, onClose, title, children, wide = false }: DialogProps) {
  const ref = useRef<HTMLDialogElement>(null);
  const titleId = useId();

  useEffect(() => {
    const dialog = ref.current;
    if (!dialog) return;
    if (open && !dialog.open) dialog.showModal();
    if (!open && dialog.open) dialog.close();
  }, [open]);

  return (
    <dialog
      ref={ref}
      aria-labelledby={titleId}
      onClose={onClose}
      onClick={(event) => event.target === ref.current && onClose()}
      className={`m-0 h-full max-h-none w-full max-w-none bg-white p-0 text-slate-800 shadow-2xl sm:m-auto sm:h-auto sm:max-h-[85vh] sm:rounded-2xl dark:bg-slate-900 dark:text-slate-100 ${wide ? 'sm:max-w-2xl' : 'sm:max-w-lg'}`}
    >
      <div className="flex h-full flex-col sm:max-h-[85vh]">
        <header className="flex items-center justify-between gap-3 border-b border-slate-200 px-5 py-4 dark:border-slate-800">
          <h2 id={titleId} className="text-lg font-semibold">
            {title}
          </h2>
          <button
            type="button"
            onClick={onClose}
            aria-label="關閉"
            className="rounded-full p-1.5 text-slate-500 hover:bg-slate-100 hover:text-slate-800 dark:hover:bg-slate-800 dark:hover:text-slate-100"
          >
            <X className="size-5" aria-hidden />
          </button>
        </header>
        <div className="flex-1 overflow-y-auto px-5 py-4">{open ? children : null}</div>
      </div>
    </dialog>
  );
}
