/**
 * DEMO ADAPTER — ACTIVE in Phase 1 (PRD §67).
 * Simulates delivery to the external platform without any real credentials (PRD §55).
 */
const demoAdapter = {
  key: 'DEMO',
  label: 'Demo Messaging Adapter',
  isActive: true,

  async sendMessage(account, targetExternalId, message) {
    console.log(
      `[DEMO ADAPTER] "${account?.name}" → ${targetExternalId}: "${(message.content || '[media]').slice(0, 80)}"`
    );
    // Simulate platform-side delivery of the outgoing business message (PRD §21/§37).
    // The simulated customer sees sender identity only as "Business Account" (PRD §23).
    return { delivered: true, simulated: true, deliveredAt: new Date() };
  },

  async verifyConnection() {
    return { ok: true, simulated: true };
  },
};

export default demoAdapter;
