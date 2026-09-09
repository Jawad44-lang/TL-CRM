import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import Icon from './icons.jsx';
import { useAuth } from '../context/AuthContext.jsx';
import api from '../services/api.js';
import { useToast } from './ui.jsx';
import SimulatorModal from './SimulatorModal.jsx';

export default function WorkforceDashboard({ role = 'ADMIN' }) {
  const { user } = useAuth();
  const navigate = useNavigate();
  const toast = useToast();

  // Top navigation tabs (the global RefTopbar now lives in AppLayout)
  const [scheduleFilter, setScheduleFilter] = useState('Today');
  const [scheduleDropdownOpen, setScheduleDropdownOpen] = useState(false);
  const [filterActive, setFilterActive] = useState(false);
  const [employeeSearch, setEmployeeSearch] = useState('');

  // Live date for the navbar pill — always today's correct date (auto-refreshes, even past midnight)
  const [today, setToday] = useState(() => new Date());
  useEffect(() => {
    const t = setInterval(() => setToday(new Date()), 30 * 1000);
    return () => clearInterval(t);
  }, []);
  const dateLabel = `${String(today.getDate()).padStart(2, '0')} ${today.toLocaleString('en-US', { month: 'short' })}, ${today.getFullYear()}`;

  // Modals
  const [simOpen, setSimOpen] = useState(false);
  const [addEmployeeOpen, setAddEmployeeOpen] = useState(false);
  const [selectedEvent, setSelectedEvent] = useState(null);

  // New Employee Form State
  const [newEmpName, setNewEmpName] = useState('');
  const [newEmpEmail, setNewEmpEmail] = useState('');
  const [newEmpRole, setNewEmpRole] = useState('EMPLOYEE');
  const [newEmpJobTitle, setNewEmpJobTitle] = useState('UX/UI Designer');
  const [creatingEmp, setCreatingEmp] = useState(false);

  // Backend Stats & Employees
  const [backendStats, setBackendStats] = useState(null);
  const [liveEmployees, setLiveEmployees] = useState([]);
  const [loading, setLoading] = useState(true);

  // Reference Mock Data strictly matching the reference image
  const defaultEmployees = useMemo(() => [
    {
      id: 'emp-1',
      name: 'James Anderson',
      role: 'UX/UI Designer',
      email: 'james765@qmail.com',
      joinDate: 'Ari 16, 2025',
      status: 'Active',
      avatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=100&h=100&fit=crop&crop=faces',
    },
    {
      id: 'emp-2',
      name: 'Alex Mika',
      role: 'UX/UI Designer',
      email: 'alex555@qmail.com',
      joinDate: 'Ari 17, 2025',
      status: 'Inactive',
      avatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=100&h=100&fit=crop&crop=faces',
    },
    {
      id: 'emp-3',
      name: 'Allison Baker',
      role: 'UX/UI Designer',
      email: 'alison345@qmail.com',
      joinDate: 'Ari 18, 2025',
      status: 'Active',
      avatar: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=100&h=100&fit=crop&crop=faces',
    },
  ], []);

  // Scheduling timeline data matching reference image
  const scheduleMembers = useMemo(() => [
    {
      name: 'James Anderson',
      title: 'UX/UI Designer',
      avatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=80&h=80&fit=crop&crop=faces',
      event: null,
    },
    {
      name: 'Alex Mika',
      title: 'Marketer',
      avatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=80&h=80&fit=crop&crop=faces',
      event: {
        type: 'meeting',
        title: 'Meeting',
        status: 'Approved',
        startCol: 3, // Wed
        spanCols: 3, // Wed, Thu, Fri
        colorClass: 'event-pill-purple',
        details: 'Q2 Strategy & Marketing Sync with Leadership',
      },
    },
    {
      name: 'Allison Baker',
      title: 'Co-Founder',
      avatar: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=80&h=80&fit=crop&crop=faces',
      event: {
        type: 'sick-leave',
        title: 'Sick Leave',
        status: 'Pending',
        startCol: 8, // Mon
        spanCols: 3, // Mon, Tue, Wed
        colorClass: 'event-pill-coral',
        details: 'Medical leave request pending HR approval',
      },
    },
    {
      name: 'Rafio Jolis',
      title: 'CEO',
      avatar: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=80&h=80&fit=crop&crop=faces',
      event: {
        type: 'paid-leave',
        title: 'Paid Leave',
        status: 'Approved',
        startCol: 2, // Tue
        spanCols: 3, // Tue, Wed, Thu
        colorClass: 'event-pill-green',
        details: 'Annual executive retreat & paid leave',
      },
    },
  ], []);

  // Day columns matching the reference image: Mon, Tue, Wed, Thu, Fri, Sat, Sun, Mon, Tue, Wed, Thu
  const dayCols = useMemo(() => [
    'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun', 'Mon', 'Tue', 'Wed', 'Thu'
  ], []);

  // Load backend stats & employees to blend real CRM data
  useEffect(() => {
    let mounted = true;
    async function fetchDashboard() {
      try {
        const [dashRes, usersRes] = await Promise.all([
          api.get('/dashboard').catch(() => null),
          api.get('/users?role=EMPLOYEE').catch(() => null),
        ]);
        if (mounted) {
          if (dashRes?.data) setBackendStats(dashRes.data.stats || {});
          if (usersRes?.data?.items?.length) {
            setLiveEmployees(usersRes.data.items);
          }
        }
      } catch (err) {
        console.error(err);
      } finally {
        if (mounted) setLoading(false);
      }
    }
    fetchDashboard();
    return () => { mounted = false; };
  }, []);

  /* Fully dynamic KPI values derived from live backend stats — no static data */
  const kpi = useMemo(() => {
    const s = backendStats || {};
    const num = (v) => (typeof v === 'number' ? v : null);
    const pct = (cur, prev) => {
      if (num(cur) == null || num(prev) == null) return null;
      if (prev === 0) return cur > 0 ? 100 : 0;
      return Math.round(((cur - prev) / prev) * 1000) / 10;
    };
    const isAdminScope = s.totalEmployees != null || s.totalManagers != null;
    const employees = isAdminScope ? (s.totalEmployees || 0) + (s.totalManagers || 0) : num(s.employees);
    const customers = num(s.totalCustomers) ?? num(s.visibleCustomers);
    const unassigned = num(s.unassignedCustomers);
    const assignmentRate =
      customers != null && unassigned != null && customers > 0
        ? Math.round(((customers - unassigned) / customers) * 100)
        : null;
    return {
      employees,
      employeesTrend: pct(s.newUsersThisMonth, s.newUsersLastMonth),
      activeChats: num(s.activeConversations),
      chatsTrend: pct(s.newConversationsThisMonth, s.newConversationsLastMonth),
      assignmentRate,
      customers,
      customersTrend: pct(s.newCustomersThisMonth, s.newCustomersLastMonth),
    };
  }, [backendStats]);

  // Merge default reference employees with live CRM employees for rich display
  const allEmployees = useMemo(() => {
    const list = [...defaultEmployees];
    if (liveEmployees.length > 0) {
      liveEmployees.forEach((emp) => {
        if (!list.some(e => e.email === emp.email)) {
          list.push({
            id: emp._id,
            name: emp.name,
            role: emp.role === 'ADMIN' ? 'Administrator' : emp.role === 'MANAGER' ? 'Team Lead' : 'Support Specialist',
            email: emp.email,
            joinDate: new Date(emp.createdAt || Date.now()).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }),
            status: emp.status === 'ACTIVE' ? 'Active' : 'Inactive',
            avatar: emp.avatarColor ? null : 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=100&h=100&fit=crop',
            avatarColor: emp.avatarColor,
          });
        }
      });
    }
    if (!employeeSearch.trim()) return list;
    const q = employeeSearch.toLowerCase();
    return list.filter(e => e.name.toLowerCase().includes(q) || e.email.toLowerCase().includes(q) || e.role.toLowerCase().includes(q));
  }, [defaultEmployees, liveEmployees, employeeSearch]);

  // Handle Add Employee
  const handleCreateEmployee = async (e) => {
    e.preventDefault();
    if (!newEmpName.trim() || !newEmpEmail.trim()) {
      toast('Please enter both name and email.', 'error');
      return;
    }
    setCreatingEmp(true);
    try {
      const res = await api.post('/users', {
        name: newEmpName.trim(),
        email: newEmpEmail.trim(),
        role: newEmpRole,
      });
      toast(`Employee ${res.data.user.name} created successfully!`, 'success');
      setAddEmployeeOpen(false);
      setNewEmpName('');
      setNewEmpEmail('');
      // Refresh employees list
      const uRes = await api.get('/users?role=EMPLOYEE');
      if (uRes.data?.items) setLiveEmployees(uRes.data.items);
    } catch (err) {
      toast(err.message || 'Failed to create employee', 'error');
    } finally {
      setCreatingEmp(false);
    }
  };

  const userName = user?.name ? user.name.split(' ')[0] : 'John';

  return (
    <div className="workforce-dashboard-root">
      {/* Main Greeting & Action Row */}
      <section className="ref-greeting-row">
        <div className="ref-greeting-left">
          <h1 className="ref-greeting-title">Welcome Back, {userName}</h1>
          <p className="ref-greeting-sub">Here's a clear overview of your workforce performance and structure</p>
        </div>

        <div className="ref-greeting-actions">
          {/* + Add Employee (Dark Pill) */}
          <button
            className="ref-dark-pill-btn"
            type="button"
            onClick={() => setAddEmployeeOpen(true)}
          >
            <Icon name="plus" size={15} weight="bold" />
            <span>Add Employee</span>
          </button>

          {/* Date Pill — always shows today's date */}
          <div className="ref-outline-pill-btn as-static" title="Today">
            <Icon name="calendar" size={16} />
            <span>{dateLabel}</span>
          </div>

          {/* Filter Pill */}
          <button
            className={`ref-outline-pill-btn ${filterActive ? 'active' : ''}`}
            type="button"
            onClick={() => {
              setFilterActive(!filterActive);
              toast(filterActive ? 'Filters cleared' : 'Showing active workforce filter', 'info');
            }}
          >
            <Icon name="filter" size={15} />
            <span>Filter</span>
          </button>

          {/* Quick Simulator trigger */}
          <button
            className="ref-icon-circle-btn zap-btn"
            type="button"
            title="Simulate incoming CRM message"
            onClick={() => setSimOpen(true)}
          >
            <Icon name="zap" size={16} />
          </button>
        </div>
      </section>

      {/* 4 Stat / KPI Cards Grid */}
      <section className="ref-kpi-grid">
        {/* Card 1: Total Employees (live workforce = managers + employees) */}
        <div className="ref-kpi-card">
          <div className="ref-kpi-head">
            <div className="ref-kpi-icon-circle icon-purple">
              <Icon name="users" size={18} weight="bold" />
            </div>
            <span className="ref-kpi-label">Total Employees</span>
          </div>
          <div className="ref-kpi-body">
            <span className="ref-kpi-value">
              {kpi.employees != null ? kpi.employees.toLocaleString() : '—'}
            </span>
            {kpi.employeesTrend != null && (
              <span className={`ref-kpi-trend-pill ${kpi.employeesTrend < 0 ? 'trend-red' : 'trend-green'}`}>
                {kpi.employeesTrend >= 0 ? '+' : ''}
                {kpi.employeesTrend}%
              </span>
            )}
          </div>
          <div className="ref-kpi-foot">from last month</div>
        </div>

        {/* Card 2: Active Chats (live conversations) */}
        <div className="ref-kpi-card">
          <div className="ref-kpi-head">
            <div className="ref-kpi-icon-circle icon-green">
              <Icon name="messages-square" size={18} weight="bold" />
            </div>
            <span className="ref-kpi-label">Active Chats</span>
          </div>
          <div className="ref-kpi-body">
            <span className="ref-kpi-value">
              {kpi.activeChats != null ? kpi.activeChats.toLocaleString() : '—'}
            </span>
            {kpi.chatsTrend != null && (
              <span className={`ref-kpi-trend-pill ${kpi.chatsTrend < 0 ? 'trend-red' : 'trend-green'}`}>
                {kpi.chatsTrend >= 0 ? '+' : ''}
                {kpi.chatsTrend}%
              </span>
            )}
          </div>
          <div className="ref-kpi-foot">Live conversations</div>
        </div>

        {/* Card 3: Assignment Rate (% of customers assigned to an employee) */}
        <div className="ref-kpi-card">
          <div className="ref-kpi-head">
            <div className="ref-kpi-icon-circle icon-coral">
              <Icon name="check" size={18} weight="bold" />
            </div>
            <span className="ref-kpi-label">Assignment Rate</span>
          </div>
          <div className="ref-kpi-body">
            <span className="ref-kpi-value">
              {kpi.assignmentRate != null ? `${kpi.assignmentRate}%` : '—'}
            </span>
          </div>
          <div className="ref-kpi-foot">Customers assigned</div>
        </div>

        {/* Card 4: Sales Leads (live customers) */}
        <div className="ref-kpi-card">
          <div className="ref-kpi-head">
            <div className="ref-kpi-icon-circle icon-orange">
              <span className="lead-at-symbol">@</span>
            </div>
            <span className="ref-kpi-label">Sales Leads</span>
          </div>
          <div className="ref-kpi-body">
            <span className="ref-kpi-value">
              {kpi.customers != null ? kpi.customers.toLocaleString() : '—'}
            </span>
            {kpi.customersTrend != null && (
              <span className={`ref-kpi-trend-pill ${kpi.customersTrend < 0 ? 'trend-red' : 'trend-green'}`}>
                {kpi.customersTrend >= 0 ? '+' : ''}
                {kpi.customersTrend}%
              </span>
            )}
          </div>
          <div className="ref-kpi-foot">Total customers</div>
        </div>
      </section>

      {/* Middle Section (2 Columns: Meeting Scheduling [Left 2fr] + Feature Events [Right 1fr]) */}
      <section className="ref-mid-grid">
        {/* Left Card: Meeting Scheduling */}
        <div className="ref-card ref-scheduling-card">
          <div className="ref-card-header">
            <h2 className="ref-card-title">Meeting Scheduling</h2>
            <div className="ref-dropdown-wrap">
              <button
                className="ref-pill-dropdown-btn"
                type="button"
                onClick={() => setScheduleDropdownOpen(!scheduleDropdownOpen)}
              >
                <span>{scheduleFilter}</span>
                <Icon name="chevron-down" size={14} />
              </button>
              {scheduleDropdownOpen && (
                <div className="ref-dropdown-menu">
                  {['Today', 'This Week', 'This Month'].map((option) => (
                    <button
                      key={option}
                      type="button"
                      className={`ref-dropdown-item ${scheduleFilter === option ? 'selected' : ''}`}
                      onClick={() => {
                        setScheduleFilter(option);
                        setScheduleDropdownOpen(false);
                      }}
                    >
                      {option}
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Calendar Table Grid */}
          <div className="ref-schedule-container">
            <div className="ref-schedule-table">
              {/* Header Row: Employees column + Mon to Thu columns */}
              <div className="ref-sched-head-row">
                <div className="ref-sched-col-emp">Employees</div>
                <div className="ref-sched-days-grid">
                  {dayCols.map((day, idx) => (
                    <div key={idx} className="ref-sched-day-header">
                      {day}
                    </div>
                  ))}
                </div>
              </div>

              {/* Rows for each employee */}
              <div className="ref-sched-body">
                {scheduleMembers.map((member, rIdx) => (
                  <div className="ref-sched-member-row" key={rIdx}>
                    {/* Employee Profile Cell */}
                    <div className="ref-sched-emp-cell">
                      <img src={member.avatar} alt={member.name} className="ref-sched-avatar" />
                      <div className="ref-sched-emp-info">
                        <div className="ref-sched-emp-name">{member.name}</div>
                        <div className="ref-sched-emp-title">{member.title}</div>
                      </div>
                    </div>

                    {/* Timeline Day Grid with subtle cell backgrounds */}
                    <div className="ref-sched-timeline-track">
                      {/* 11 subtle grid cell slots */}
                      {dayCols.map((_, cIdx) => (
                        <div key={cIdx} className="ref-sched-cell-slot" />
                      ))}

                      {/* Event Pill spanning across columns */}
                      {member.event && (
                        <div
                          className={`ref-sched-event-pill ${member.event.colorClass}`}
                          style={{
                            left: `${(member.event.startCol / 11) * 100}%`,
                            width: `${(member.event.spanCols / 11) * 100}%`,
                          }}
                          onClick={() => setSelectedEvent(member.event)}
                          title={`${member.event.title} (${member.event.status}) — click to view`}
                        >
                          <span className="event-pill-icon-dot" />
                          <span className="event-pill-title">{member.event.title}</span>
                          <span className="event-pill-status-chip">{member.event.status}</span>
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Right Card: Feature Events */}
        <div className="ref-card ref-events-card">
          <div className="ref-card-header">
            <h2 className="ref-card-title">Feature Events</h2>
            <button
              className="ref-card-arrow-btn"
              type="button"
              title="Open all events"
              onClick={() => navigate(`/${role.toLowerCase()}/chats`)}
            >
              <Icon name="arrow-up-right" size={17} />
            </button>
          </div>

          <div className="ref-events-list">
            {/* Event 1: Monthly Performance Review (Soft Purple Tint) */}
            <div className="ref-event-item event-bg-purple">
              <h3 className="ref-event-title">Monthly Performance Review</h3>
              <p className="ref-event-desc">Evaluate employee performance, KPIs, and progress across departments.</p>
              <div className="ref-event-footer">
                <span className="ref-event-chip">
                  <Icon name="clock" size={13} />
                  <span>11:00 - 12:00</span>
                </span>
                <span className="ref-event-chip">
                  <Icon name="calendar" size={13} />
                  <span>Ari 16, 2025</span>
                </span>
              </div>
            </div>

            {/* Event 2: Team Attendance Audit (Soft Mint Green Tint) */}
            <div className="ref-event-item event-bg-green">
              <h3 className="ref-event-title">Team Attendance Audit</h3>
              <p className="ref-event-desc">Review attendance records, late check-ins, and leave summaries.</p>
              <div className="ref-event-footer">
                <span className="ref-event-chip">
                  <Icon name="clock" size={13} />
                  <span>12:00 - 01:00</span>
                </span>
                <span className="ref-event-chip">
                  <Icon name="calendar" size={13} />
                  <span>Ari 17, 2025</span>
                </span>
              </div>
            </div>

            {/* Event 3: Payroll Processing Cycle (Soft Peach/Blush Tint) */}
            <div className="ref-event-item event-bg-peach">
              <h3 className="ref-event-title">Payroll Processing Cycle</h3>
              <p className="ref-event-desc">Finalize salaries, bonuses, and deductions for all employees.</p>
              <div className="ref-event-footer">
                <span className="ref-event-chip">
                  <Icon name="clock" size={13} />
                  <span>01:00 - 02:00</span>
                </span>
                <span className="ref-event-chip">
                  <Icon name="calendar" size={13} />
                  <span>Ari 18, 2025</span>
                </span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Bottom Section: Employee List Table */}
      <section className="ref-card ref-employee-list-card">
        <div className="ref-card-header">
          <div className="ref-emp-header-left">
            <h2 className="ref-card-title">Employee List</h2>
            <span className="ref-emp-counter">({allEmployees.length})</span>
          </div>
          <div className="ref-emp-header-right">
            <div className="ref-emp-search-wrap">
              <Icon name="search" size={15} className="ref-emp-search-icon" />
              <input
                type="text"
                className="ref-emp-search-input"
                placeholder="Search employees..."
                value={employeeSearch}
                onChange={(e) => setEmployeeSearch(e.target.value)}
              />
              {employeeSearch && (
                <button
                  type="button"
                  className="ref-clear-search"
                  onClick={() => setEmployeeSearch('')}
                >
                  <Icon name="x" size={13} />
                </button>
              )}
            </div>
          </div>
        </div>

        {/* Clean Data Table strictly matching reference image */}
        <div className="ref-table-wrap">
          <table className="ref-employee-table">
            <thead>
              <tr>
                <th>Name</th>
                <th>Role</th>
                <th>Email</th>
                <th>Join Date</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {allEmployees.map((emp) => (
                <tr key={emp.id} className="ref-emp-tr">
                  <td className="ref-emp-name-td">
                    <div className="ref-emp-user-wrap">
                      {emp.avatar ? (
                        <img src={emp.avatar} alt={emp.name} className="ref-emp-table-avatar" />
                      ) : (
                        <div
                          className="ref-emp-table-avatar-placeholder"
                          style={{ background: emp.avatarColor || '#6366f1' }}
                        >
                          {emp.name.slice(0, 2).toUpperCase()}
                        </div>
                      )}
                      <span className="ref-emp-table-name">{emp.name}</span>
                    </div>
                  </td>
                  <td className="ref-emp-role-td">{emp.role}</td>
                  <td className="ref-emp-email-td">{emp.email}</td>
                  <td className="ref-emp-date-td">{emp.joinDate}</td>
                  <td className="ref-emp-status-td">
                    <span
                      className={`ref-status-badge ${
                        emp.status === 'Active' ? 'status-active' : 'status-inactive'
                      }`}
                    >
                      {emp.status}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      {/* Simulator Modal */}
      {simOpen && <SimulatorModal onClose={() => setSimOpen(false)} />}

      {/* Add Employee Modal */}
      {addEmployeeOpen && (
        <div className="modal-overlay" onClick={() => setAddEmployeeOpen(false)}>
          <div className="modal ref-modal-card" onClick={(e) => e.stopPropagation()}>
            <div className="modal-head">
              <h3 className="modal-title">+ Add New Employee</h3>
              <button className="modal-close" onClick={() => setAddEmployeeOpen(false)} type="button">
                <Icon name="x" size={16} />
              </button>
            </div>
            <form onSubmit={handleCreateEmployee}>
              <div className="modal-body">
                <div className="field">
                  <label className="label">Full Name</label>
                  <input
                    className="input"
                    placeholder="e.g. Sarah Jenkins"
                    value={newEmpName}
                    onChange={(e) => setNewEmpName(e.target.value)}
                    required
                  />
                </div>
                <div className="field">
                  <label className="label">Email Address</label>
                  <input
                    className="input"
                    type="email"
                    placeholder="e.g. sarah@company.com"
                    value={newEmpEmail}
                    onChange={(e) => setNewEmpEmail(e.target.value)}
                    required
                  />
                </div>
                <div className="field">
                  <label className="label">Job Title / Role</label>
                  <input
                    className="input"
                    placeholder="e.g. UX/UI Designer"
                    value={newEmpJobTitle}
                    onChange={(e) => setNewEmpJobTitle(e.target.value)}
                  />
                </div>
                <div className="field">
                  <label className="label">System Role</label>
                  <select
                    className="select"
                    value={newEmpRole}
                    onChange={(e) => setNewEmpRole(e.target.value)}
                  >
                    <option value="EMPLOYEE">Employee (Assigned chats)</option>
                    <option value="MANAGER">Manager (Team lead)</option>
                  </select>
                </div>
              </div>
              <div className="modal-actions">
                <button
                  className="btn btn-ghost"
                  type="button"
                  onClick={() => setAddEmployeeOpen(false)}
                >
                  Cancel
                </button>
                <button className="btn ref-dark-pill-btn" type="submit" disabled={creatingEmp}>
                  {creatingEmp ? 'Creating…' : 'Add Employee'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Event Details Modal */}
      {selectedEvent && (
        <div className="modal-overlay" onClick={() => setSelectedEvent(null)}>
          <div className="modal ref-modal-card" onClick={(e) => e.stopPropagation()}>
            <div className="modal-head">
              <h3 className="modal-title">{selectedEvent.title}</h3>
              <button className="modal-close" onClick={() => setSelectedEvent(null)} type="button">
                <Icon name="x" size={16} />
              </button>
            </div>
            <div className="modal-body">
              <div className="ref-event-detail-badge-row">
                <span className={`ref-status-badge ${selectedEvent.colorClass}`}>
                  {selectedEvent.status}
                </span>
                <span className="muted small">Event ID: {selectedEvent.type}</span>
              </div>
              <p style={{ marginTop: '14px', fontSize: '14px', color: 'var(--ink)' }}>
                {selectedEvent.details}
              </p>
              <div className="ref-event-footer" style={{ marginTop: '16px' }}>
                <span className="ref-event-chip">
                  <Icon name="calendar" size={14} />
                  <span>Mon – Thu Schedule Window</span>
                </span>
              </div>
            </div>
            <div className="modal-actions">
              <button className="btn btn-ghost" type="button" onClick={() => setSelectedEvent(null)}>
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
