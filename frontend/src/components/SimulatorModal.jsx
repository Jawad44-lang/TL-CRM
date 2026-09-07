import { useEffect, useState } from 'react';
import api from '../services/api';
import { Modal, useToast } from './ui.jsx';

/**
 * Demo Message Simulator (PRD §40) — injects an incoming message through the
 * SAME pipeline a real Telegram webhook will use later.
 */
export default function SimulatorModal({ onClose }) {
  const toast = useToast();
  const [accounts, setAccounts] = useState([]);
  const [customers, setCustomers] = useState([]);
  const [groups, setGroups] = useState([]);
  const [loaded, setLoaded] = useState(false);
  const [busy, setBusy] = useState(false);

  const [accountId, setAccountId] = useState('');
  const [type, setType] = useState('CUSTOMER');
  const [targetId, setTargetId] = useState('NEW');
  const [content, setContent] = useState('Assalamualaikum, mujhe pricing details chahiye.');

  useEffect(() => {
    (async () => {
      try {
        const { data } = await api.get('/demo/options');
        setAccounts(data.accounts);
        setCustomers(data.customers);
        setGroups(data.groups);
        if (data.accounts.length) setAccountId(data.accounts[0]._id);
        setLoaded(true);
      } catch (e) {
        toast(e.message, 'error');
      }
    })();
  }, [toast]);

  const submit = async (e) => {
    e.preventDefault();
    setBusy(true);
    try {
      const { data } = await api.post('/demo/message', { accountId, type, targetId, content });
      const routed = data.assignedEmployeeId ? 'assigned employee' : 'New / Unassigned queue';
      toast(`Message injected → ${routed}`, 'success');
      onClose();
    } catch (err) {
      toast(err.message, 'error');
    } finally {
      setBusy(false);
    }
  };

  return (
    <Modal title="Demo Message Simulator" onClose={onClose}>
      <p className="small muted" style={{ marginTop: -6 }}>
        Simulates an incoming platform message. It flows through the same Message Processor a real
        Telegram webhook will use later.
      </p>
      {!loaded ? (
        <div className="center-loader"><div className="spinner" /></div>
      ) : (
        <form onSubmit={submit}>
          <div className="form-row">
            <div className="field">
              <label className="label">Platform</label>
              <input className="input" value="Telegram" disabled />
            </div>
            <div className="field">
              <label className="label">Account</label>
              <select className="select" value={accountId} onChange={(e) => setAccountId(e.target.value)}>
                {accounts.map((a) => (
                  <option key={a._id} value={a._id}>{a.name}</option>
                ))}
              </select>
            </div>
          </div>
          <div className="form-row">
            <div className="field">
              <label className="label">Type</label>
              <select className="select" value={type} onChange={(e) => { setType(e.target.value); setTargetId(e.target.value === 'GROUP' ? (groups[0]?._id || '') : 'NEW'); }}>
                <option value="CUSTOMER">Customer</option>
                <option value="GROUP">Group</option>
              </select>
            </div>
            <div className="field">
              <label className="label">{type === 'GROUP' ? 'Group' : 'Customer'}</label>
              {type === 'GROUP' ? (
                <select className="select" value={targetId} onChange={(e) => setTargetId(e.target.value)}>
                  {groups.map((g) => (
                    <option key={g._id} value={g._id}>{g.name}</option>
                  ))}
                </select>
              ) : (
                <select className="select" value={targetId} onChange={(e) => setTargetId(e.target.value)}>
                  <option value="NEW">New customer (tests unassigned flow)</option>
                  {customers.map((c) => (
                    <option key={c._id} value={c._id}>{c.name}</option>
                  ))}
                </select>
              )}
            </div>
          </div>
          <div className="field">
            <label className="label">Message</label>
            <textarea className="textarea" rows={3} value={content} onChange={(e) => setContent(e.target.value)} />
          </div>
          <div className="modal-actions">
            <button type="button" className="btn btn-ghost" onClick={onClose}>Cancel</button>
            <button type="submit" className="btn" disabled={busy || !accountId || (type === 'GROUP' && !targetId)}>
              {busy ? 'Sending...' : 'Send Demo Message'}
            </button>
          </div>
        </form>
      )}
    </Modal>
  );
}
