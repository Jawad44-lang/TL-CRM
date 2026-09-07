/**
 * TELEGRAM ADAPTER — NOT CONNECTED in Phase 1 (PRD §42/§67).
 * Implements the same interface as the demo adapter so the CRM can switch
 * to real Telegram integration later WITHOUT rewriting core logic.
 *
 * Future wiring:
 *   Telegram Webhook → telegramAdapter.processWebhookUpdate() → messageProcessor.processIncomingMessage()
 */
const telegramAdapter = {
  key: 'TELEGRAM',
  label: 'Telegram Business Adapter',
  isActive: false, // Phase 1: not connected

  async sendMessage(account, targetExternalId, message) {
    throw new Error(
      'Telegram adapter is not connected in Phase 1. Account is running in DEMO mode.'
    );
  },

  async verifyConnection() {
    return { ok: false, reason: 'Telegram integration not configured yet.' };
  },

  // Placeholder for the future webhook entry point.
  async processWebhookUpdate(/* update */) {
    throw new Error('Telegram webhook processing is not implemented in Phase 1.');
  },
};

export default telegramAdapter;
