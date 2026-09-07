import demoAdapter from './demoAdapter.js';
import telegramAdapter from './telegramAdapter.js';

const realAdapters = { TELEGRAM: telegramAdapter };

/**
 * Resolve the adapter for an account (PRD §67).
 * Accounts in DEMO mode always use the demo adapter; LIVE mode uses the
 * real platform adapter when it becomes available.
 */
export function getAdapterForAccount(account) {
  if (account.mode === 'LIVE' && realAdapters[account.platformKey]?.isActive) {
    return realAdapters[account.platformKey];
  }
  return demoAdapter;
}

export { demoAdapter, telegramAdapter };
