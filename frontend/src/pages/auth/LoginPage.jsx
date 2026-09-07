import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth, homeFor } from '../../context/AuthContext.jsx';
import { useToast } from '../../components/ui.jsx';
import Icon from '../../components/icons.jsx';
import LogoMark from '../../components/Logo.jsx';
import api from '../../services/api';

export default function LoginPage() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const toast = useToast();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  const submit = async (e) => {
    e.preventDefault();
    setError('');
    if (!email || !password) {
      setError('Enter your email and password to continue.');
      return;
    }
    setBusy(true);
    try {
      const user = await login(email, password);
      toast(`Welcome back, ${user.name}!`, 'success');
      navigate(homeFor(user.role), { replace: true });
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  };

  const quickFill = (em, pass) => {
    setEmail(em);
    setPassword(pass);
    setError('');
  };

  return (
    <div className="login-screen">
      <div className="login-card">
        <div className="login-visual">
          <div className="login-visual-brand">
            <LogoMark size={34} />
            <span className="brand-text">
              <span className="brand-name">Trading Legend</span>
              <span className="brand-sub">CRM Workspace</span>
            </span>
          </div>

          <div>
            <h2>One inbox for every customer conversation.</h2>
            <p>
              Manage Telegram business chats, assign teammates, track read status and reply in real time —
              all from a single professional dashboard.
            </p>
          </div>

          <div>
            <div className="visual-chip">
              <Icon name="zap" size={15} />
              Real-time updates via Socket.IO
            </div>
            <div className="visual-chip">
              <Icon name="key" size={15} />
              Role-based access — Admin, Manager, Employee
            </div>
            <div className="visual-chip">
              <Icon name="users-round" size={15} />
              Assignment, reassignment & temporary access built-in
            </div>
          </div>
        </div>

        <div className="login-form-side">
          <h1>Sign in</h1>
          <p className="sub">Use your CRM account to continue.</p>
          {error && (
            <div className="error-text">
              <Icon name="alert" size={15} />
              <span>{error}</span>
            </div>
          )}
          <form onSubmit={submit}>
            <div className="field">
              <label className="label" htmlFor="email">Email</label>
              <input
                id="email"
                className="input"
                type="email"
                placeholder="you@company.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                autoComplete="username"
              />
            </div>
            <div className="field">
              <label className="label" htmlFor="password">Password</label>
              <input
                id="password"
                className="input"
                type="password"
                placeholder="Enter your password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                autoComplete="current-password"
              />
            </div>
            <button className="btn btn-block" type="submit" disabled={busy}>
              {busy ? 'Signing in…' : 'Sign in'}
            </button>
          </form>

          <div className="demo-creds">
            <div className="demo-creds-label">Demo accounts</div>
            <button type="button" className="demo-cred-btn" onClick={() => quickFill('admin@example.com', 'Admin@123')}>
              Admin
              <span>admin@example.com</span>
            </button>
            <button type="button" className="demo-cred-btn" onClick={() => quickFill('manager1@example.com', 'Manager@123')}>
              Manager
              <span>manager1@example.com</span>
            </button>
            <button type="button" className="demo-cred-btn" onClick={() => quickFill('employee1@example.com', 'Employee@123')}>
              Employee
              <span>employee1@example.com</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}