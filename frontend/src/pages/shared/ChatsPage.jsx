import { useEffect, useState } from 'react';
import { useAuth } from '../../context/AuthContext.jsx';
import ChatUI from '../../components/ChatUI.jsx';
import SimulatorModal from '../../components/SimulatorModal.jsx';
import Icon from '../../components/icons.jsx';
import { PageHead } from '../../components/ui.jsx';

export default function ChatsPage() {
  const { user } = useAuth();
  const [simOpen, setSimOpen] = useState(false);
  const [ready, setReady] = useState(false);

  // Give ChatUI a moment to mount its own loader (visual polish only)
  useEffect(() => {
    const t = setTimeout(() => setReady(true), 0);
    return () => clearTimeout(t);
  }, []);

  const canSimulate = user.role === 'ADMIN' || user.role === 'MANAGER';

  return (
    <div className="page">
      <PageHead
        title="Chats"
        sub={
          user.role === 'EMPLOYEE'
            ? 'Your assigned conversations and groups — messages appear in real time.'
            : 'Monitor and reply to conversations across your permitted accounts.'
        }
        actions={
          canSimulate && (
            <button className="btn" type="button" onClick={() => setSimOpen(true)}>
              <Icon name="zap" size={14} />
              Simulate new message
            </button>
          )
        }
      />
      <ChatUI />
      {simOpen && <SimulatorModal onClose={() => setSimOpen(false)} />}
    </div>
  );
}
