import { createContext, useCallback, useContext, useEffect, useState } from 'react';
import Icon from './icons.jsx';

const ConfirmContext = createContext(() => Promise.resolve(false));
const SKIP_KEY = 'crm.confirm.skip';

function loadSkipped() {
  try {
    const raw = JSON.parse(localStorage.getItem(SKIP_KEY) || '[]');
    return Array.isArray(raw) ? raw : [];
  } catch {
    return [];
  }
}

export function getConfirmSkipCount() {
  return loadSkipped().length;
}

export function resetConfirmSkips() {
  try { localStorage.removeItem(SKIP_KEY); } catch { /* ignore */ }
}

/* Global confirmation dialog — for every dangerous action.
   Usage: const confirm = useConfirm();
          const ok = await confirm({ key: 'user.delete', title, message, confirmText });
          if (!ok) return;

   `key` is the unique ID of the action. If the user ticks
   "Don't show me again for this action" in the popup, ONLY this key's
   popup is skipped — popups for all other actions keep appearing. */
export function ConfirmProvider({ children }) {
  const [state, setState] = useState(null);
  const [skipChecked, setSkipChecked] = useState(false);

  const confirm = useCallback((opts = {}) =>
    new Promise((resolve) => {
      const key = opts.key || '';
      if (key && loadSkipped().includes(key)) {
        resolve(true); // ye action skip-marked hai — popup ke bagair seedha allow
        return;
      }
      setSkipChecked(false);
      setState({
        key,
        title: opts.title || 'Are you sure?',
        message: opts.message || '',
        confirmText: opts.confirmText || 'Yes, continue',
        cancelText: opts.cancelText || 'Cancel',
        danger: opts.danger !== false,
        resolve,
      });
    }), []);

  const close = useCallback((result, dontShowAgain) => {
    setState((current) => {
      if (current) {
        if (result && dontShowAgain && current.key) {
          try {
            const skipped = loadSkipped();
            if (!skipped.includes(current.key)) {
              skipped.push(current.key);
              localStorage.setItem(SKIP_KEY, JSON.stringify(skipped));
            }
          } catch { /* ignore */ }
        }
        current.resolve(result);
      }
      return null;
    });
  }, []);

  useEffect(() => {
    if (!state) return undefined;
    const onKey = (e) => { if (e.key === 'Escape') close(false, false); };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [state, close]);

  return (
    <ConfirmContext.Provider value={confirm}>
      {children}
      {state && (
        <div className="confirm-overlay" onClick={() => close(false, false)}>
          <div className="confirm-dialog" role="alertdialog" aria-modal="true" onClick={(e) => e.stopPropagation()}>
            <div className={`confirm-icon ${state.danger ? 'danger' : ''}`}>
              <Icon name={state.danger ? 'alert' : 'help'} size={22} />
            </div>
            <h3 className="confirm-title">{state.title}</h3>
            {state.message && <p className="confirm-message">{state.message}</p>}
            {state.key && (
              <label className="confirm-skip">
                <input type="checkbox" checked={skipChecked} onChange={(e) => setSkipChecked(e.target.checked)} />
                Don&apos;t show me again for this action
              </label>
            )}
            <div className="confirm-actions">
              <button className="btn btn-ghost" type="button" onClick={() => close(false, false)}>{state.cancelText}</button>
              <button
                className={`btn ${state.danger ? 'btn-danger' : ''}`}
                type="button"
                onClick={() => close(true, skipChecked)}
              >
                {state.confirmText}
              </button>
            </div>
          </div>
        </div>
      )}
    </ConfirmContext.Provider>
  );
}

export function useConfirm() {
  return useContext(ConfirmContext);
}

