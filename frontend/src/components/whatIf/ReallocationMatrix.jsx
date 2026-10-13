/**
 * @file ReallocationMatrix.jsx
 * @description Candidate alternative venue recommendation matrix with compatibility scoring, explainable rationales,
 * and simulated approval actions.
 */

import { useState } from 'react';
import { useWhatIfSimulation } from '../../context/WhatIfContext';

export default function ReallocationMatrix() {
  const {
    simulationResults,
    reallocationDecisions,
    acceptReallocation,
    chooseDifferentRoom,
    flagForAdmin,
  } = useWhatIfSimulation();

  const [activeFallbackBookingId, setActiveFallbackBookingId] = useState(null);

  if (!simulationResults || !simulationResults.reallocations) return null;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-base font-bold font-serif text-slate-900">
            Intelligent Alternative Venue Reallocation Proposals
          </h3>
          <p className="text-xs text-stone-500">
            Automated recommendations matched against venue capacity, required amenities, and timetable conflict avoidance.
          </p>
        </div>
      </div>

      <div className="space-y-3.5">
        {simulationResults.reallocations.map((item) => {
          const { bookingId, affectedItem, recommendedAlternative, fallbackCandidates } = item;
          const decision = reallocationDecisions[bookingId] || {};
          const isAccepted = decision.status === 'accepted';
          const isFlagged = decision.status === 'flagged_admin';

          return (
            <div
              key={bookingId}
              className={`bg-white rounded-xl border p-5 shadow-xs transition ${
                isAccepted
                  ? 'border-emerald-400 bg-emerald-50/20 ring-1 ring-emerald-300'
                  : isFlagged
                  ? 'border-red-400 bg-red-50/20'
                  : 'border-stone-200 hover:border-stone-300'
              }`}
            >
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-start">
                {/* 1. ORIGINAL AFFECTED VENUE (Left 5 Cols) */}
                <div className="lg:col-span-5 space-y-2">
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded bg-red-100 text-red-800">
                      Disrupted Original
                    </span>
                    <span className="font-mono text-xs font-bold text-slate-900">
                      {affectedItem.originalVenueCode}
                    </span>
                    <span className="text-xs text-stone-500">
                      (Cap: {affectedItem.originalCapacity})
                    </span>
                  </div>

                  <h4 className="text-sm font-bold text-slate-900 leading-snug">
                    {affectedItem.title}
                  </h4>

                  <div className="text-xs text-stone-600 space-y-1">
                    <p>
                      👤 Host: <strong>{affectedItem.requesterName}</strong> • {affectedItem.expectedAttendees} attendees
                    </p>
                    <p className="font-mono text-[11px] text-stone-500">
                      🕒 Time Slot: {affectedItem.startTime} – {affectedItem.endTime}
                    </p>
                  </div>

                  <div className="p-2 rounded-lg bg-red-50/70 border border-red-200 text-xs text-red-700">
                    <span className="font-semibold block">⚠️ Impact Cause:</span>
                    <span className="text-[11px] leading-tight block mt-0.5">
                      {affectedItem.impactReason}
                    </span>
                  </div>
                </div>

                {/* Arrow Divider */}
                <div className="hidden lg:flex lg:col-span-1 items-center justify-center self-center text-stone-400 text-xl font-bold">
                  ➔
                </div>

                {/* 2. RECOMMENDED ALTERNATIVE VENUE (Right 6 Cols) */}
                <div className="lg:col-span-6 space-y-3">
                  {recommendedAlternative ? (
                    <div>
                      {/* Top Header of Recommendation */}
                      <div className="flex items-center justify-between gap-2 flex-wrap mb-2">
                        <div className="flex items-center gap-2">
                          <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded bg-emerald-100 text-emerald-800">
                            Recommended Space
                          </span>
                          <span className="font-mono text-sm font-bold text-slate-900">
                            {decision.selectedVenueCode || recommendedAlternative.venueCode}
                          </span>
                          <span className="text-xs font-semibold text-emerald-700">
                            (Cap: {recommendedAlternative.capacity})
                          </span>
                        </div>

                        {/* Compatibility Score Chip */}
                        <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-emerald-50 border border-emerald-300 text-emerald-800 text-xs font-bold font-mono">
                          <span>Match Score:</span>
                          <span>{recommendedAlternative.compatibilityScore}%</span>
                        </div>
                      </div>

                      {/* Explainable Rationale Breakdown */}
                      <div className="bg-stone-50 border border-stone-200 rounded-lg p-3 text-xs space-y-1.5">
                        <span className="font-semibold text-slate-800 block text-[11px] uppercase tracking-wider">
                          Why Recommended by Solver:
                        </span>
                        <ul className="space-y-1 text-stone-600 text-[11px] list-disc list-inside">
                          <li>Sufficient capacity ({recommendedAlternative.capacity} seats for {affectedItem.expectedAttendees} attendees)</li>
                          <li>Required equipment verified functional in Digital Twin</li>
                          <li>No class timetable or booking conflict during {affectedItem.startTime}–{affectedItem.endTime}</li>
                          <li>Located in {recommendedAlternative.blockCode} Level {recommendedAlternative.floorNumber}</li>
                        </ul>
                      </div>

                      {/* Fallback Selector Drawer Toggle */}
                      {fallbackCandidates.length > 0 && (
                        <div className="pt-1">
                          <button
                            type="button"
                            onClick={() =>
                              setActiveFallbackBookingId(
                                activeFallbackBookingId === bookingId ? null : bookingId
                              )
                            }
                            className="text-xs text-blue-600 hover:text-blue-800 font-semibold"
                          >
                            {activeFallbackBookingId === bookingId
                              ? 'Hide other room candidates ▲'
                              : `View ${fallbackCandidates.length} other alternative options ▼`}
                          </button>

                          {activeFallbackBookingId === bookingId && (
                            <div className="mt-2 space-y-1.5 p-2 bg-stone-100 rounded-lg text-xs">
                              {fallbackCandidates.map((fb) => (
                                <div
                                  key={fb.venueCode}
                                  className="flex items-center justify-between bg-white p-2 rounded border border-stone-200"
                                >
                                  <div>
                                    <span className="font-bold text-slate-900">{fb.venueCode}</span>
                                    <span className="text-stone-500 ml-2">
                                      Cap: {fb.capacity} • Match: {fb.compatibilityScore}%
                                    </span>
                                  </div>
                                  <button
                                    onClick={() => {
                                      chooseDifferentRoom(bookingId, fb.venueCode);
                                      setActiveFallbackBookingId(null);
                                    }}
                                    className="px-2 py-1 bg-stone-150 hover:bg-stone-200 text-slate-800 rounded font-semibold text-[11px]"
                                  >
                                    Select This Room
                                  </button>
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                      )}

                      {/* Action Buttons */}
                      <div className="flex items-center gap-2 pt-2">
                        {isAccepted ? (
                          <div className="flex items-center gap-2 text-emerald-700 text-xs font-semibold">
                            <span>✅ Reallocation Confirmed for {decision.selectedVenueCode}</span>
                            <button
                              onClick={() => acceptReallocation(bookingId, null)}
                              className="text-stone-400 hover:text-stone-600 underline text-[11px]"
                            >
                              Undo
                            </button>
                          </div>
                        ) : isFlagged ? (
                          <span className="text-xs text-red-700 font-semibold">
                            🚨 Flagged for Admin / Dean Intervention
                          </span>
                        ) : (
                          <>
                            <button
                              onClick={() =>
                                acceptReallocation(bookingId, recommendedAlternative.venueCode)
                              }
                              className="px-3.5 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-bold transition shadow-xs"
                            >
                              Accept Reallocation
                            </button>

                            <button
                              onClick={() => flagForAdmin(bookingId)}
                              className="px-3 py-1.5 bg-stone-100 hover:bg-stone-200 text-slate-700 rounded-lg text-xs font-medium border border-stone-300 transition"
                            >
                              Flag for Admin
                            </button>
                          </>
                        )}
                      </div>
                    </div>
                  ) : (
                    /* UNRESOLVABLE SCENARIO (e.g. Auditorium 400 attendees) */
                    <div className="bg-red-50 border border-red-200 rounded-xl p-4 text-xs space-y-2">
                      <div className="flex items-center gap-1.5 text-red-800 font-bold">
                        <span>🚨 Unresolvable Conflict — No Campus Alternative</span>
                      </div>
                      <p className="text-red-700 text-[11px] leading-relaxed">
                        No alternative venue across the 4 campus blocks satisfies the capacity threshold of{' '}
                        <strong>{affectedItem.expectedAttendees} attendees</strong> without conflicting with ongoing lectures.
                      </p>
                      <div className="pt-2 flex items-center gap-2">
                        <button
                          onClick={() => flagForAdmin(bookingId)}
                          className="px-3 py-1.5 bg-red-600 hover:bg-red-700 text-white font-bold text-xs rounded-lg transition"
                        >
                          Submit to Dean for Special Scheduling 📝
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
