import { useCallback, useEffect, useMemo, useState } from 'react';
import api from '../../services/api';
import { Avatar, EmptyState, PageHead, PageLoader, useToast } from '../../components/ui.jsx';
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

  const monthLabel = useMemo(() => {
    const [y, m] = month.split('-').map(Number);
    return `${MONTHS[m - 1]} ${y}`;
  }, [month]);

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
      cells.push({ day: d, status: selectedEntry.days[key] || null });
    }
    return cells;
  }, [selectedEntry, month]);

  return (
    <div className="page">
      <PageHead
        title="Attendance & Performance"
        sub="Monthly attendance history and performance for every member — all in one place."
      />

      {loading && <div className="card"><PageLoader text="Loading attendance..." /></div>}

      {!loading && att && perf && perf.items.length === 0 && (
        <EmptyState icon="calendar" title="No members found" sub="Attendance is tracked for team members only." />
      )}

      {!loading && att && perf && perf.items.length > 0 && (
        <>
          {/* Month switcher */}
          <div className="card">
            <div className="att-month-nav">
              <button className="icon-btn" type="button" onClick={() => shiftMonth(-1)} aria-label="Previous month">
                <Icon name="chevron-left" size={16} />
              </button>
              <span className="att-month-label">{monthLabel}</span>
              <button className="icon-btn" type="button" onClick={() => shiftMonth(1)} aria-label="Next month">
                <Icon name="chevron-right" size={16} />
              </button>
              <span className="badge badge-gray" style={{ marginLeft: 'auto' }}>
                {perf.items.length} member{perf.items.length === 1 ? '' : 's'}
              </span>
            </div>
          </div>

          {/* Monthly performance */}
          <div className="card">
            <h3 className="card-title">Monthly performance</h3>
            <div className="table-wrap">
              <table className="data">
                <thead>
                  <tr>
                    <th>Member</th>
                    <th>Attendance</th>
                    <th>Messages sent</th>
                    <th>Customers</th>
                    <th style={{ textAlign: 'right' }}>Score</th>
                  </tr>
                </thead>
                <tbody>
                  {perf.items.map((row) => (
                    <tr key={row.user._id}>
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
                      <td style={{ textAlign: 'right' }}>
                        <span className={`perf-score ${scoreBadge(row.score)}`}>{row.score}/100</span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Attendance history */}
          <div className="card">
            <div className="section-row">
              <h3 className="card-title" style={{ margin: 0 }}>Attendance history</h3>
              <select className="select" style={{ width: 260 }} value={selected} onChange={(e) => setSelected(e.target.value)}>
                {att.items.map((i) => (
                  <option key={i.user._id} value={i.user._id}>{i.user.name} — {i.user.role}</option>
                ))}
              </select>
            </div>

            {selectedEntry && (
              <>
                <div className="att-summary">
                  <span className="badge badge-green">Present: {selectedEntry.summary.PRESENT}</span>
                  <span className="badge badge-sky">Late: {selectedEntry.summary.LATE}</span>
                  <span className="badge badge-amber">Leave: {selectedEntry.summary.LEAVE}</span>
                  <span className="badge badge-red">Absent: {selectedEntry.summary.ABSENT}</span>
                  <span className="badge badge-indigo">Attendance: {selectedEntry.summary.percent}%</span>
                </div>

                <div className="att-grid" style={{ marginTop: 14 }}>
                  {WEEKDAYS.map((w) => (
                    <div key={w} style={{ textAlign: 'center', fontSize: 10.5, fontWeight: 700, color: 'var(--muted)' }}>{w}</div>
                  ))}
                  {(calendar || []).map((c, idx) =>
                    c === null ? (
                      <div key={`blank-${idx}`} />
                    ) : (
                      <div
                        key={c.day}
                        className={`att-cell ${c.status ? STATUS_META[c.status].cls : 'att-empty'}`}
                        title={`${c.day} ${monthLabel}${c.status ? ` — ${STATUS_META[c.status].label}` : ''}`}
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
                </div>
              </>
            )}
          </div>
        </>
      )}
    </div>
  );
}