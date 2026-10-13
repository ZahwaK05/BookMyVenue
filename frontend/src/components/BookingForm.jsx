// frontend/src/components/BookingForm.jsx
import { useState } from 'react';
import { bookings } from '../api';
import { useAuth } from '../context/AuthContext';
import { useNavigate } from 'react-router-dom';

export default function BookingForm({ venue, onSuccess }) {
  const { user, isFaculty } = useAuth();
  const navigate = useNavigate();

  const todayStr = new Date().toISOString().slice(0, 10);
  const [date, setDate] = useState(todayStr);
  const [startTime, setStartTime] = useState('14:00');
  const [endTime, setEndTime] = useState('16:00');
  const [purpose, setPurpose] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const requiresDean = venue?.requires_dean_approval;

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');
    setSuccess('');

    if (!date || !startTime || !endTime) {
      setError('Please specify date, start time, and end time.');
      return;
    }

    if (endTime <= startTime) {
      setError('End time must be after start time.');
      return;
    }

    // Naive local campus time format: "YYYY-MM-DDTHH:MM" (NO Z, NO timezone offset)
    const start = `${date}T${startTime}`;
    const end = `${date}T${endTime}`;

    setLoading(true);
    try {
      const created = await bookings.create({
        venue_id: venue.id,
        start,
        end,
        purpose: purpose.trim() || undefined,
      });

      setSuccess(`Booking created successfully! Status: ${created.status.replace(/_/g, ' ').toUpperCase()}`);
      if (onSuccess) onSuccess(created);
    } catch (err) {
      console.error('Booking failed:', err);
      if (err.status === 409) {
        setError(err.data?.error || 'That timeslot is already booked or conflicts with a scheduled class.');
      } else {
        setError(err.message || 'Failed to submit booking request.');
      }
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="bg-white rounded-xl border border-stone-200 p-6 shadow-sm">
      <h3 className="text-lg font-serif font-bold text-slate-900 mb-1">
        Reserve {venue?.name || 'Venue'}
      </h3>
      <p className="text-xs text-stone-500 mb-4">
        Single-day campus reservation with automatic conflict and timetable checks
      </p>

      {/* Role-based Approval Workflow Guidance Banner */}
      <div className="mb-5 p-3 rounded-lg text-xs leading-relaxed bg-stone-50 border border-stone-200">
        {isFaculty ? (
          <div className="flex items-center gap-2 text-emerald-800">
            <span className="text-base">⚡</span>
            <span><strong>Faculty Privilege:</strong> Instant auto-approval enabled. Reservation confirms immediately.</span>
          </div>
        ) : requiresDean ? (
          <div className="flex items-center gap-2 text-amber-800">
            <span className="text-base">🏛️</span>
            <span><strong>Tiered Approval:</strong> Hall reservation requires <strong>Block Head</strong> review followed by <strong>Dean / Admin</strong> approval.</span>
          </div>
        ) : (
          <div className="flex items-center gap-2 text-indigo-800">
            <span className="text-base">📋</span>
            <span><strong>Standard Approval:</strong> Classroom reservation requires sign-off from the <strong>Block Head</strong>.</span>
          </div>
        )}
      </div>

      {error && (
        <div className="mb-4 p-3 bg-red-50 border border-red-200 text-red-700 text-xs rounded-lg">
          <strong>Conflict / Error:</strong> {error}
        </div>
      )}

      {success && (
        <div className="mb-4 p-3 bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs rounded-lg flex items-center justify-between">
          <span>{success}</span>
          <button
            onClick={() => navigate('/my-bookings')}
            className="text-xs font-semibold underline text-emerald-900 ml-2"
          >
            View My Bookings →
          </button>
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block text-xs font-semibold text-stone-700 mb-1">
            Reservation Date
          </label>
          <input
            type="date"
            value={date}
            onChange={(e) => setDate(e.target.value)}
            required
            className="w-full px-3 py-2 text-sm border border-stone-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-500/50"
          />
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-xs font-semibold text-stone-700 mb-1">
              Start Time
            </label>
            <input
              type="time"
              value={startTime}
              onChange={(e) => setStartTime(e.target.value)}
              required
              className="w-full px-3 py-2 text-sm border border-stone-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-500/50"
            />
          </div>
          <div>
            <label className="block text-xs font-semibold text-stone-700 mb-1">
              End Time
            </label>
            <input
              type="time"
              value={endTime}
              onChange={(e) => setEndTime(e.target.value)}
              required
              className="w-full px-3 py-2 text-sm border border-stone-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-500/50"
            />
          </div>
        </div>

        <div>
          <label className="block text-xs font-semibold text-stone-700 mb-1">
            Purpose / Event Description
          </label>
          <textarea
            value={purpose}
            onChange={(e) => setPurpose(e.target.value)}
            rows={2}
            placeholder="e.g., Department guest lecture, Project discussion..."
            className="w-full px-3 py-2 text-sm border border-stone-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-500/50"
          />
        </div>

        <button
          type="submit"
          disabled={loading}
          className="w-full bg-slate-900 text-white py-2.5 rounded-lg text-sm font-semibold hover:bg-slate-800 disabled:opacity-50 transition shadow-sm"
        >
          {loading ? 'Submitting Reservation...' : isFaculty ? 'Confirm Instant Booking' : 'Submit for Approval'}
        </button>
      </form>
    </div>
  );
}