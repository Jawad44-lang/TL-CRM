import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import api from '../services/api';
import { useAuth } from '../context/AuthContext.jsx';
import { useSocket, useSocketEvent } from '../socket/socket.jsx';
import { Avatar, EmptyState, PageLoader, useToast } from './ui.jsx';
import Icon from './icons.jsx';
import { clockTime, dayLabel, timeAgo, PLATFORM_LABELS } from '../utils/format';

const ROLE_CHIP = { MANAGER: 'chip-manager', ADMIN: 'chip-admin', EMPLOYEE: 'chip-employee', CUSTOMER: 'chip-customer' };

export default function ChatUI() {
  const { user } = useAuth();
  const { joinConversation, leaveConversation, typing } = useSocket();
  const toast = useToast();

  const [conversations, setConversations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState('ALL');
  const [search, setSearch] = useState('');
  const [activeId, setActiveId] = useState(null);
  const [detail, setDetail] = useState(null);
  const [messages, setMessages] = useState([]);
  const [hasMore, setHasMore] = useState(false);
  const [loadingMsgs, setLoadingMsgs] = useState(false);
  const [draft, setDraft] = useState('');
  const [sending, setSending] = useState(false);
  const [typingByConv, setTypingByConv] = useState({});
  const scrollRef = useRef(null);
  const fileRef = useRef(null);
  const activeIdRef = useRef(null);
  const typingTimers = useRef({});
  const typingStopTimer = useRef(null);
  activeIdRef.current = activeId;

  const openConversation = useCallback(
    async (id) => {
      if (!id) return;
      if (activeIdRef.current && activeIdRef.current !== id) leaveConversation(activeIdRef.current);
      setActiveId(id);
      setLoadingMsgs(true);
      setDetail(null);
      setMessages([]);
      try {
        const [d, m] = await Promise.all([api.get(`/conversations/${id}`), api.get(`/messages/${id}?limit=30`)]);
        setDetail(d.data);
        setMessages(m.data.items);
        setHasMore(m.data.hasMore);
        joinConversation(id);
        api.post(`/conversations/${id}/read`).catch(() => {});
        setConversations((prev) => prev.map((c) => (c._id === id ? { ...c, unread: false } : c)));
      } catch (e) {
        toast(e.message, 'error');
      } finally {
        setLoadingMsgs(false);
      }
    },
    [joinConversation, leaveConversation, toast]
  );

  const loadConversations = useCallback(async () => {
    try {
      const { data } = await api.get('/conversations?limit=60');
      setConversations(data.items);
      if (!activeIdRef.current && data.items && data.items.length > 0) {
        openConversation(data.items[0]._id);
      }
      return data.items;
    } catch (e) {
      toast(e.message, 'error');
      return [];
    } finally {
      setLoading(false);
    }
  }, [openConversation, toast]);

  useEffect(() => {
    loadConversations();
  }, [loadConversations]);

  useEffect(() => {
    const el = scrollRef.current;
    if (el) {
      const timer = setTimeout(() => {
        el.scrollTop = el.scrollHeight;
      }, 50);
      return () => clearTimeout(timer);
    }
  }, [messages, activeId, loadingMsgs, typingByConv]);

  /* ------------------------- Socket events (PRD §57) ------------------------- */
  useSocketEvent('message:new', ({ conversationId, message, conversation }) => {
    const cid = String(conversationId);
    if (cid === activeIdRef.current) {
      setMessages((prev) => (prev.some((x) => x._id === message._id) ? prev : [...prev, message]));
      api.post(`/conversations/${cid}/read`).catch(() => {});
    } else if (conversation) {
      setConversations((prev) => {
        const exists = prev.some((c) => c._id === cid);
        return exists
          ? prev.map((c) => (c._id === cid ? { ...c, unread: true, lastMessage: message, lastMessageAt: message.timestamp } : c))
          : [{ ...conversation, unread: true }, ...prev];
      });
    }
  });

  useSocketEvent('message:sent', ({ conversationId, message }) => {
    const cid = String(conversationId);
    if (cid !== activeIdRef.current) return;
    setMessages((prev) => (prev.some((x) => x._id === message._id) ? prev : [...prev, message]));
    setConversations((prev) =>
      prev.map((c) =>
        c._id === cid
          ? { ...c, lastMessage: { content: message.content, direction: 'OUTGOING', senderType: message.senderType, at: message.timestamp }, lastMessageAt: message.timestamp, unread: false }
          : c
      )
    );
  });

  useSocketEvent('conversation:new', ({ conversation }) => {
    if (!conversation) return;
    const cid = String(conversation._id);
    setConversations((prev) => (prev.some((c) => c._id === cid) ? prev : [{ ...conversation, unread: true }, ...prev]));
  });

  useSocketEvent('conversation:updated', ({ conversation }) => {
    if (!conversation) return;
    const cid = String(conversation._id);
    setConversations((prev) => prev.map((c) => (c._id === cid ? { ...c, ...conversation } : c)));
    if (cid === activeIdRef.current) {
      api.get(`/conversations/${cid}`).then((r) => setDetail(r.data)).catch(() => {});
    }
  });

  useSocketEvent('message:read', ({ conversationId, userId, lastReadMessageId }) => {
    const cid = String(conversationId);
    if (cid !== activeIdRef.current) return;
    setDetail((prev) =>
      prev ? { ...prev, participants: prev.participants.map((p) => (p.userId === String(userId) ? { ...p, lastReadMessageId } : p)) } : prev
    );
  });

  useSocketEvent('typing:start', ({ conversationId, userId, name }) => {
    const cid = String(conversationId);
    const uid = String(userId);
    if (cid !== activeIdRef.current || uid === String(user._id)) return;
    setTypingByConv((prev) => ({ ...prev, [cid]: { ...(prev[cid] || {}), [uid]: name } }));
    clearTimeout(typingTimers.current[uid]);
    typingTimers.current[uid] = setTimeout(() => {
      setTypingByConv((prev) => {
        const inner = { ...(prev[cid] || {}) };
        delete inner[uid];
        return { ...prev, [cid]: inner };
      });
    }, 3500);
  });

  useSocketEvent('typing:stop', ({ conversationId, userId }) => {
    const cid = String(conversationId);
    const uid = String(userId);
    setTypingByConv((prev) => {
      const inner = { ...(prev[cid] || {}) };
      delete inner[uid];
      return { ...prev, [cid]: inner };
    });
  });

  useSocketEvent('customer:assigned', () => loadConversations());
  useSocketEvent('customer:reassigned', () => loadConversations());
  useSocketEvent('tempaccess:changed', () => loadConversations());

  /* ------------------------------ Actions ------------------------------ */
  const send = async (media = null) => {
    const content = draft.trim();
    if ((!content && !media) || !activeId || sending) return;
    setSending(true);
    try {
      const { data } = await api.post(`/messages/${activeId}`, { content, media });
      setDraft('');
      typing(activeId, false);
      setMessages((prev) => (prev.some((x) => x._id === data.data._id) ? prev : [...prev, { ...data.data, direction: 'OUTGOING' }]));
      setConversations((prev) =>
        prev.map((c) =>
          c._id === activeId
            ? { ...c, lastMessage: { content, direction: 'OUTGOING', senderType: user.role, at: data.data.timestamp }, lastMessageAt: data.data.timestamp, unread: false }
            : c
        )
      );
    } catch (e) {
      toast(e.message, 'error');
    } finally {
      setSending(false);
    }
  };

  const onDraftChange = (v) => {
    setDraft(v);
    if (activeId) {
      typing(activeId, true);
      clearTimeout(typingStopTimer.current);
      typingStopTimer.current = setTimeout(() => typing(activeId, false), 1600);
    }
  };

  const onFile = (e) => {
    const file = e.target.files && e.target.files[0];
    if (!file) return;
    if (file.size > 300 * 1024) {
      toast('Image must be under 300KB in demo mode.', 'error');
      e.target.value = '';
      return;
    }
    const reader = new FileReader();
    reader.onload = () => send({ type: 'image', url: reader.result, name: file.name });
    reader.readAsDataURL(file);
    e.target.value = '';
  };

  const loadOlder = async () => {
    if (!messages.length || !activeId) return;
    try {
      const first = messages[0];
      const { data } = await api.get(`/messages/${activeId}?before=${first._id}&limit=30`);
      setMessages((prev) => [...data.items, ...prev]);
      setHasMore(data.hasMore);
    } catch (e) {
      toast(e.message, 'error');
    }
  };

  const toggleResolve = async () => {
    if (!activeId) return;
    try {
      const { data } = await api.post(`/conversations/${activeId}/resolve`);
      toast(data.message, 'success');
      setDetail((prev) => (prev ? { ...prev, conversation: { ...prev.conversation, status: data.status } } : prev));
    } catch (e) {
      toast(e.message, 'error');
    }
  };

  const closeConversation = () => {
    if (activeIdRef.current) leaveConversation(activeIdRef.current);
    setActiveId(null);
    setDetail(null);
    setMessages([]);
    setDraft('');
  };

  /* ------------------------------ Render ------------------------------ */
  const visible = conversations.filter((c) => {
    if (tab === 'UNREAD' && !c.unread) return false;
    if (tab === 'CUSTOMER' && c.conversationType !== 'CUSTOMER') return false;
    if (tab === 'GROUP' && c.conversationType !== 'GROUP') return false;
    const q = search.trim().toLowerCase();
    if (!q) return true;
    return (c.customer?.name || c.group?.name || '').toLowerCase().includes(q);
  });

  if (loading) return <div className="card"><PageLoader text="Loading conversations..." /></div>;

  const conv = detail?.conversation || null;
  const headName = conv ? conv.customer?.name || conv.group?.name || '' : '';
  const canSend = Boolean(user.role === 'ADMIN' || (detail && detail.myActions && (detail.myActions.includes('SEND') || detail.myActions.includes('REPLY'))));
  const canResolve = Boolean(detail && detail.myActions && detail.myActions.includes('RESOLVE')) && conv && conv.conversationType === 'CUSTOMER';
  const typingMap = (activeId && typingByConv[activeId]) || {};
  const typingNames = Object.values(typingMap);
  const lastOutgoing = [...messages].reverse().find((m) => m.direction === 'OUTGOING');
  const readChips = ((detail && detail.participants) || []).filter((p) => !p.isMe);

  const senderName = (m) => {
    if (m.senderType === 'CUSTOMER') return (conv && conv.customer && conv.customer.name) || 'Customer';
    if (String(m.senderId) === String(user._id)) return 'You';
    const p = ((detail && detail.participants) || []).find((x) => x.userId === String(m.senderId));
    return p ? p.name : m.senderType;
  };

  const assignedName = (() => {
    if (!conv || !conv.customer || !conv.customer.assignedEmployeeId) return 'Unassigned';
    const p = ((detail && detail.participants) || []).find((x) => x.userId === conv.customer.assignedEmployeeId);
    return p ? p.name : 'Assigned';
  })();

  const subLine = conv
    ? conv.conversationType === 'CUSTOMER'
      ? `${PLATFORM_LABELS[conv.customer?.platformKey] || ''} · ${conv.account?.name || ''} · ${conv.customer?.isOnline ? 'Online' : 'Offline'} · Assigned to: ${assignedName}`
      : `${PLATFORM_LABELS[conv.group?.platformKey] || ''} · ${conv.account?.name || ''} · ${conv.group?.memberEmployeeIds?.length || 0} members`
    : '';

  return (
    <div className={`chat-shell ${activeId ? 'with-thread' : 'with-list'}`}>
      <aside className="chat-side">
        <div className="chat-side-head">
          <div className="chat-side-title">{user.role === 'EMPLOYEE' ? 'Your Chats' : 'Conversations'}</div>
          <input className="chat-search" placeholder="Search chats..." value={search} onChange={(e) => setSearch(e.target.value)} />
        </div>
        <div className="chat-tabs">
          {[['ALL', 'All'], ['CUSTOMER', 'Customers'], ['GROUP', 'Groups'], ['UNREAD', 'Unread']].map(([k, l]) => (
            <button key={k} type="button" className={`chat-tab ${tab === k ? 'active' : ''}`} onClick={() => setTab(k)}>{l}</button>
          ))}
        </div>
        <div className="chat-list">
          {visible.length === 0 && (
            <div className="empty-state" style={{ padding: '32px 16px' }}>
              <div className="empty-icon"><Icon name="messages-square" size={24} /></div>
              <h4>No conversations</h4>
              <p>{user.role === 'EMPLOYEE' ? 'Your manager will assign conversations to you.' : 'New messages will appear here in real time.'}</p>
            </div>
          )}
          {visible.map((c) => {
            const name = (c.customer && c.customer.name) || (c.group && c.group.name) || 'Unknown';
            const preview = c.lastMessage
              ? `${c.lastMessage.direction === 'OUTGOING' ? 'You: ' : ''}${c.lastMessage.content || '[media]'}`
              : 'No messages yet';
            return (
              <div key={c._id} className={`chat-item ${c._id === activeId ? 'active' : ''}`} onClick={() => openConversation(c._id)}>
                <Avatar name={name} color={c.conversationType === 'GROUP' ? '#7C6CF6' : '#0EA5E9'} size="md" />
                <div className="chat-item-main">
                  <div className="chat-item-name">
                    <span style={{ overflow: 'hidden', textOverflow: 'ellipsis' }}>{name}</span>
                    <span className="time">{c.lastMessageAt ? timeAgo(c.lastMessageAt) : ''}</span>
                  </div>
                  <div className={`chat-item-preview ${c.unread ? 'unread' : ''}`}>{preview}</div>
                </div>
                <div className="chat-item-meta">
                  {c.unread && <span className="unread-dot">•</span>}
                  <span className="platform-tag">{(c.customer?.platformKey || c.group?.platformKey || '').slice(0, 4)}</span>
                  {c.conversationType === 'CUSTOMER' && c.assignedEmployee && (
                    <span className="chat-item-sub">{c.assignedEmployee.name}</span>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </aside>

      <section className="chat-main">
        {!activeId || !conv ? (
          <div className="chat-empty">
            <EmptyState icon="messages-square" title="Select a conversation" sub="Pick a chat from the list to start messaging." />
          </div>
        ) : (
          <>
            <div className="chat-main-head">
              <button className="chat-back" type="button" onClick={closeConversation} aria-label="Back to conversations">
                <Icon name="chevron-left" size={17} />
              </button>
              <Avatar name={headName} color={conv.conversationType === 'GROUP' ? '#7C6CF6' : '#0EA5E9'} size="md" />
              <div style={{ minWidth: 0 }}>
                <div className="chat-main-title">
                  {headName}
                  <span className="platform-tag">{PLATFORM_LABELS[conv.customer?.platformKey || conv.group?.platformKey] || ''}</span>
                  {conv.status === 'RESOLVED' && <span className="badge badge-green">Resolved</span>}
                </div>
                <div className="chat-main-sub">{subLine}</div>
              </div>
              <div className="chat-main-actions">
                {canResolve && (
                  <button className="btn btn-sm btn-ghost" type="button" onClick={toggleResolve}>
                    {conv.status === 'RESOLVED' ? 'Reopen' : 'Resolve'}
                  </button>
                )}
              </div>
            </div>

            <div className="chat-messages" ref={scrollRef}>
              {hasMore && (
                <button className="btn btn-sm btn-ghost load-older" type="button" onClick={loadOlder}>Load older messages</button>
              )}
              {loadingMsgs && <div className="center-loader"><div className="spinner" /></div>}
              {!loadingMsgs && messages.length === 0 && (
                <EmptyState icon="messages-square" title="No messages yet" sub="Say hello to start the conversation." />
              )}
              {messages.map((m, i) => {
                const out = m.direction === 'OUTGOING';
                const prev = messages[i - 1];
                const showDay = !prev || dayLabel(prev.timestamp) !== dayLabel(m.timestamp);
                const isLastOut = lastOutgoing && lastOutgoing._id === m._id;
                return (
                  <div key={m._id}>
                    {showDay && <div className="day-sep"><span>{dayLabel(m.timestamp)}</span></div>}
                    <div className={`msg-row ${out ? 'out' : 'in'}`}>
                      <div className={`bubble ${out ? 'out' : 'in'}`}>
                        {out && String(m.senderId) !== String(user._id) && (
                          <div>
                            <span className={`sender-chip ${ROLE_CHIP[m.senderType] || 'chip-employee'}`}>
                              {m.senderType} · {senderName(m)}
                            </span>
                          </div>
                        )}
                        {m.media && m.media.type === 'image' && <img className="media-img" src={m.media.url} alt={m.media.name || 'attachment'} />}
                        {m.content}
                        <div className="msg-time">{clockTime(m.timestamp)}</div>
                        {isLastOut && readChips.length > 0 && (
                          <div className="read-chips">
                            {readChips.map((p) => {
                              const read = p.lastReadMessageId && lastOutgoing && p.lastReadMessageId === lastOutgoing._id;
                              return (
                                <span key={p.userId} className={`read-chip ${read ? 'read' : 'unread'}`}>
                                  <span className="dot" />{p.name}
                                </span>
                              );
                            })}
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
              {typingNames.length > 0 && (
                <div className="typing-row">
                  <span className="typing-dots"><i /><i /><i /></span>
                  {typingNames.join(', ')} {typingNames.length > 1 ? 'are' : 'is'} typing...
                </div>
              )}
            </div>

            <div className="chat-input-row">
              <input type="file" accept="image/*" ref={fileRef} style={{ display: 'none' }} onChange={onFile} />
              <button className="chat-attach" type="button" onClick={() => fileRef.current && fileRef.current.click()} title="Attach image" disabled={!canSend}>
                <Icon name="paperclip" size={16} />
              </button>
              <input
                className="chat-input"
                placeholder={canSend ? 'Type a message...' : 'You do not have permission to send messages here'}
                value={draft}
                onChange={(e) => onDraftChange(e.target.value)}
                onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); send(); } }}
                disabled={!canSend}
              />
              <button className="chat-send" type="button" onClick={() => send()} disabled={!canSend || sending || !draft.trim()}>
                <Icon name="send" size={16} />
              </button>
            </div>
          </>
        )}
      </section>
    </div>
  );



}
