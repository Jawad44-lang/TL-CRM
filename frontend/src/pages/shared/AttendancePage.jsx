import { useCallback, useEffect, useMemo, useState } from 'react';
import api from '../../services/api';
import { Avatar, EmptyState, PageHead, PageLoader, StatCard, useToast } from '../../components/ui.jsx';
import Icon from '../../components/icons.jsx';

const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
const WEEKDAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

const STATUS_META = {
  PRESENT: { short: 'P', cls: 'att-p', label: 'Present' },
  ABSENT: { short: 'A', cls: 'att-a', label: 'Absent' },
  LEAVE: { short: 'L', cls: 'att-l', label: 'Leave' },
  LATE: { short: 'Lt', cls: 'att-late', label: 'Late' },
};

const scoreBadge = (score) => (score >= 85 ? 'hi' : score >= 70 ? 'mid' : score >= 55 ? 'low' : 'vlow');

export default function AttendancePage() {
  const toast = useToast();
  const [month, setMonth] = useState(() => new Date().toISOString().slice(0, 7));
  const [att, setAtt] = useState(null);
  const [perf, setPerf] = useState(null);
  const [selected, setSelected] = useState('');
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [a, p] = await Promise.all([
        api.get(`/attendance?month=${month}`),
        api.get(`/performance?month=${month}`),
      ]);
      setAtt(a.data);
      setPerf(p.data);
    } catch (e) {
      toast(e.message, 'error');
    } finally {
      setLoading(false);
    }
  }, [month, toast]);

  useEffect(() => { load(); }, [load]);

  useEffect(() => {
    if (att?.items?.length && !att.items.some((i) => i.user._id === selected)) {
      setSelected(att.items[0].user._id);
    }
  }, [att, selected]);

  const shiftMonth = (delta) => {
    const [y, m] = month.split('-').map(Number);
    const d = new Date(y, m - 1 + delta, 1);
    setMonth(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`);
  };

  const now = new Date();
  const currentMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
  const todayKey = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;

  const monthLabel = useMemo(() => {
    const [y, m] = month.split('-').map(Number);
    return `${MONTHS[m - 1]} ${y}`;
  }, [month]);

  /* KPI snapshot — performance rows arrive sorted by score desc */
  const kpis = useMemo(() => {
    const rows = perf?.items || [];
    if (!rows.length) return null;
    const avgAtt = Math.round(rows.reduce((s, r) => s + (r.summary?.percent || 0), 0) / rows.length);
    const messages = rows.reduce((s, r) => s + (r.messagesSent || 0), 0);
    const customers = rows.reduce((s, r) => s + (r.customersAssigned || 0), 0);
    return { avgAtt, messages, customers, top: rows[0], count: rows.length };
  }, [perf]);

  const selectedEntry = att?.items?.find((i) => i.user._id === selected) || null;

  const calendar = useMemo(() => {
    if (!selectedEntry) return null;
    const [y, m] = month.split('-').map(Number);
    const total = new Date(y, m, 0).getDate();
    const offset = (new Date(y, m - 1, 1).getDay() + 6) % 7; // Mon-start
    const cells = [];
    for (let i = 0; i < offset; i++) cells.push(null);
    for (let d = 1; d <= total; d++) {
      const key = `${month}-${String(d).padStart(2, '0')}`;
      cells.push({ day: d, status: selectedEntry.days[key] || null, today: key === todayKey });
    }
    return cells;
  }, [selectedEntry, month, todayKey]);

  return (
    <div className="page">
      <PageHead
        title="Attendance & Performance"
        sub="Monthly attendance history and performance for every member — all in one place."
        actions={
          att && perf && perf.items.length > 0 && (
            <div className="att-toolbar">
              <button className="btn btn-sm btn-ghost" type="button" onClick={() => shiftMonth(-1)} aria-label="Previous month">
                <Icon name="chevron-left" size={14} />
              </button>
              <span className="att-month-label" style={{ minWidth: 128 }}>{monthLabel}</span>
              <button className="btn btn-sm btn-ghost" type="button" onClick={() => shiftMonth(1)} aria-label="Next month">
                <Icon name="chevron-right" size={14} />
              </button>
              {month !== currentMonth && (
                <button className="btn btn-sm btn-ghost att-today-btn" type="button" onClick={() => setMonth(currentMonth)}>
                  Today
                </button>
              )}
            </div>
          )
        }
      />

      {loading && <div className="card"><PageLoader text="Loading attendance..." /></div>}

      {!loading && att && perf && perf.items.length === 0 && (
        <EmptyState icon="calendar" title="No members found" sub="Attendance is tracked for team members only." />
      )}

      {!loading && att && perf && perf.items.length > 0 && (
        <>
          {/* KPI snapshot */}
          {kpis && (
            <div className="stat-grid" style={{ marginBottom: 16 }}>
              <StatCard
                label="Team attendance"
                value={`${kpis.avgAtt}%`}
                tone="ok"
                icon={<Icon name="calendar" size={16} weight="bold" />}
                foot={`${kpis.count} member${kpis.count === 1 ? '' : 's'} tracked`}
              />
              <StatCard
                label="Messages this month"
                value={kpis.messages}
                tone="accent"
                icon={<Icon name="messages-square" size={16} weight="bold" />}
                foot="sent by your team"
              />
              <StatCard
                label="Customers handled"
                value={kpis.customers}
                tone="info"
                icon={<Icon name="user-round" size={16} weight="bold" />}
                foot="currently assigned"
              />
              <StatCard
                label="Top performer"
                value={`${kpis.top.score}/100`}
                tone="warn"
                icon={<Icon name="zap" size={16} weight="bold" />}
                foot={`${kpis.top.user.name} leads the board`}
              />
            </div>
          )}

          {/* Performance leaderboard */}
          <div className="card">
            <div className="section-row">
              <h3 className="card-title" style={{ margin: 0 }}>
                Performance leaderboard <span className="badge badge-gray">{monthLabel}</span>
              </h3>
            </div>
            <div className="table-wrap">
              <table className="data">
                <thead>
                  <tr>
                    <th style={{ width: 44 }}>#</th>
                    <th>Member</th>
                    <th>Attendance</th>
                    <th>Messages sent</th>
                    <th>Customers</th>
                    <th style={{ textAlign: 'right' }}>Score</th>
                  </tr>
                </thead>
                <tbody>
                  {perf.items.map((row, idx) => (
                    <tr key={row.user._id}>
                      <td>
                        <span className={`att-rank${idx < 3 ? ` r${idx + 1}` : ''}`}>{idx + 1}</span>
                      </td>
                      <td>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 9 }}>
                          <Avatar name={row.user.name} color={row.user.avatarColor} size="sm" />
                          <div>
                            <div className="cell-strong">{row.user.name}</div>
                            <div style={{ fontSize: 11, color: 'var(--muted)' }}>{row.user.role}</div>
                          </div>
                        </div>
                      </td>
                      <td>
                        <span className={`badge ${row.summary.percent >= 85 ? 'badge-green' : row.summary.percent >= 70 ? 'badge-indigo' : 'badge-amber'}`}>
                          {row.summary.percent}%
                        </span>
                      </td>
                      <td>{row.messagesSent}</td>
                      <td>{row.customersAssigned}</td>
                      <td>
                        <div className="score-cell">
                          <div className="score-track" title={`Score ${row.score}/100`}>
                            <div className={`score-fill ${scoreBadge(row.score)}`} style={{ width: `${Math.max(4, Math.min(100, row.score))}%` }} />
                          </div>
                          <span className={`perf-score ${scoreBadge(row.score)}`}>{row.score}</span>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Attendance calendar */}
          <div className="card">
            <div className="section-row">
              <h3 className="card-title" style={{ margin: 0 }}>Attendance calendar</h3>
              <select className="select" style={{ width: 260 }} value={selected} onChange={(e) => setSelected(e.target.value)}>
                {att.items.map((i) => (
                  <option key={i.user._id} value={i.user._id}>{i.user.name} — {i.user.role}</option>
                ))}
              </select>
            </div>

            {selectedEntry && (
              <>
                <div className="att-member-row">
                  <Avatar name={selectedEntry.user.name} color={selectedEntry.user.avatarColor} size="md" />
                  <div className="att-member-meta">
                    <div className="cell-strong">{selectedEntry.user.name}</div>
                    <div className="muted small">Daily status — {monthLabel}</div>
                  </div>
                  <div className="att-summary" style={{ marginLeft: 'auto', marginTop: 0 }}>
                    <span className="badge badge-green">Present: {selectedEntry.summary.PRESENT}</span>
                    <span className="badge badge-sky">Late: {selectedEntry.summary.LATE}</span>
                    <span className="badge badge-amber">Leave: {selectedEntry.summary.LEAVE}</span>
                    <span className="badge badge-red">Absent: {selectedEntry.summary.ABSENT}</span>
                    <span className="badge badge-indigo">Attendance: {selectedEntry.summary.percent}%</span>
                  </div>
                </div>

                <div className="att-grid">
                  {WEEKDAYS.map((w) => (
                    <div key={w} style={{ textAlign: 'center', fontSize: 10.5, fontWeight: 700, color: 'var(--muted)' }}>{w}</div>
                  ))}
                  {(calendar || []).map((c, idx) =>
                    c === null ? (
                      <div key={`blank-${idx}`} />
                    ) : (
                      <div
                        key={c.day}
                        className={`att-cell ${c.status ? STATUS_META[c.status].cls : 'att-empty'}${c.today ? ' today' : ''}`}
                        title={`${c.day} ${monthLabel}${c.status ? ` — ${STATUS_META[c.status].label}` : ' — no record'}`}
                      >
                        {c.day}
                      </div>
                    )
                  )}
                </div>

                <div className="att-legend">
                  {Object.entries(STATUS_META).map(([k, m]) => (
                    <span key={k}><i className={m.cls} /> {m.label}</span>
                  ))}
                  <span><i className="att-empty" style={{ background: 'var(--surface-2)' }} /> No record</span>
                  <span><i style={{ background: 'transparent', boxShadow: 'inset 0 0 0 2px var(--brand)' }} /> Today</span>
                </div>
              </>
            )}
          </div>
        </>
      )}
    </div>
  );
}