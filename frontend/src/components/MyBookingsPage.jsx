// frontend/src/components/MyBookingsPage.jsx
import { useState, useEffect } from 'react';
import { bookings as apiBookings } from '../api';
import { Link } from 'react-router-dom';

export default function MyBookingsPage() {
  const [bookingsList, setBookingsList] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // History Drawer state
  const [historyOpen, setHistoryOpen] = useState(false);
  const [activeBooking, setActiveBooking] = useState(null);
  const [historyTrail, setHistoryTrail] = useState([]);
  const [historyLoading, setHistoryLoading] = useState(false);

  // Cancel prompt state
  const [cancelModalOpen, setCancelModalOpen] = useState(false);
  const [bookingToCancel, setBookingToCancel] = useState(null);
  const [cancelReason, setCancelReason] = useState('');
  const [cancelling, setCancelling] = useState(false);

  async function loadBookings() {
    try {
      setLoading(true);
      setError('');
      const data = await apiBookings.mine();
      setBookingsList(data || []);
    } catch (err) {
      console.error('Failed to load my bookings:', err);
      setError(err.message || 'Could not fetch bookings list.');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadBookings();
  }, []);

  async function openHistory(booking) {
    setActiveBooking(booking);
    setHistoryOpen(true);
    setHistoryLoading(true);
    setHistoryTrail([]);
    try {
      const history = await apiBookings.history(booking.id);
      setHistoryTrail(history || []);
    } catch (err) {
      console.error('Failed to load booking history:', err);
    } finally {
      setHistoryLoading(false);
    }
  }

  function promptCancel(booking) {
    setBookingToCancel(booking);
    setCancelReason('');
    setCancelModalOpen(true);
  }

  async function handleConfirmCancel(e) {
    e.preventDefault();
    if (!bookingToCancel) return;
    setCancelling(true);
    try {
      await apiBookings.cancel(bookingToCancel.id, cancelReason.trim() || undefined);
      setCancelModalOpen(false);
      setBookingToCancel(null);
      loadBookings();
    } catch (err) {
      alert(`Cancellation failed: ${err.message}`);
    } finally {
      setCancelling(false);
    }
  }

  const getStatusBadge = (status) => {
    switch (status) {
      case 'approved':
        return <span className="bg-emerald-100 text-emerald-800 border border-emerald-300 text-xs px-2.5 py-0.5 rounded-full font-semibold">✓ Confirmed</span>;
      case 'pending_block_head':
        return <span className="bg-amber-100 text-amber-800 border border-amber-300 text-xs px-2.5 py-0.5 rounded-full font-semibold">⏳ Awaiting Block Head</span>;
      case 'pending_dean':
        return <span className="bg-purple-100 text-purple-800 border border-purple-300 text-xs px-2.5 py-0.5 rounded-full font-semibold">🏛️ Awaiting Dean / Admin</span>;
      case 'pending_cancellation':
        return <span className="bg-orange-100 text-orange-800 border border-orange-300 text-xs px-2.5 py-0.5 rounded-full font-semibold">⚠️ Cancellation Pending</span>;
      case 'cancelled':
        return <span className="bg-stone-200 text-stone-700 text-xs px-2.5 py-0.5 rounded-full font-semibold">✕ Cancelled</span>;
      case 'rejected':
        return <span className="bg-rose-100 text-rose-800 border border-rose-300 text-xs px-2.5 py-0.5 rounded-full font-semibold">✕ Rejected</span>;
      default:
        return <span className="bg-stone-100 text-stone-700 text-xs px-2.5 py-0.5 rounded-full font-semibold">{status}</span>;
    }
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-6 border-b border-stone-200 gap-4">
        <div>
          <h1 className="text-3xl font-serif font-bold text-slate-900">
            My Reservations
          </h1>
          <p className="text-stone-500 text-sm mt-1">
            Track status across tiered approval stages and auditable decision history
          </p>
        </div>
        <Link
          to="/venues"
          className="bg-slate-900 hover:bg-slate-800 text-white text-xs font-semibold px-4 py-2.5 rounded-lg transition self-start sm:self-auto"
        >
          + New Reservation
        </Link>
      </div>

      {error && (
        <div className="mt-6 p-4 bg-rose-50 border border-rose-200 text-rose-700 text-sm rounded-xl">
          {error}
        </div>
      )}

      {loading ? (
        <div className="text-center py-16 text-stone-500 font-mono text-sm">
          Loading reservation portfolio...
        </div>
      ) : bookingsList.length === 0 ? (
        <div className="mt-8 text-center py-16 bg-white rounded-xl border border-stone-200 shadow-sm">
          <span className="text-4xl block mb-2">📋</span>
          <p className="text-stone-600 font-medium">You have not placed any venue reservations yet.</p>
          <Link
            to="/venues"
            className="mt-3 inline-block text-xs text-amber-700 font-semibold underline"
          >
            Explore available campus venues →
          </Link>
        </div>
      ) : (
        <div className="mt-6 space-y-4">
          {bookingsList.map((b) => {
            const canCancel = ['approved', 'pending_block_head', 'pending_dean'].includes(b.status);

            return (
              <div
                key={b.id}
                className="bg-white rounded-xl border border-stone-200 p-5 shadow-sm hover:border-stone-300 transition flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4"
              >
                <div>
                  <div className="flex items-center gap-3 mb-1.5">
                    <h2 className="text-lg font-bold text-slate-900 font-serif">
                      {b.venue_name}
                    </h2>
                    <span className="text-xs px-2 py-0.5 rounded bg-stone-100 text-stone-600 font-medium capitalize">
                      {b.venue_type?.replace('_', ' ')}
                    </span>
                    {getStatusBadge(b.status)}
                  </div>

                  <div className="text-xs text-stone-600 space-y-0.5 font-mono">
                    <p>
                      <strong>Date & Slot:</strong> {b.start?.slice(0, 10)} from {b.start?.slice(11)} to {b.end?.slice(11)}
                    </p>
                    {b.purpose && (
                      <p className="font-sans text-stone-700 mt-1">
                        <strong>Purpose:</strong> {b.purpose}
                      </p>
                    )}
                  </div>
                </div>

                <div className="flex items-center gap-2.5 self-end sm:self-center shrink-0">
                  <button
                    onClick={() => openHistory(b)}
                    className="text-xs font-semibold px-3 py-1.5 rounded-lg border border-stone-300 text-stone-700 hover:bg-stone-50 transition"
                  >
                    Audit Trail
                  </button>

                  {canCancel && (
                    <button
                      onClick={() => promptCancel(b)}
                      className="text-xs font-semibold px-3 py-1.5 rounded-lg border border-rose-300 text-rose-700 hover:bg-rose-50 transition"
                    >
                      Cancel Booking
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* History Drawer / Modal */}
      {historyOpen && activeBooking && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-2xl border border-stone-200 max-h-[85vh] flex flex-col">
            <div className="flex items-center justify-between border-b pb-3 mb-4">
              <div>
                <span className="text-[10px] uppercase font-mono tracking-wider text-amber-700 font-semibold block">
                  Auditable Decision History
                </span>
                <h3 className="font-serif font-bold text-slate-900 text-lg">
                  {activeBooking.venue_name}
                </h3>
              </div>
              <button
                onClick={() => setHistoryOpen(false)}
                className="text-stone-400 hover:text-stone-600 text-base font-bold"
              >
                ✕
              </button>
            </div>

            <div className="overflow-y-auto flex-1 pr-1 space-y-4" data-lenis-prevent>
              {historyLoading ? (
                <p className="text-xs text-stone-500 font-mono text-center py-6">
                  Fetching audit records...
                </p>
              ) : historyTrail.length === 0 ? (
                <p className="text-xs text-stone-400 italic text-center py-6">
                  No approval decision records logged yet.
                </p>
              ) : (
                <div className="relative border-l-2 border-stone-200 ml-3 space-y-6 py-2">
                  {historyTrail.map((h, idx) => (
                    <div key={idx} className="relative pl-6">
                      <div className="absolute -left-2 top-1 w-4 h-4 rounded-full bg-slate-900 border-2 border-white shadow-sm" />
                      <div className="bg-stone-50 border border-stone-200 rounded-lg p-3 text-xs">
                        <div className="flex items-center justify-between mb-1">
                          <span className="font-bold text-slate-900 uppercase text-[10px] tracking-wider">
                            Tier: {h.tier?.replace('_', ' ')} • {h.decision}
                          </span>
                          <span className="text-[10px] text-stone-400 font-mono">
                            {new Date(h.created_at).toLocaleString()}
                          </span>
                        </div>
                        {h.approver_name && (
                          <p className="text-stone-700 font-medium">
                            Decided by: {h.approver_name}
                          </p>
                        )}
                        {h.comment && (
                          <p className="text-stone-600 italic mt-1 bg-white p-2 rounded border border-stone-100">
                            "{h.comment}"
                          </p>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="pt-4 border-t mt-4 text-right">
              <button
                onClick={() => setHistoryOpen(false)}
                className="text-xs px-4 py-2 bg-slate-900 text-white rounded-lg font-semibold hover:bg-slate-800"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Cancellation Confirmation Modal */}
      {cancelModalOpen && bookingToCancel && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-stone-200">
            <h3 className="font-serif font-bold text-slate-900 text-base mb-2">
              Cancel Reservation for {bookingToCancel.venue_name}
            </h3>
            <p className="text-xs text-stone-600 mb-4 leading-relaxed">
              {bookingToCancel.status === 'approved'
                ? 'Because this reservation is already confirmed, requesting cancellation will send it to the Block Head for approval.'
                : 'This pending booking will be immediately withdrawn.'}
            </p>

            <form onSubmit={handleConfirmCancel} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-stone-700 mb-1">
                  Reason for Cancellation (Optional)
                </label>
                <textarea
                  value={cancelReason}
                  onChange={(e) => setCancelReason(e.target.value)}
                  placeholder="e.g. Event postponed, speaker unavailable..."
                  rows={2}
                  className="w-full text-xs border border-stone-300 rounded-lg p-2.5 focus:ring-2 focus:ring-amber-500/50"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setCancelModalOpen(false)}
                  className="text-xs px-3 py-2 border rounded-lg text-stone-600 hover:bg-stone-50"
                >
                  Keep Booking
                </button>
                <button
                  type="submit"
                  disabled={cancelling}
                  className="text-xs px-4 py-2 bg-rose-600 text-white rounded-lg font-semibold hover:bg-rose-700 disabled:opacity-50"
                >
                  {cancelling ? 'Processing...' : 'Confirm Cancellation'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

