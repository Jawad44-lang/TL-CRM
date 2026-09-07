import { useState } from 'react';
import api from '../../services/api';
import { useAuth } from '../../context/AuthContext.jsx';
import { Avatar, PageHead, useToast } from '../../components/ui.jsx';
import { getConfirmSkipCount, resetConfirmSkips } from '../../components/ConfirmProvider.jsx';

export default function SettingsPage() {
  const { user } = useAuth();
  const toast = useToast();
  const [password, setPassword] = useState('');
  const [busy, setBusy] = useState(false);
  const [skipCount, setSkipCount] = useState(getConfirmSkipCount());

  const reenableConfirms = () => {
    resetConfirmSkips();
    setSkipCount(0);
    toast('All confirmation popups are back on.', 'success');
  };

  const changePassword = async (e) => {
    e.preventDefault();
    if (password.length < 6) {
      toast('Password must be at least 6 characters.', 'error');
      return;
    }
    setBusy(true);
    try {
      await api.patch(`/users/${user._id}`, { password });
      toast('Password updated successfully.', 'success');
      setPassword('');
    } catch (err) {
      toast(err.message, 'error');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="page">
      <PageHead title="Settings" sub="Your profile and account preferences." />

      <div className="card" style={{ maxWidth: 640 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 16, marginBottom: 18 }}>
          <Avatar name={user.name} color={user.avatarColor} size="lg" />
          <div>
            <div className="cell-strong" style={{ fontSize: 17 }}>{user.name}</div>
            <div className="cell-sub">{user.email}</div>
            <div style={{ display: 'flex', gap: 6, marginTop: 6 }}>
              <span className="badge badge-indigo">{user.role}</span>
              <span className={`badge ${user.status === 'ACTIVE' ? 'badge-green' : 'badge-red'}`}>{user.status}</span>
            </div>
          </div>
        </div>

        <h3 className="card-title">Change password</h3>
        <form onSubmit={changePassword}>
          <div className="field" style={{ maxWidth: 320 }}>
            <label className="label">New password</label>
            <input className="input" type="password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="••••••••" />
          </div>
          <button className="btn" type="submit" disabled={busy}>{busy ? 'Saving...' : 'Update password'}</button>
        </form>
      </div>

      <div className="card" style={{ maxWidth: 640 }}>
        <h3 className="card-title">Confirmation popups</h3>
        <p className="small muted" style={{ marginTop: 0 }}>
          Dangerous actions (delete, disable, log out…) ask for confirmation first. Agar tumne kisi action pe
          &quot;Don&apos;t show me again&quot; tick kiya tha, to sirf wohi popup skip hota hai — yahan se sab wapas on kar sakte ho.
        </p>
        <button className="btn btn-ghost" type="button" onClick={reenableConfirms} disabled={skipCount === 0}>
          Re-enable all confirmation popups{skipCount > 0 ? ` (${skipCount} turned off)` : ''}
        </button>
      </div>

      <div className="card" style={{ maxWidth: 640 }}>
        <h3 className="card-title">Demo environment</h3>
        <p className="small muted" style={{ marginTop: 0 }}>
          This instance runs with <strong>DEMO_MODE=true</strong> — the Demo Messaging Adapter simulates all
          platform traffic (no real Telegram/Instagram/WhatsApp credentials are used). Demo tools like the
          Message Simulator and Reset Demo Data are available to Admin/Manager users.
        </p>
      </div>
    </div>
  );
}
