/**
 * @file SecurityDashboardPage.jsx
 * @description Admin-only Explainable AI (XAI) Security Agent Dashboard.
 * Displays anomalous booking/cancellation detections, severity badges,
 * audit details, and explainable AI rationales from the Security Agent.
 */

import { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { admin as apiAdmin } from '../api';
import { useAuth } from '../context/AuthContext';

export default function SecurityDashboardPage() {
  const { user, isAdmin, loading: authLoading } = useAuth();

  const [flags, setFlags] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [scanning, setScanning] = useState(false);
  const [scanMessage, setScanMessage] = useState('');

  // Filters
  const [statusFilter, setStatusFilter] = useState('open'); // 'open' | 'reviewed' | 'dismissed'
  const [severityFilter, setSeverityFilter] = useState('all'); // 'all' | 'high' | 'medium' | 'low'

  const loadFlags = useCallback(async () => {
    if (!isAdmin) return;
    setLoading(true);
    setError('');
    try {
      const data = await apiAdmin.securityFlags({
        status: statusFilter,
        severity: severityFilter !== 'all' ? severityFilter : undefined,
      });
      setFlags(Array.isArray(data) ? data : data?.flags || []);
    } catch (err) {
      console.error('[SecurityDashboard] Failed to fetch security flags:', err);
      setError(err.message || 'Failed to retrieve security flags from the Security Agent service.');
    } finally {
      setLoading(false);
    }
  }, [isAdmin, statusFilter, severityFilter]);

  useEffect(() => {
    loadFlags();
  }, [loadFlags]);

  const handleRunScan = async () => {
    setScanning(true);
    setScanMessage('');
    try {
      const res = await apiAdmin.securityScan();
      setScanMessage(res?.message || 'Heuristic anomaly scan executed successfully across campus bookings.');
      await loadFlags();
    } catch (err) {
      console.error('[SecurityDashboard] Scan failed:', err);
      setScanMessage(`Scan error: ${err.message || 'Security agent scan failed'}`);
    } finally {
      setScanning(false);
    }
  };

  const handleUpdateStatus = async (flagId, newStatus) => {
    try {
      await apiAdmin.updateSecurityFlag(flagId, newStatus);
      // Optimistic update
      setFlags((prev) => prev.filter((f) => f.id !== flagId));
    } catch (err) {
      alert(`Could not update flag status: ${err.message}`);
    }
  };

  // Auth gate
  if (authLoading) {
    return (
      <div className="max-w-7xl mx-auto px-4 py-16 text-center text-stone-500 font-mono text-xs">
        Checking admin authorization credentials…
      </div>
    );
  }

  if (!user || !isAdmin) {
    return (
      <div className="max-w-2xl mx-auto px-4 py-16 text-center space-y-4">
        <div className="w-16 h-16 bg-rose-50 border border-rose-200 text-rose-600 rounded-full flex items-center justify-center text-2xl mx-auto">
          🔒
        </div>
        <h2 className="text-xl font-bold font-serif text-slate-900">
          Administrator Access Required
        </h2>
        <p className="text-xs text-stone-600 leading-relaxed">
          The AI Security Agent (XAI) dashboard contains confidential campus behavioral analytics and policy enforcement tools restricted to Dean and System Administrator roles.
        </p>
        <Link
          to="/venues"
          className="inline-block mt-3 px-4 py-2 bg-slate-900 text-white text-xs font-semibold rounded-lg hover:bg-slate-800"
        >
          ← Return to Campus Venues
        </Link>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-stone-50 pb-16">
      {/* Top Header */}
      <div className="bg-white border-b border-stone-200 py-8 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-rose-500 animate-pulse" />
              <span className="text-xs font-mono font-bold uppercase tracking-wider text-rose-600">
                Institutional Safety & Governance
              </span>
            </div>
            <h1 className="text-3xl font-extrabold font-serif text-slate-900 mt-1">
              AI Security Agent & Explainable AI (XAI) Dashboard
            </h1>
            <p className="text-sm text-stone-600 mt-1 max-w-3xl leading-relaxed">
              Autonomous oversight agent monitoring campus reservation patterns, repeat cancellation surges,
              rapid booking bursts, and timetable conflicts with transparent explainability.
            </p>
          </div>

          <button
            onClick={handleRunScan}
            disabled={scanning}
            className="self-start md:self-auto px-5 py-2.5 bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold rounded-lg transition shadow-xs flex items-center gap-2 disabled:opacity-60"
          >
            {scanning ? (
              <>
                <span className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                <span>Running Heuristic Scan…</span>
              </>
            ) : (
              <>
                <span>⚡ Trigger Heuristic Scan</span>
              </>
            )}
          </button>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 mt-6 space-y-6">
        {/* Scan Feedback Banner */}
        {scanMessage && (
          <div className="p-4 bg-stone-900 text-amber-300 rounded-xl text-xs font-mono shadow-xs flex items-center justify-between">
            <span>ℹ {scanMessage}</span>
            <button
              onClick={() => setScanMessage('')}
              className="text-stone-400 hover:text-white text-sm ml-4"
            >
              ✕
            </button>
          </div>
        )}

        {/* Filter Controls Bar */}
        <div className="bg-white border border-stone-200 rounded-xl p-4 shadow-xs flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-xs font-bold text-stone-500 uppercase tracking-wider mr-1">
              Status:
            </span>
            {['open', 'reviewed', 'dismissed'].map((st) => (
              <button
                key={st}
                onClick={() => setStatusFilter(st)}
                className={`px-3 py-1.5 text-xs font-semibold rounded-lg capitalize transition ${
                  statusFilter === st
                    ? 'bg-slate-900 text-white shadow-xs'
                    : 'bg-stone-100 text-stone-600 hover:bg-stone-200'
                }`}
              >
                {st} Flags
              </button>
            ))}
          </div>

          <div className="flex items-center gap-3">
            <label className="text-xs font-semibold text-stone-600">Severity:</label>
            <select
              value={severityFilter}
              onChange={(e) => setSeverityFilter(e.target.value)}
              className="text-xs border border-stone-300 rounded-lg px-2.5 py-1.5 bg-stone-50 font-medium"
            >
              <option value="all">All Severities</option>
              <option value="high">High Risk</option>
              <option value="medium">Medium Risk</option>
              <option value="low">Low Risk / Notice</option>
            </select>

            <button
              onClick={loadFlags}
              className="text-xs text-stone-500 hover:text-slate-900 font-semibold px-2 py-1"
              title="Refresh security records"
            >
              ↻ Refresh
            </button>
          </div>
        </div>

        {/* Main Flags Content */}
        {loading ? (
          <div className="bg-white border border-stone-200 rounded-xl p-12 text-center space-y-3">
            <div className="w-8 h-8 border-2 border-slate-900 border-t-transparent rounded-full animate-spin mx-auto" />
            <p className="text-xs font-mono text-stone-500">Querying Security Agent audit records from Azure APIM…</p>
          </div>
        ) : error ? (
          <div className="bg-rose-50 border border-rose-200 rounded-xl p-6 text-center space-y-3">
            <span className="text-2xl block">⚠️</span>
            <p className="text-xs font-semibold text-rose-800">{error}</p>
            <button
              onClick={loadFlags}
              className="px-4 py-2 bg-rose-600 text-white text-xs font-bold rounded-lg hover:bg-rose-700 transition"
            >
              Retry Connection
            </button>
          </div>
        ) : flags.length === 0 ? (
          <div className="bg-white border border-stone-200 rounded-xl p-12 text-center space-y-3 shadow-xs">
            <span className="text-4xl block">🛡️</span>
            <h3 className="font-serif font-bold text-lg text-slate-900">
              Zero Security Anomaly Flags ({statusFilter.toUpperCase()})
            </h3>
            <p className="text-xs text-stone-500 max-w-md mx-auto leading-relaxed">
              The Security Agent has identified no suspicious booking surges, policy infringements, or anomalous behaviors matching the current filter criteria.
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            <div className="flex items-center justify-between text-xs text-stone-500 font-mono px-1">
              <span>Displaying {flags.length} security audit record(s)</span>
              <span>Autonomous 10-Minute Background Polling Active</span>
            </div>

            {flags.map((flag) => {
              const severityBadge = {
                high: 'bg-rose-600 text-white border-rose-700',
                medium: 'bg-amber-600 text-white border-amber-700',
                low: 'bg-slate-700 text-white border-slate-800',
              }[flag.severity?.toLowerCase()] || 'bg-stone-600 text-white';

              return (
                <div
                  key={flag.id}
                  className="bg-white rounded-xl border border-stone-200 p-5 shadow-xs hover:border-stone-300 transition space-y-4"
                >
                  {/* Top Bar: Rule, Severity, Status */}
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-stone-100 pb-3">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className={`px-2.5 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider border ${severityBadge}`}>
                        {flag.severity || 'Notice'}
                      </span>
                      <span className="font-mono text-xs font-bold text-slate-900">
                        Rule: {flag.rule_name || flag.type || 'Behavioral Anomaly'}
                      </span>
                      <span className="text-[11px] font-mono text-stone-400">
                        ID: {flag.id?.slice(0, 8)}…
                      </span>
                    </div>

                    <div className="flex items-center gap-3 text-xs">
                      <span className="font-mono text-[11px] text-stone-500">
                        Detected: {flag.created_at ? new Date(flag.created_at).toLocaleString('en-IN') : 'Recent'}
                      </span>
                      <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded bg-stone-100 text-stone-700">
                        Status: {flag.status}
                      </span>
                    </div>
                  </div>

                  {/* Flagged Booking & User Metadata */}
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 bg-stone-50 p-3.5 rounded-lg border border-stone-200 text-xs">
                    <div>
                      <span className="text-stone-400 block text-[10px] uppercase font-bold tracking-wider">
                        Target Booking / Session
                      </span>
                      <span className="font-mono font-semibold text-slate-900">
                        {flag.booking_id ? `Booking #${flag.booking_id.slice(0, 8)}` : 'Campus-wide / Multiple'}
                      </span>
                    </div>

                    <div>
                      <span className="text-stone-400 block text-[10px] uppercase font-bold tracking-wider">
                        Associated Account
                      </span>
                      <span className="font-mono font-semibold text-slate-800">
                        {flag.user_email || flag.user_id || 'System Detected'}
                      </span>
                    </div>

                    <div>
                      <span className="text-stone-400 block text-[10px] uppercase font-bold tracking-wider">
                        Detection Model
                      </span>
                      <span className="font-semibold text-slate-800">
                        Heuristic Rule Engine (XAI Layer)
                      </span>
                    </div>
                  </div>

                  {/* Explainable AI Explanation */}
                  <div className="bg-amber-50/60 border border-amber-200/80 rounded-xl p-4 text-xs space-y-1">
                    <span className="font-bold text-amber-900 uppercase tracking-wider text-[10px] block">
                      💡 Explainable AI (XAI) Rationale & Context
                    </span>
                    <p className="text-slate-800 leading-relaxed font-sans text-xs">
                      {flag.explanation || flag.reason || flag.description || 'Anomalous pattern identified by heuristic scan.'}
                    </p>
                  </div>

                  {/* Governance Action Buttons */}
                  {statusFilter === 'open' && (
                    <div className="flex items-center justify-end gap-2 pt-1 border-t border-stone-100">
                      <button
                        onClick={() => handleUpdateStatus(flag.id, 'dismissed')}
                        className="px-3 py-1.5 border border-stone-300 text-stone-700 text-xs font-semibold rounded-lg hover:bg-stone-100 transition"
                      >
                        Dismiss Flag
                      </button>
                      <button
                        onClick={() => handleUpdateStatus(flag.id, 'reviewed')}
                        className="px-4 py-1.5 bg-slate-900 text-white text-xs font-semibold rounded-lg hover:bg-slate-800 transition shadow-xs"
                      >
                        ✓ Mark Reviewed
                      </button>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}

