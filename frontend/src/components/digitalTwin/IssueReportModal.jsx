/**
 * @file IssueReportModal.jsx
 * @description Dialog allowing users to file a venue or equipment defect in the mock Digital Twin state.
 */

import { useState } from 'react';
import { useDigitalTwin } from '../../context/DigitalTwinContext';

export default function IssueReportModal() {
  const { reportModalVenue, setReportModalVenue, reportEquipmentIssue } = useDigitalTwin();

  const [amenityId, setAmenityId] = useState('');
  const [issueType, setIssueType] = useState('equipment_failure');
  const [severity, setSeverity] = useState('high');
  const [description, setDescription] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);

  if (!reportModalVenue) return null;

  async function handleSubmit(e) {
    e.preventDefault();
    setSubmitting(true);
    try {
      await reportEquipmentIssue({
        venueId: reportModalVenue.id,
        amenityId: amenityId || undefined,
        issueType,
        severity,
        description,
      });
      setSuccess(true);
      setTimeout(() => {
        setSuccess(false);
        setReportModalVenue(null);
      }, 1200);
    } catch (err) {
      console.error(err);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/60 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-2xl border border-stone-200 animate-in zoom-in-95 duration-150">
        <div className="flex items-center justify-between pb-4 border-b border-stone-100">
          <div>
            <span className="text-xs font-mono font-bold text-amber-600 uppercase">
              Digital Twin Maintenance Dispatch
            </span>
            <h3 className="text-lg font-bold font-serif text-slate-900 mt-0.5">
              Report Issue for {reportModalVenue.code}
            </h3>
          </div>
          <button
            onClick={() => setReportModalVenue(null)}
            className="text-stone-400 hover:text-stone-700 text-lg p-1"
          >
            ✕
          </button>
        </div>

        {success ? (
          <div className="py-10 text-center space-y-2">
            <span className="text-3xl block">✅</span>
            <h4 className="font-bold text-slate-900 text-base">Defect Logged in Digital Twin!</h4>
            <p className="text-xs text-stone-500">
              Venue status updated to DEGRADED and operational health adjusted.
            </p>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="mt-4 space-y-4 text-xs">
            {/* Target Amenity */}
            <div>
              <label className="block font-semibold text-slate-700 mb-1">
                Affected Equipment / Amenity
              </label>
              <select
                value={amenityId}
                onChange={(e) => setAmenityId(e.target.value)}
                className="w-full border border-stone-300 rounded-lg p-2.5 text-xs text-slate-800 bg-stone-50 focus:bg-white focus:outline-none focus:ring-1 focus:ring-amber-500"
              >
                <option value="">General Facility / Whole Room Defect</option>
                {reportModalVenue.amenities?.map((am) => (
                  <option key={am.id} value={am.id}>
                    {am.name} ({am.health})
                  </option>
                ))}
              </select>
            </div>

            <div className="grid grid-cols-2 gap-3">
              {/* Issue Type */}
              <div>
                <label className="block font-semibold text-slate-700 mb-1">
                  Issue Classification
                </label>
                <select
                  value={issueType}
                  onChange={(e) => setIssueType(e.target.value)}
                  className="w-full border border-stone-300 rounded-lg p-2.5 text-xs text-slate-800 bg-stone-50 focus:bg-white focus:outline-none"
                >
                  <option value="equipment_failure">Hardware Malfunction</option>
                  <option value="electrical">Power / Electrical Outage</option>
                  <option value="cleanliness">Sanitation / Housekeeping</option>
                  <option value="structural">Physical / Structural Defect</option>
                </select>
              </div>

              {/* Severity */}
              <div>
                <label className="block font-semibold text-slate-700 mb-1">
                  Operational Severity
                </label>
                <select
                  value={severity}
                  onChange={(e) => setSeverity(e.target.value)}
                  className="w-full border border-stone-300 rounded-lg p-2.5 text-xs text-slate-800 bg-stone-50 focus:bg-white focus:outline-none"
                >
                  <option value="low">Low (Cosmetic)</option>
                  <option value="medium">Medium (Minor Degradation)</option>
                  <option value="high">High (Core Feature Down)</option>
                  <option value="critical">Critical (Room Unusable)</option>
                </select>
              </div>
            </div>

            {/* Description */}
            <div>
              <label className="block font-semibold text-slate-700 mb-1">
                Defect Symptoms & Description
              </label>
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                required
                rows={3}
                placeholder="e.g. Projector optical unit is flashing red; lamp does not illuminate screen..."
                className="w-full border border-stone-300 rounded-lg p-2.5 text-xs text-slate-800 focus:outline-none focus:ring-1 focus:ring-amber-500"
              />
            </div>

            {/* Actions */}
            <div className="pt-3 border-t border-stone-100 flex items-center justify-end gap-2">
              <button
                type="button"
                onClick={() => setReportModalVenue(null)}
                className="px-4 py-2 border border-stone-300 rounded-lg text-stone-600 hover:bg-stone-50 font-medium"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={submitting}
                className="px-4 py-2 bg-slate-900 hover:bg-slate-800 text-amber-400 font-semibold rounded-lg transition disabled:opacity-50"
              >
                {submitting ? 'Logging Ticket…' : 'Submit Ticket to Digital Twin'}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}

