// frontend/src/components/AdminDashboard.jsx
import { useState, useEffect } from 'react';
import {
  users as apiUsers,
  blocks as apiBlocks,
  venues as apiVenues,
  amenities as apiAmenities,
  timetable as apiTimetable,
  admin as apiAdmin,
} from '../api';
import { useAuth } from '../context/AuthContext';
import { Link } from 'react-router-dom';

export default function AdminDashboard() {
  const { isAdmin } = useAuth();
  const [activeTab, setActiveTab] = useState('blockheads'); // 'blockheads' | 'timetable' | 'security' | 'twin' | 'whatif'

  // Common campus state
  const [blocksList, setBlocksList] = useState([]);
  const [venuesList, setVenuesList] = useState([]);
  const [amenitiesList, setAmenitiesList] = useState([]);

  // Tab 1: Block Heads
  const [usersList, setUsersList] = useState([]);
  const [bhLoading, setBhLoading] = useState(false);
  const [bhTargetBlock, setBhTargetBlock] = useState({});

  // Tab 2: Timetable
  const [ttList, setTtList] = useState([]);
  const [ttLoading, setTtLoading] = useState(false);
  const [ttVenueId, setTtVenueId] = useState('');
  const [ttDow, setTtDow] = useState(1);
  const [ttStart, setTtStart] = useState('09:00');
  const [ttEnd, setTtEnd] = useState('10:00');
  const [ttLabel, setTtLabel] = useState('');
  const [bulkJson, setBulkJson] = useState('');
  const [bulkError, setBulkError] = useState('');
  const [bulkSuccess, setBulkSuccess] = useState('');

  // Tab 3: Security XAI
  const [secFlags, setSecFlags] = useState([]);
  const [secLoading, setSecLoading] = useState(false);
  const [scanning, setScanning] = useState(false);
  const [scanMessage, setScanMessage] = useState('');

  // Tab 4: Digital Twin
  const [twinRows, setTwinRows] = useState([]);
  const [twinLoading, setTwinLoading] = useState(false);

  // Tab 5: What-If
  const [simType, setSimType] = useState('venue'); // 'venue' | 'block' | 'amenity'
  const [simVenueId, setSimVenueId] = useState('');
  const [simBlockId, setSimBlockId] = useState('');
  const [simAmenityId, setSimAmenityId] = useState('');
  const [simDate, setSimDate] = useState(new Date().toISOString().slice(0, 10));
  const [simResult, setSimResult] = useState(null);
  const [simLoading, setSimLoading] = useState(false);

  // Load baseline campus meta
  useEffect(() => {
    async function loadMeta() {
      try {
        const [blks, vens, amens] = await Promise.all([
          apiBlocks.list().catch(() => []),
          apiVenues.list().catch(() => []),
          apiAmenities.list().catch(() => []),
        ]);
        setBlocksList(blks || []);
        setVenuesList(vens || []);
        setAmenitiesList(amens || []);
        if (vens && vens.length > 0) setSimVenueId(vens[0].id);
        if (blks && blks.length > 0) setSimBlockId(blks[0].id);
        if (amens && amens.length > 0) setSimAmenityId(amens[0].id);
      } catch (err) {
        console.error('Failed to load admin meta:', err);
      }
    }
    loadMeta();
  }, []);

  // Tab 1: Load users
  async function loadUsers() {
    setBhLoading(true);
    try {
      const data = await apiUsers.list();
      setUsersList(data || []);
      const map = {};
      data.forEach((u) => {
        if (u.block_id) map[u.id] = u.block_id;
      });
      setBhTargetBlock(map);
    } catch (err) {
      console.error(err);
    } finally {
      setBhLoading(false);
    }
  }

  // Tab 2: Load Timetable
  async function loadTimetable() {
    setTtLoading(true);
    try {
      const data = await apiTimetable.list();
      setTtList(data || []);
    } catch (err) {
      console.error(err);
    } finally {
      setTtLoading(false);
    }
  }

  // Tab 3: Load Security
  async function loadSecurity() {
    setSecLoading(true);
    try {
      const data = await apiAdmin.securityFlags({ status: 'open' });
      setSecFlags(Array.isArray(data) ? data : data?.flags || []);
    } catch (err) {
      console.error(err);
    } finally {
      setSecLoading(false);
    }
  }

  // Tab 4: Load Twin
  async function loadTwin() {
    setTwinLoading(true);
    try {
      const data = await apiAdmin.twin();
      setTwinRows(data || []);
    } catch (err) {
      console.error(err);
    } finally {
      setTwinLoading(false);
    }
  }

  useEffect(() => {
    if (activeTab === 'blockheads') loadUsers();
    if (activeTab === 'timetable') loadTimetable();
    if (activeTab === 'security') loadSecurity();
    if (activeTab === 'twin') loadTwin();
  }, [activeTab]);

  // Handlers for Block Head assignment
  async function handleToggleBlockHead(u, makeHead) {
    try {
      const blkId = bhTargetBlock[u.id] || (blocksList[0] ? blocksList[0].id : null);
      if (makeHead && !blkId) {
        alert('Please select a campus block for this block head.');
        return;
      }
      await apiUsers.setBlockHead(u.id, {
        is_block_head: makeHead,
        block_id: makeHead ? blkId : null,
      });
      loadUsers();
    } catch (err) {
      alert(`Assignment failed: ${err.message}`);
    }
  }

  // Handlers for Timetable
  async function handleAddSlot(e) {
    e.preventDefault();
    if (!ttVenueId) return;
    try {
      await apiTimetable.create({
        venue_id: ttVenueId,
        day_of_week: Number(ttDow),
        start_time: ttStart,
        end_time: ttEnd,
        label: ttLabel.trim() || undefined,
      });
      setTtLabel('');
      loadTimetable();
    } catch (err) {
      alert(`Could not add slot: ${err.message}`);
    }
  }

  async function handleBulkUpload() {
    setBulkError('');
    setBulkSuccess('');
    try {
      const parsed = JSON.parse(bulkJson);
      const rows = Array.isArray(parsed) ? parsed : parsed.rows;
      if (!Array.isArray(rows)) throw new Error('Expected JSON array of timetable rows or object with { rows: [...] }');
      const res = await apiTimetable.bulk(rows);
      setBulkSuccess(`Successfully imported ${res.count} class timetable slots!`);
      setBulkJson('');
      loadTimetable();
    } catch (err) {
      setBulkError(err.message);
    }
  }

  async function handleDeleteSlot(id) {
    if (!window.confirm('Delete this scheduled class timetable slot?')) return;
    try {
      await apiTimetable.remove(id);
      loadTimetable();
    } catch (err) {
      alert(`Delete failed: ${err.message}`);
    }
  }

  // Handlers for Security Agent
  async function handleRunScan() {
    setScanning(true);
    setScanMessage('');
    try {
      const res = await apiAdmin.securityScan();
      setScanMessage(res.message || 'Security heuristics scan completed successfully.');
      loadSecurity();
    } catch (err) {
      setScanMessage(`Scan error: ${err.message}`);
    } finally {
      setScanning(false);
    }
  }

  async function handleUpdateFlag(id, status) {
    try {
      await apiAdmin.updateSecurityFlag(id, status);
      loadSecurity();
    } catch (err) {
      alert(`Update failed: ${err.message}`);
    }
  }

  // Handlers for What-If
  async function handleRunSimulation() {
    setSimLoading(true);
    setSimResult(null);
    try {
      let data;
      if (simType === 'venue') {
        data = await apiAdmin.whatifVenue(simVenueId, simDate);
      } else if (simType === 'block') {
        data = await apiAdmin.whatifBlock(simBlockId, simDate);
      } else {
        data = await apiAdmin.whatifAmenity(simVenueId, simAmenityId, simDate);
      }
      setSimResult(data);
    } catch (err) {
      alert(`Simulation failed: ${err.message}`);
    } finally {
      setSimLoading(false);
    }
  }

  if (!isAdmin) {
    return (
      <div className="max-w-4xl mx-auto px-4 py-16 text-center">
        <div className="p-8 bg-rose-50 border border-rose-200 text-rose-900 rounded-xl">
          <span className="text-3xl block mb-2">🛡️</span>
          <h2 className="text-lg font-bold font-serif">Dean / Admin Privilege Required</h2>
          <p className="text-xs text-rose-800 mt-1">
            Access to this operational suite is reserved for campus administrative authorities.
          </p>
          <Link to="/venues" className="mt-4 inline-block text-xs font-semibold underline text-rose-950">
            ← Return to Campus Venues
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* Header */}
      <div className="pb-6 border-b border-stone-200">
        <div className="flex items-center gap-2 mb-1">
          <span className="text-2xl">🛡️</span>
          <h1 className="text-3xl font-serif font-bold text-slate-900">
            Dean & System Administrator Suite
          </h1>
        </div>
        <p className="text-stone-500 text-sm">
          Campus governance, academic timetables, AI Security Agent XAI audit, Digital Twin monitoring, and What-If simulation
        </p>
      </div>

      {/* Tabs Bar */}
      <div className="flex flex-wrap items-center gap-2 mt-6 border-b border-stone-200 pb-2">
        <button
          onClick={() => setActiveTab('blockheads')}
          className={`px-4 py-2 text-xs font-semibold rounded-lg transition ${
            activeTab === 'blockheads'
              ? 'bg-slate-900 text-white shadow-sm'
              : 'text-stone-600 hover:bg-stone-100'
          }`}
        >
          👨‍🏫 Block Head Governance
        </button>
        <button
          onClick={() => setActiveTab('timetable')}
          className={`px-4 py-2 text-xs font-semibold rounded-lg transition ${
            activeTab === 'timetable'
              ? 'bg-slate-900 text-white shadow-sm'
              : 'text-stone-600 hover:bg-stone-100'
          }`}
        >
          📅 Class Timetables
        </button>
        <button
          onClick={() => setActiveTab('security')}
          className={`px-4 py-2 text-xs font-semibold rounded-lg transition ${
            activeTab === 'security'
              ? 'bg-slate-900 text-white shadow-sm'
              : 'text-stone-600 hover:bg-stone-100'
          }`}
        >
          🚨 AI Security Agent (XAI)
        </button>
        <button
          onClick={() => setActiveTab('twin')}
          className={`px-4 py-2 text-xs font-semibold rounded-lg transition ${
            activeTab === 'twin'
              ? 'bg-slate-900 text-white shadow-sm'
              : 'text-stone-600 hover:bg-stone-100'
          }`}
        >
          🌐 Live Digital Twin State
        </button>
        <button
          onClick={() => setActiveTab('whatif')}
          className={`px-4 py-2 text-xs font-semibold rounded-lg transition ${
            activeTab === 'whatif'
              ? 'bg-slate-900 text-white shadow-sm'
              : 'text-stone-600 hover:bg-stone-100'
          }`}
        >
          🔮 What-If Disruption Engine
        </button>
      </div>

      {/* TAB 1: BLOCK HEAD ASSIGNMENTS */}
      {activeTab === 'blockheads' && (
        <div className="mt-6 bg-white rounded-xl border border-stone-200 p-6 shadow-sm">
          <h2 className="text-lg font-serif font-bold text-slate-900 mb-1">
            Faculty & Block Head Governance
          </h2>
          <p className="text-xs text-stone-500 mb-6">
            Assign designated faculty members to oversee first-tier booking approvals and maintenance for specific academic blocks.
          </p>

          {bhLoading ? (
            <p className="text-xs text-stone-500 font-mono py-8 text-center">Loading users...</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="border-b border-stone-200 bg-stone-50 text-stone-600 uppercase font-semibold text-[10px]">
                    <th className="py-2.5 px-3">Faculty / User Name</th>
                    <th className="py-2.5 px-3">Campus Email</th>
                    <th className="py-2.5 px-3">Role</th>
                    <th className="py-2.5 px-3">Block Head Assignment</th>
                    <th className="py-2.5 px-3 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-stone-100">
                  {usersList
                    .filter((u) => u.role === 'faculty')
                    .map((u) => (
                      <tr key={u.id} className="hover:bg-stone-50/50">
                        <td className="py-2.5 px-3 font-semibold text-slate-900">{u.name}</td>
                        <td className="py-2.5 px-3 font-mono text-stone-600">{u.email}</td>
                        <td className="py-2.5 px-3 capitalize">{u.role}</td>
                        <td className="py-2.5 px-3">
                          {u.is_block_head ? (
                            <span className="bg-indigo-100 text-indigo-800 text-[11px] font-bold px-2 py-0.5 rounded">
                              Head of {u.block_name || 'Assigned Block'}
                            </span>
                          ) : (
                            <select
                              value={bhTargetBlock[u.id] || ''}
                              onChange={(e) =>
                                setBhTargetBlock((prev) => ({ ...prev, [u.id]: e.target.value }))
                              }
                              className="text-xs border border-stone-300 rounded p-1 bg-stone-50"
                            >
                              <option value="">Select Block</option>
                              {blocksList.map((b) => (
                                <option key={b.id} value={b.id}>
                                  {b.name}
                                </option>
                              ))}
                            </select>
                          )}
                        </td>
                        <td className="py-2.5 px-3 text-right">
                          {u.is_block_head ? (
                            <button
                              onClick={() => handleToggleBlockHead(u, false)}
                              className="text-xs text-rose-700 hover:underline font-semibold"
                            >
                              Remove Block Head
                            </button>
                          ) : (
                            <button
                              onClick={() => handleToggleBlockHead(u, true)}
                              className="text-xs bg-slate-900 text-white px-2.5 py-1 rounded font-semibold hover:bg-slate-800"
                            >
                              Appoint Block Head
                            </button>
                          )}
                        </td>
                      </tr>
                    ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* TAB 2: TIMETABLES */}
      {activeTab === 'timetable' && (
        <div className="mt-6 space-y-6">
          {/* Add Slot */}
          <div className="bg-white rounded-xl border border-stone-200 p-6 shadow-sm">
            <h2 className="text-lg font-serif font-bold text-slate-900 mb-1">
              Add Academic Timetable Slot
            </h2>
            <form onSubmit={handleAddSlot} className="grid grid-cols-1 sm:grid-cols-5 gap-3 mt-4 items-end">
              <div>
                <label className="block text-xs font-semibold text-stone-700 mb-1">Venue</label>
                <select
                  value={ttVenueId}
                  onChange={(e) => setTtVenueId(e.target.value)}
                  required
                  className="w-full text-xs border border-stone-300 rounded-lg p-2 bg-stone-50"
                >
                  <option value="">Select Venue</option>
                  {venuesList.map((v) => (
                    <option key={v.id} value={v.id}>
                      {v.name} ({v.block_name})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-stone-700 mb-1">Day of Week</label>
                <select
                  value={ttDow}
                  onChange={(e) => setTtDow(e.target.value)}
                  className="w-full text-xs border border-stone-300 rounded-lg p-2 bg-stone-50"
                >
                  <option value={1}>Monday</option>
                  <option value={2}>Tuesday</option>
                  <option value={3}>Wednesday</option>
                  <option value={4}>Thursday</option>
                  <option value={5}>Friday</option>
                  <option value={6}>Saturday</option>
                  <option value={0}>Sunday</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-stone-700 mb-1">Start Time</label>
                <input
                  type="time"
                  value={ttStart}
                  onChange={(e) => setTtStart(e.target.value)}
                  required
                  className="w-full text-xs border border-stone-300 rounded-lg p-2 bg-stone-50"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-stone-700 mb-1">End Time</label>
                <input
                  type="time"
                  value={ttEnd}
                  onChange={(e) => setTtEnd(e.target.value)}
                  required
                  className="w-full text-xs border border-stone-300 rounded-lg p-2 bg-stone-50"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-stone-700 mb-1">Course Label</label>
                <input
                  type="text"
                  placeholder="e.g. CS201 Lab"
                  value={ttLabel}
                  onChange={(e) => setTtLabel(e.target.value)}
                  className="w-full text-xs border border-stone-300 rounded-lg p-2 bg-stone-50"
                />
              </div>

              <div className="sm:col-span-5 text-right">
                <button
                  type="submit"
                  className="bg-slate-900 text-white px-4 py-2 rounded-lg text-xs font-semibold hover:bg-slate-800"
                >
                  + Add Timetable Entry
                </button>
              </div>
            </form>
          </div>

          {/* Bulk JSON Upload */}
          <div className="bg-white rounded-xl border border-stone-200 p-6 shadow-sm">
            <h2 className="text-lg font-serif font-bold text-slate-900 mb-1">
              Bulk Timetable Upload (JSON)
            </h2>
            <p className="text-xs text-stone-500 mb-3">
              Upload multiple course schedule slots in a single atomic database transaction. You can supply either <code>venue_id</code> or <code>venue_name</code>.
            </p>

            {bulkError && <p className="p-2.5 bg-rose-50 text-rose-700 border border-rose-200 text-xs rounded mb-2">{bulkError}</p>}
            {bulkSuccess && <p className="p-2.5 bg-emerald-50 text-emerald-700 border border-emerald-200 text-xs rounded mb-2">{bulkSuccess}</p>}

            <textarea
              value={bulkJson}
              onChange={(e) => setBulkJson(e.target.value)}
              placeholder={`[\n  { "venue_name": "${venuesList[0]?.name || 'B204 Hall'}", "day_of_week": 1, "start_time": "09:00", "end_time": "11:00", "label": "MATH101" }\n]`}
              rows={4}
              className="w-full text-xs font-mono border border-stone-300 rounded-lg p-3 bg-stone-50 focus:bg-white"
            />
            <div className="text-right mt-2">
              <button
                onClick={handleBulkUpload}
                disabled={!bulkJson.trim()}
                className="bg-amber-600 text-white px-4 py-2 rounded-lg text-xs font-semibold hover:bg-amber-500 disabled:opacity-50"
              >
                Upload Bulk Schedule
              </button>
            </div>
          </div>

          {/* Scheduled Slots Table */}
          <div className="bg-white rounded-xl border border-stone-200 p-6 shadow-sm">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-serif font-bold text-slate-900">
                Current Class Timetable Entries ({ttList.length})
              </h2>
              <button onClick={loadTimetable} className="text-xs text-stone-600 hover:underline">
                ↻ Refresh
              </button>
            </div>

            <div className="overflow-x-auto max-h-96">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="border-b border-stone-200 bg-stone-50 text-stone-600 uppercase font-semibold text-[10px]">
                    <th className="py-2.5 px-3">Venue</th>
                    <th className="py-2.5 px-3">Day of Week</th>
                    <th className="py-2.5 px-3">Time Range</th>
                    <th className="py-2.5 px-3">Course / Slot Label</th>
                    <th className="py-2.5 px-3 text-right">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-stone-100">
                  {ttList.map((slot) => (
                    <tr key={slot.id} className="hover:bg-stone-50/50">
                      <td className="py-2 px-3 font-semibold text-slate-900">{slot.venue_name}</td>
                      <td className="py-2 px-3 font-medium">Day {slot.day_of_week}</td>
                      <td className="py-2 px-3 font-mono">{slot.start_time} – {slot.end_time}</td>
                      <td className="py-2 px-3 text-stone-600">{slot.label || '—'}</td>
                      <td className="py-2 px-3 text-right">
                        <button
                          onClick={() => handleDeleteSlot(slot.id)}
                          className="text-xs text-rose-600 hover:underline font-semibold"
                        >
                          Delete
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* TAB 3: SECURITY AGENT XAI */}
      {activeTab === 'security' && (
        <div className="mt-6 bg-white rounded-xl border border-stone-200 p-6 shadow-sm space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b pb-4">
            <div>
              <h2 className="text-lg font-serif font-bold text-slate-900">
                AI Security Agent Flags & Explainable AI (XAI)
              </h2>
              <p className="text-xs text-stone-500">
                Automated detection of irregular booking bursts, repeat cancellations, or unusual campus utilization
              </p>
            </div>
            <button
              onClick={handleRunScan}
              disabled={scanning}
              className="bg-rose-600 hover:bg-rose-700 text-white text-xs font-semibold px-4 py-2.5 rounded-lg transition disabled:opacity-50 shrink-0"
            >
              {scanning ? 'Running Heuristics Scan...' : '⚡ Trigger Heuristic Security Scan'}
            </button>
          </div>

          {scanMessage && (
            <div className="p-3 bg-stone-100 text-slate-800 rounded-lg text-xs font-mono">
              {scanMessage}
            </div>
          )}

          {secLoading ? (
            <p className="text-xs text-stone-500 font-mono py-8 text-center">Checking security flags...</p>
          ) : secFlags.length === 0 ? (
            <div className="py-12 text-center">
              <span className="text-3xl block mb-2">🛡️</span>
              <p className="text-slate-800 font-semibold">Zero Anomaly Flags Detected</p>
              <p className="text-stone-500 text-xs mt-1">
                The Security Agent has identified no suspicious patterns or policy breaches across campus reservations.
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {secFlags.map((flag) => (
                <div
                  key={flag.id}
                  className="p-4 rounded-xl border border-stone-200 bg-stone-50 flex items-start justify-between gap-4 text-xs"
                >
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider ${
                        flag.severity === 'high'
                          ? 'bg-rose-600 text-white'
                          : flag.severity === 'medium'
                          ? 'bg-amber-600 text-white'
                          : 'bg-slate-700 text-white'
                      }`}>
                        {flag.severity || 'Notice'}
                      </span>
                      <span className="font-semibold text-slate-900 font-mono">
                        Rule: {flag.rule_name || flag.type || 'Behavioral Anomaly'}
                      </span>
                      <span className="text-stone-400 font-mono text-[10px]">
                        Status: {flag.status}
                      </span>
                    </div>

                    <p className="text-stone-700 font-medium">
                      {flag.description || flag.reason}
                    </p>

                    {flag.user_email && (
                      <p className="text-stone-500 font-mono text-[11px]">
                        Associated User: {flag.user_email}
                      </p>
                    )}
                  </div>

                  <div className="flex items-center gap-2 shrink-0">
                    <button
                      onClick={() => handleUpdateFlag(flag.id, 'reviewed')}
                      className="text-xs px-2.5 py-1 bg-slate-900 text-white rounded font-medium hover:bg-slate-800"
                    >
                      Mark Reviewed
                    </button>
                    <button
                      onClick={() => handleUpdateFlag(flag.id, 'dismissed')}
                      className="text-xs px-2.5 py-1 border border-stone-300 text-stone-600 rounded font-medium hover:bg-white"
                    >
                      Dismiss
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* TAB 4: DIGITAL TWIN LIVE STATE */}
      {activeTab === 'twin' && (
        <div className="mt-6 bg-white rounded-xl border border-stone-200 p-6 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="text-lg font-serif font-bold text-slate-900">
                Campus Digital Twin Operational View (v_campus_twin)
              </h2>
              <p className="text-xs text-stone-500">
                Live synchronization from database triggers, issue reports, and reservation transactions
              </p>
            </div>
            <button onClick={loadTwin} className="text-xs text-stone-600 hover:underline">
              ↻ Refresh Twin
            </button>
          </div>

          {twinLoading ? (
            <p className="text-xs text-stone-500 font-mono py-8 text-center">Reading digital twin view...</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="border-b border-stone-200 bg-stone-50 text-stone-600 uppercase font-semibold text-[10px]">
                    <th className="py-2.5 px-3">Block & Venue</th>
                    <th className="py-2.5 px-3">Availability</th>
                    <th className="py-2.5 px-3">Operational State</th>
                    <th className="py-2.5 px-3">Maintenance</th>
                    <th className="py-2.5 px-3">Open Issues</th>
                    <th className="py-2.5 px-3">Upcoming Bookings</th>
                    <th className="py-2.5 px-3 text-right">Last Synced</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-stone-100 font-mono text-[11px]">
                  {twinRows.map((t) => (
                    <tr key={t.venue_id} className="hover:bg-stone-50/50">
                      <td className="py-2 px-3 font-sans font-semibold text-slate-900">
                        {t.block_name} • {t.venue_name}
                      </td>
                      <td className="py-2 px-3">
                        <span className={`px-2 py-0.5 rounded font-sans capitalize ${
                          t.availability_state === 'available'
                            ? 'bg-emerald-100 text-emerald-800'
                            : 'bg-amber-100 text-amber-800'
                        }`}>
                          {t.availability_state}
                        </span>
                      </td>
                      <td className="py-2 px-3">
                        <span className={`px-2 py-0.5 rounded font-sans capitalize ${
                          t.operational_state === 'good'
                            ? 'bg-emerald-100 text-emerald-800'
                            : 'bg-rose-100 text-rose-800'
                        }`}>
                          {t.operational_state}
                        </span>
                      </td>
                      <td className="py-2 px-3 font-sans capitalize">{t.maintenance_state || 'none'}</td>
                      <td className="py-2 px-3 font-bold text-rose-700">{t.open_issues || 0}</td>
                      <td className="py-2 px-3 text-stone-700">{t.upcoming_bookings || 0}</td>
                      <td className="py-2 px-3 text-right text-stone-400">
                        {t.last_updated ? new Date(t.last_updated).toLocaleTimeString() : 'Synced'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* TAB 5: WHAT-IF SIMULATOR */}
      {activeTab === 'whatif' && (
        <div className="mt-6 space-y-6">
          <div className="bg-white rounded-xl border border-stone-200 p-6 shadow-sm">
            <h2 className="text-lg font-serif font-bold text-slate-900 mb-1">
              What-If Campus Disruption Simulator
            </h2>
            <p className="text-xs text-stone-500 mb-5">
              Simulate disruptions (venue closure, whole block offline, or amenity breakdown) against actual database bookings and find compatible reassignment venues.
            </p>

            <div className="grid grid-cols-1 sm:grid-cols-4 gap-4 items-end">
              <div>
                <label className="block text-xs font-semibold text-stone-700 mb-1">Scenario Type</label>
                <select
                  value={simType}
                  onChange={(e) => setSimType(e.target.value)}
                  className="w-full text-xs border border-stone-300 rounded-lg p-2.5 bg-stone-50"
                >
                  <option value="venue">Single Venue Closure</option>
                  <option value="block">Entire Block Closure</option>
                  <option value="amenity">Amenity / Equipment Failure</option>
                </select>
              </div>

              {simType === 'venue' && (
                <div>
                  <label className="block text-xs font-semibold text-stone-700 mb-1">Target Venue</label>
                  <select
                    value={simVenueId}
                    onChange={(e) => setSimVenueId(e.target.value)}
                    className="w-full text-xs border border-stone-300 rounded-lg p-2.5 bg-stone-50"
                  >
                    {venuesList.map((v) => (
                      <option key={v.id} value={v.id}>
                        {v.name} ({v.block_name})
                      </option>
                    ))}
                  </select>
                </div>
              )}

              {simType === 'block' && (
                <div>
                  <label className="block text-xs font-semibold text-stone-700 mb-1">Target Block</label>
                  <select
                    value={simBlockId}
                    onChange={(e) => setSimBlockId(e.target.value)}
                    className="w-full text-xs border border-stone-300 rounded-lg p-2.5 bg-stone-50"
                  >
                    {blocksList.map((b) => (
                      <option key={b.id} value={b.id}>
                        {b.name}
                      </option>
                    ))}
                  </select>
                </div>
              )}

              {simType === 'amenity' && (
                <>
                  <div>
                    <label className="block text-xs font-semibold text-stone-700 mb-1">Target Venue</label>
                    <select
                      value={simVenueId}
                      onChange={(e) => setSimVenueId(e.target.value)}
                      className="w-full text-xs border border-stone-300 rounded-lg p-2.5 bg-stone-50"
                    >
                      {venuesList.map((v) => (
                        <option key={v.id} value={v.id}>
                          {v.name}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-stone-700 mb-1">Failing Amenity</label>
                    <select
                      value={simAmenityId}
                      onChange={(e) => setSimAmenityId(e.target.value)}
                      className="w-full text-xs border border-stone-300 rounded-lg p-2.5 bg-stone-50"
                    >
                      {amenitiesList.map((a) => (
                        <option key={a.id} value={a.id}>
                          {a.name}
                        </option>
                      ))}
                    </select>
                  </div>
                </>
              )}

              <div>
                <label className="block text-xs font-semibold text-stone-700 mb-1">Simulation Date</label>
                <input
                  type="date"
                  value={simDate}
                  onChange={(e) => setSimDate(e.target.value)}
                  className="w-full text-xs border border-stone-300 rounded-lg p-2 bg-stone-50"
                />
              </div>

              <div className="text-right sm:col-span-4">
                <button
                  onClick={handleRunSimulation}
                  disabled={simLoading}
                  className="bg-slate-900 text-white px-5 py-2.5 rounded-lg text-xs font-semibold hover:bg-slate-800 disabled:opacity-50 transition"
                >
                  {simLoading ? 'Simulating Impact...' : '▶ Run What-If Simulation'}
                </button>
              </div>
            </div>
          </div>

          {/* Simulation Results */}
          {simResult && (
            <div className="bg-white rounded-xl border border-stone-200 p-6 shadow-sm space-y-5">
              <h3 className="text-lg font-serif font-bold text-slate-900">
                Simulation Impact Report
              </h3>

              {/* 3 Metric Cards */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className="bg-rose-50 border border-rose-200 p-4 rounded-xl">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-rose-800 block">
                    Affected Reservations
                  </span>
                  <span className="text-2xl font-bold font-serif text-rose-900 mt-1 block">
                    {simResult.summary?.affected_bookings ?? 0}
                  </span>
                </div>

                <div className="bg-emerald-50 border border-emerald-200 p-4 rounded-xl">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-800 block">
                    Automatically Reassignable
                  </span>
                  <span className="text-2xl font-bold font-serif text-emerald-900 mt-1 block">
                    {simResult.summary?.reassignable ?? 0}
                  </span>
                </div>

                <div className="bg-amber-50 border border-amber-200 p-4 rounded-xl">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-amber-800 block">
                    Requires Admin Action
                  </span>
                  <span className="text-2xl font-bold font-serif text-amber-900 mt-1 block">
                    {simResult.summary?.needs_admin_action ?? 0}
                  </span>
                </div>
              </div>

              {/* Impacted Bookings List */}
              <div className="mt-4">
                <h4 className="text-xs font-semibold uppercase tracking-wider text-stone-700 mb-2">
                  Impacted Bookings & Suggested Alternatives:
                </h4>
                {simResult.details?.length === 0 ? (
                  <p className="text-xs text-stone-400 italic py-4">No active reservations exist on this date for the simulated scenario.</p>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full text-left text-xs border-collapse">
                      <thead>
                        <tr className="border-b border-stone-200 bg-stone-50 text-stone-600 uppercase font-semibold text-[10px]">
                          <th className="py-2.5 px-3">Requester</th>
                          <th className="py-2.5 px-3">Slot Range</th>
                          <th className="py-2.5 px-3">Status</th>
                          <th className="py-2.5 px-3">Alternatives Available</th>
                          <th className="py-2.5 px-3">Suggested Reallocation Venue</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-stone-100 font-mono text-[11px]">
                        {simResult.details?.map((d, i) => (
                          <tr key={d.booking_id || i} className="hover:bg-stone-50/50">
                            <td className="py-2.5 px-3 font-sans text-slate-900">{d.requester_email}</td>
                            <td className="py-2.5 px-3 text-stone-600">{d.booking_range}</td>
                            <td className="py-2.5 px-3 uppercase text-[10px] font-sans font-bold">{d.booking_status}</td>
                            <td className="py-2.5 px-3 font-bold">{d.alternatives_found}</td>
                            <td className="py-2.5 px-3 font-sans font-semibold text-emerald-800">
                              {d.suggested_venue || <span className="text-rose-600 italic">No compatible alternative found</span>}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

