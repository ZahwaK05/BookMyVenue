// frontend/src/components/VenueDetailPage.jsx
import { useState, useEffect, useCallback } from 'react';
import { useParams, Link } from 'react-router-dom';
import { venues as apiVenues, timetable as apiTimetable, issues as apiIssues } from '../api';
import { useAuth } from '../context/AuthContext';
import BookingForm from './BookingForm';

export default function VenueDetailPage() {
  const { id } = useParams();

  const { user, isAdmin, isBlockHead } = useAuth();

  const [venue, setVenue] = useState(null);
  const [schedule, setSchedule] = useState([]);
  const [issuesList, setIssuesList] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // Issue modal state
  const [showIssueModal, setShowIssueModal] = useState(false);
  const [issueAmenityId, setIssueAmenityId] = useState('');
  const [issueDesc, setIssueDesc] = useState('');
  const [issueSubmitting, setIssueSubmitting] = useState(false);
  const [issueError, setIssueError] = useState('');

  const loadData = useCallback(async () => {
    try {
      setLoading(true);
      setError('');
      const [vData, tData, iData] = await Promise.all([
        apiVenues.get(id),
        apiTimetable.list(id).catch(() => []),
        apiIssues.list({ venue_id: id }).catch(() => []),
      ]);
      setVenue(vData);
      setSchedule(tData || []);
      setIssuesList(iData || []);
    } catch (err) {
      console.error('Failed to load venue details:', err);
      setError(err.message || 'Venue could not be loaded.');
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const handleReportIssue = async (e) => {
    e.preventDefault();
    if (!issueDesc.trim()) {
      setIssueError('Please describe the problem.');
      return;
    }

    setIssueSubmitting(true);
    setIssueError('');
    try {
      await apiIssues.create({
        venue_id: id,
        amenity_id: issueAmenityId || undefined,
        description: issueDesc.trim(),
      });
      setShowIssueModal(false);
      setIssueDesc('');
      setIssueAmenityId('');
      loadData();
    } catch (err) {
      setIssueError(err.message || 'Failed to submit issue report.');
    } finally {
      setIssueSubmitting(false);
    }
  };

  const handleResolveIssue = async (issueId) => {
    try {
      await apiIssues.resolve(issueId);
      loadData();
    } catch (err) {
      alert(`Could not resolve issue: ${err.message}`);
    }
  };

  const canResolve = (venueObj) => {
    if (!user) return false;
    if (isAdmin) return true;
    if (isBlockHead && user.block_id === venueObj?.block_id) return true;
    return false;
  };

  const dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

  if (loading) {
    return (
      <div className="max-w-5xl mx-auto px-4 py-16 text-center text-stone-500 font-mono text-sm">
        Loading venue details and live operational state...
      </div>
    );
  }

  if (error || !venue) {
    return (
      <div className="max-w-4xl mx-auto px-4 py-12">
        <div className="p-6 bg-rose-50 border border-rose-200 text-rose-700 rounded-xl text-center">
          <p className="font-semibold">{error || 'Venue not found'}</p>
          <Link to="/venues" className="mt-4 inline-block text-xs font-semibold text-rose-900 underline">
            ← Back to campus venues
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* Back button */}
      <div className="mb-6">
        <Link to="/venues" className="text-xs font-semibold text-stone-600 hover:text-slate-900 inline-flex items-center gap-1">
          ← Back to Campus Venues
        </Link>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Left 2 Cols: Venue Details & Schedule & Issues */}
        <div className="lg:col-span-2 space-y-8">
          {/* Main Info Card */}
          <div className="bg-white rounded-xl border border-stone-200 p-6 shadow-sm">
            <div className="flex flex-wrap items-start justify-between gap-4 border-b border-stone-100 pb-5">
              <div>
                <span className="text-xs font-mono uppercase tracking-wider text-amber-700 font-semibold">
                  {venue.block_name} • Floor {venue.floor_number}
                </span>
                <h1 className="text-3xl font-serif font-bold text-slate-900 mt-0.5">
                  {venue.name}
                </h1>
              </div>

              <div className="flex items-center gap-2">
                <span className="text-xs font-semibold px-3 py-1 bg-stone-100 text-stone-800 rounded-full capitalize">
                  {venue.type.replace('_', ' ')}
                </span>
                <span className="text-xs font-semibold px-3 py-1 bg-amber-50 text-amber-800 border border-amber-200 rounded-full">
                  👥 Seating: {venue.capacity}
                </span>
              </div>
            </div>

            {/* Approval Requirement Banner */}
            <div className="mt-4 p-3.5 bg-stone-50 rounded-lg text-xs flex items-center justify-between">
              <div>
                <strong>Workflow Requirements: </strong>
                {venue.requires_dean_approval ? (
                  <span className="text-amber-800">
                    Student bookings for this hall require <strong>Tier 1 (Block Head)</strong> followed by <strong>Tier 2 (Dean Office)</strong> approval.
                  </span>
                ) : (
                  <span className="text-indigo-800">
                    Student bookings require <strong>Tier 1 (Block Head)</strong> review. Faculty bookings confirm automatically.
                  </span>
                )}
              </div>
            </div>

            {/* Amenities Section */}
            <div className="mt-6">
              <h2 className="text-xs font-semibold uppercase tracking-wider text-stone-600 mb-2">
                Available Amenities & Equipment
              </h2>
              <div className="flex flex-wrap gap-2">
                {venue.amenities && venue.amenities.length > 0 ? (
                  venue.amenities.map((a) => (
                    <span
                      key={a.id}
                      className="text-xs bg-stone-100 text-stone-700 px-3 py-1 rounded-md border border-stone-200 font-medium"
                    >
                      ✓ {a.name}
                    </span>
                  ))
                ) : (
                  <span className="text-xs text-stone-400 italic">Standard classroom amenities</span>
                )}
              </div>
            </div>
          </div>

          {/* Timetable Schedule Card */}
          <div className="bg-white rounded-xl border border-stone-200 p-6 shadow-sm">
            <h2 className="text-lg font-serif font-bold text-slate-900 mb-1">
              Class Timetable Schedule
            </h2>
            <p className="text-xs text-stone-500 mb-4">
              Regular academic courses scheduled in this hall. Bookings that overlap these slots are blocked automatically.
            </p>

            {schedule.length === 0 ? (
              <p className="text-xs text-stone-400 italic py-4">No regular classes scheduled for this venue.</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs border-collapse">
                  <thead>
                    <tr className="border-b border-stone-200 bg-stone-50 text-stone-600 uppercase font-semibold text-[10px]">
                      <th className="py-2.5 px-3">Day</th>
                      <th className="py-2.5 px-3">Time Slot</th>
                      <th className="py-2.5 px-3">Course / Slot Label</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-stone-100">
                    {schedule.map((s) => (
                      <tr key={s.id} className="hover:bg-stone-50/50">
                        <td className="py-2.5 px-3 font-medium text-slate-900">
                          {dayNames[s.day_of_week] || `Day ${s.day_of_week}`}
                        </td>
                        <td className="py-2.5 px-3 font-mono text-stone-700">
                          {s.start_time} – {s.end_time}
                        </td>
                        <td className="py-2.5 px-3 text-stone-600">
                          {s.label || 'Scheduled Academic Session'}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          {/* Issue Reports Section */}
          <div className="bg-white rounded-xl border border-stone-200 p-6 shadow-sm">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h2 className="text-lg font-serif font-bold text-slate-900">
                  Maintenance & Equipment Issues
                </h2>
                <p className="text-xs text-stone-500">
                  Live reports feed directly into the Campus Digital Twin
                </p>
              </div>
              <button
                onClick={() => setShowIssueModal(true)}
                className="text-xs bg-amber-50 text-amber-800 border border-amber-300 hover:bg-amber-100 px-3 py-1.5 rounded-lg font-medium transition"
              >
                + Report Issue
              </button>
            </div>

            {issuesList.length === 0 ? (
              <p className="text-xs text-emerald-700 bg-emerald-50 p-3 rounded-lg border border-emerald-100">
                ✓ All equipment and facilities in this venue are operating in good condition.
              </p>
            ) : (
              <div className="space-y-3">
                {issuesList.map((iss) => (
                  <div
                    key={iss.id}
                    className={`p-3.5 rounded-lg border text-xs flex items-start justify-between gap-4 ${
                      iss.status === 'open'
                        ? 'bg-rose-50/60 border-rose-200 text-rose-900'
                        : 'bg-stone-50 border-stone-200 text-stone-600'
                    }`}
                  >
                    <div>
                      <div className="flex items-center gap-2 mb-1">
                        <span
                          className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider ${
                            iss.status === 'open'
                              ? 'bg-rose-600 text-white'
                              : 'bg-emerald-600 text-white'
                          }`}
                        >
                          {iss.status}
                        </span>
                        {iss.amenity_name && (
                          <span className="font-semibold text-slate-900">
                            Amenity: {iss.amenity_name}
                          </span>
                        )}
                        <span className="text-[10px] text-stone-400">
                          Reported by {iss.reported_by_name}
                        </span>
                      </div>
                      <p className="mt-1">{iss.description}</p>
                    </div>

                    {iss.status === 'open' && canResolve(venue) && (
                      <button
                        onClick={() => handleResolveIssue(iss.id)}
                        className="bg-emerald-600 hover:bg-emerald-700 text-white px-2.5 py-1 rounded text-xs font-medium shrink-0 transition"
                      >
                        Mark Resolved
                      </button>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Right Col: Booking Form */}
        <div className="lg:col-span-1">
          <div className="sticky top-24">
            <BookingForm venue={venue} onSuccess={() => loadData()} />
          </div>
        </div>
      </div>

      {/* Report Issue Modal */}
      {showIssueModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-stone-200">
            <div className="flex items-center justify-between mb-4 border-b pb-3">
              <h3 className="font-serif font-bold text-slate-900 text-base">
                Report Venue Issue • {venue.name}
              </h3>
              <button
                onClick={() => setShowIssueModal(false)}
                className="text-stone-400 hover:text-stone-600 text-sm font-bold"
              >
                ✕
              </button>
            </div>

            {issueError && (
              <div className="mb-4 p-2.5 bg-rose-50 border border-rose-200 text-rose-700 text-xs rounded-lg">
                {issueError}
              </div>
            )}

            <form onSubmit={handleReportIssue} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-stone-700 mb-1">
                  Specific Amenity / Equipment (Optional)
                </label>
                <select
                  value={issueAmenityId}
                  onChange={(e) => setIssueAmenityId(e.target.value)}
                  className="w-full text-xs border border-stone-300 rounded-lg p-2.5 bg-stone-50"
                >
                  <option value="">Whole Venue / General Issue</option>
                  {(venue.amenities || []).map((a) => (
                    <option key={a.id} value={a.id}>
                      {a.name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-stone-700 mb-1">
                  Issue Description
                </label>
                <textarea
                  value={issueDesc}
                  onChange={(e) => setIssueDesc(e.target.value)}
                  placeholder="e.g. Projector bulb flickering, AC unit not cooling..."
                  rows={3}
                  required
                  className="w-full text-xs border border-stone-300 rounded-lg p-2.5 focus:ring-2 focus:ring-amber-500/50"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowIssueModal(false)}
                  className="text-xs px-3 py-2 border rounded-lg text-stone-600 hover:bg-stone-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={issueSubmitting}
                  className="text-xs px-4 py-2 bg-slate-900 text-white rounded-lg font-semibold hover:bg-slate-800 disabled:opacity-50"
                >
                  {issueSubmitting ? 'Submitting...' : 'Submit Issue'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

