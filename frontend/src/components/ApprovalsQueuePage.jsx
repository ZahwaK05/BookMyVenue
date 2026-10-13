// frontend/src/components/ApprovalsQueuePage.jsx
import { useState, useEffect } from 'react';
import { bookings as apiBookings } from '../api';
import { useAuth } from '../context/AuthContext';
import { Link } from 'react-router-dom';

export default function ApprovalsQueuePage() {
  const { user, isBlockHead, isAdmin } = useAuth();
  const [queue, setQueue] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // Decision Modal
  const [decisionModalOpen, setDecisionModalOpen] = useState(false);
  const [selectedBooking, setSelectedBooking] = useState(null);
  const [actionType, setActionType] = useState('approve'); // 'approve' | 'reject'
  const [decisionComment, setDecisionComment] = useState('');
  const [submitting, setSubmitting] = useState(false);

  async function loadQueue() {
    try {
      setLoading(true);
      setError('');
      const data = await apiBookings.queue();
      setQueue(data || []);
    } catch (err) {
      console.error('Failed to load approval queue:', err);
      setError(err.message || 'Could not load approvals queue.');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadQueue();
  }, []);

  function openDecision(booking, type) {
    setSelectedBooking(booking);
    setActionType(type);
    setDecisionComment('');
    setDecisionModalOpen(true);
  }

  async function handleConfirmDecision(e) {
    e.preventDefault();
    if (!selectedBooking) return;
    setSubmitting(true);
    try {
      await apiBookings.decide(selectedBooking.id, actionType, decisionComment.trim() || undefined);
      setDecisionModalOpen(false);
      setSelectedBooking(null);
      loadQueue();
    } catch (err) {
      alert(`Decision failed: ${err.message}`);
    } finally {
      setSubmitting(false);
    }
  }

  if (!isBlockHead && !isAdmin) {
    return (
      <div className="max-w-4xl mx-auto px-4 py-16 text-center">
        <div className="p-8 bg-amber-50 border border-amber-200 text-amber-900 rounded-xl">
          <span className="text-3xl block mb-2">🔒</span>
          <h2 className="text-lg font-bold font-serif">Approvals Access Restricted</h2>
          <p className="text-xs text-amber-800 mt-1">
            Only Block Heads and Administrators (Dean Office) have an approval queue.
          </p>
          <Link to="/venues" className="mt-4 inline-block text-xs font-semibold underline text-amber-950">
            ← Return to Campus Venues
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between pb-6 border-b border-stone-200 gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-3xl font-serif font-bold text-slate-900">
              Approvals Queue
            </h1>
            <span className="text-xs font-mono px-2.5 py-0.5 rounded-full bg-slate-900 text-amber-300 font-semibold">
              {queue.length} Pending
            </span>
          </div>
          <p className="text-stone-500 text-sm mt-1">
            {isAdmin
              ? 'Dean / Administrative Office review queue for multi-tier hall requests'
              : `Block Head review queue for ${user?.block_name || 'Assigned Block'}`}
          </p>
        </div>
        <button
          onClick={loadQueue}
          className="text-xs font-semibold px-3 py-2 border border-stone-300 rounded-lg hover:bg-stone-50 self-start md:self-auto transition"
        >
          ↻ Refresh Queue
        </button>
      </div>

      {error && (
        <div className="mt-6 p-4 bg-rose-50 border border-rose-200 text-rose-700 text-sm rounded-xl">
          {error}
        </div>
      )}

      {loading ? (
        <div className="text-center py-16 text-stone-500 font-mono text-sm">
          Loading pending authorization requests...
        </div>
      ) : queue.length === 0 ? (
        <div className="mt-8 text-center py-16 bg-white rounded-xl border border-stone-200 shadow-sm">
          <span className="text-4xl block mb-2">🎉</span>
          <p className="text-slate-800 font-semibold">Your approval queue is completely clear!</p>
          <p className="text-stone-500 text-xs mt-1">
            No venue bookings or cancellation requests are currently awaiting your decision.
          </p>
        </div>
      ) : (
        <div className="mt-6 space-y-4">
          {queue.map((b) => (
            <div
              key={b.id}
              className="bg-white rounded-xl border border-stone-200 p-6 shadow-sm hover:border-stone-300 transition flex flex-col lg:flex-row items-start lg:items-center justify-between gap-6"
            >
              <div className="space-y-2">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="text-xs font-mono uppercase tracking-wider text-amber-700 font-semibold">
                    {b.block_name}
                  </span>
                  <h2 className="text-lg font-bold font-serif text-slate-900">
                    {b.venue_name}
                  </h2>
                  <span className="text-xs px-2 py-0.5 rounded bg-stone-100 text-stone-700 font-medium capitalize">
                    {b.venue_type?.replace('_', ' ')}
                  </span>
                  <span className={`text-[11px] font-bold uppercase tracking-wider px-2 py-0.5 rounded ${
                    b.status === 'pending_cancellation'
                      ? 'bg-rose-100 text-rose-800'
                      : b.status === 'pending_dean'
                      ? 'bg-purple-100 text-purple-800'
                      : 'bg-amber-100 text-amber-800'
                  }`}>
                    {b.status.replace(/_/g, ' ')}
                  </span>
                </div>

                <div className="text-xs text-stone-600 grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-1">
                  <p>
                    <strong className="text-stone-800">Requester:</strong> {b.requester_name} ({b.requester_role}) • <span className="font-mono text-stone-500">{b.requester_email}</span>
                  </p>
                  <p className="font-mono">
                    <strong className="text-stone-800 font-sans">Slot:</strong> {b.start?.slice(0, 10)} ({b.start?.slice(11)} – {b.end?.slice(11)})
                  </p>
                  {b.purpose && (
                    <p className="sm:col-span-2 text-stone-700 mt-1">
                      <strong>Purpose:</strong> {b.purpose}
                    </p>
                  )}
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex items-center gap-2.5 self-end lg:self-center shrink-0">
                <button
                  onClick={() => openDecision(b, 'reject')}
                  className="text-xs font-semibold px-4 py-2 rounded-lg border border-rose-300 text-rose-700 hover:bg-rose-50 transition"
                >
                  {b.status === 'pending_cancellation' ? 'Decline Cancel' : 'Reject'}
                </button>
                <button
                  onClick={() => openDecision(b, 'approve')}
                  className="text-xs font-semibold px-4 py-2 rounded-lg bg-slate-900 text-white hover:bg-slate-800 transition shadow-sm"
                >
                  {b.status === 'pending_cancellation' ? 'Confirm Cancellation' : 'Approve'}
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Decision Modal */}
      {decisionModalOpen && selectedBooking && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-stone-200">
            <h3 className="font-serif font-bold text-slate-900 text-base mb-1">
              {actionType === 'approve' ? 'Approve' : 'Reject'} Request • {selectedBooking.venue_name}
            </h3>
            <p className="text-xs text-stone-500 mb-4">
              Submitted by {selectedBooking.requester_name} ({selectedBooking.requester_role})
            </p>

            <form onSubmit={handleConfirmDecision} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-stone-700 mb-1">
                  Decision Comment / Note for Requester (Optional)
                </label>
                <textarea
                  value={decisionComment}
                  onChange={(e) => setDecisionComment(e.target.value)}
                  placeholder={
                    actionType === 'approve'
                      ? 'e.g. Venue is reserved for symposium preparations.'
                      : 'e.g. Conflicts with department academic workshop.'
                  }
                  rows={3}
                  className="w-full text-xs border border-stone-300 rounded-lg p-2.5 focus:ring-2 focus:ring-amber-500/50"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setDecisionModalOpen(false)}
                  className="text-xs px-3 py-2 border rounded-lg text-stone-600 hover:bg-stone-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className={`text-xs px-4 py-2 rounded-lg font-semibold text-white disabled:opacity-50 transition ${
                    actionType === 'approve'
                      ? 'bg-slate-900 hover:bg-slate-800'
                      : 'bg-rose-600 hover:bg-rose-700'
                  }`}
                >
                  {submitting
                    ? 'Recording...'
                    : actionType === 'approve'
                    ? 'Confirm Approval'
                    : 'Confirm Rejection'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

