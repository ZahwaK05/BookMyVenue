/**
 * @file VenueTwinDrawer.jsx
 * @description Slide-over inspector panel showing deep-dive specifications, 24h schedule, equipment health checklist,
 * and the crucial "Simulate Impact" bridge linking to the What-If simulation engine.
 */

import { Link } from 'react-router-dom';
import { useDigitalTwin } from '../../context/DigitalTwinContext';
import StatusBadge from '../common/StatusBadge';

export default function VenueTwinDrawer() {
  const { activeVenue, selectVenue, setReportModalVenue } = useDigitalTwin();

  if (!activeVenue) return null;

  const hasDefectiveAmenity = activeVenue.amenities?.some((a) => a.health === 'DEFECTIVE');
  const whatIfScenarioType = hasDefectiveAmenity ? 'AMENITY_FAILURE' : 'VENUE_UNAVAILABLE';

  return (
    <div className="fixed inset-0 z-50 overflow-hidden bg-slate-950/50 backdrop-blur-xs flex justify-end transition-opacity">
      <div
       className="w-full max-w-xl bg-white h-full shadow-2xl flex flex-col justify-between overflow-y-auto animate-in slide-in-from-right duration-200"
       data-lenis-prevent
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="p-6 bg-slate-900 text-white border-b border-slate-800">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <span className="font-mono text-xs font-bold px-2 py-0.5 rounded bg-amber-400 text-slate-950">
                {activeVenue.code}
              </span>
              <span className="text-xs uppercase font-semibold text-stone-400 tracking-wider">
                {activeVenue.blockId} • Floor {activeVenue.floorNumber}
              </span>
            </div>

            <button
              onClick={() => selectVenue(null)}
              className="text-stone-400 hover:text-white text-lg p-1 rounded-lg hover:bg-slate-800 transition"
              title="Close Inspector"
            >
              ✕
            </button>
          </div>

          <h2 className="text-2xl font-bold font-serif text-white">{activeVenue.name}</h2>
          <div className="flex items-center gap-2 mt-3 flex-wrap">
            <StatusBadge status={activeVenue.operationalStatus} type="operational" />
            <StatusBadge status={activeVenue.occupancyState} type="occupancy" />
            <span className="text-xs text-stone-300 bg-slate-800 px-2.5 py-1 rounded-full border border-slate-700">
              👥 Capacity: <strong>{activeVenue.capacity}</strong> seats
            </span>
          </div>
        </div>

        {/* Content Body */}
        <div className="p-6 space-y-6 flex-1 text-slate-800 text-sm">
          {/* Health Score Banner */}
          <div className="bg-stone-50 border border-stone-200 rounded-xl p-4 flex items-center justify-between">
            <div>
              <span className="text-xs uppercase font-bold text-stone-500 tracking-wider block">
                Digital Twin Operational Health
              </span>
              <p className="text-xs text-stone-600 mt-0.5">
                Computed from equipment stability, defect tickets, and utilization stress.
              </p>
            </div>
            <div className="text-right">
              <span
                className={`text-2xl font-bold font-mono ${
                  activeVenue.healthScore >= 90
                    ? 'text-emerald-600'
                    : activeVenue.healthScore >= 70
                    ? 'text-amber-600'
                    : 'text-red-600'
                }`}
              >
                {activeVenue.healthScore}%
              </span>
            </div>
          </div>

          {/* Current Occupant Details */}
          <div>
            <h3 className="text-xs uppercase font-bold tracking-wider text-stone-500 mb-2">
              Current Presence & Occupancy
            </h3>
            {activeVenue.currentOccupant ? (
              <div className="border border-indigo-200 bg-indigo-50/50 rounded-xl p-4 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-indigo-700 uppercase">
                    ● {activeVenue.currentOccupant.type === 'timetable_class' ? 'Class in Session' : 'Approved Event'}
                  </span>
                  <span className="text-xs font-mono text-indigo-900 bg-indigo-100 px-2 py-0.5 rounded">
                    {activeVenue.currentOccupant.startsAt} – {activeVenue.currentOccupant.endsAt}
                  </span>
                </div>
                <h4 className="font-semibold text-slate-900 text-base">
                  {activeVenue.currentOccupant.title}
                </h4>
                <div className="flex items-center justify-between text-xs text-stone-600 pt-1 border-t border-indigo-100">
                  <span>Conducted by: <strong>{activeVenue.currentOccupant.host}</strong></span>
                  <span>Est. Attendees: <strong>{activeVenue.currentOccupant.attendeeCount}</strong></span>
                </div>
              </div>
            ) : (
              <div className="border border-stone-200 bg-stone-50 rounded-xl p-4 text-center text-stone-500">
                <span className="text-emerald-600 font-semibold block text-sm">Room is Currently Vacant</span>
                <span className="text-xs text-stone-400">Available for ad-hoc booking or immediate allocation</span>
              </div>
            )}
          </div>

          {/* Equipment & Amenity Health Matrix */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-xs uppercase font-bold tracking-wider text-stone-500">
                Equipment & Amenity Telemetry
              </h3>
              <span className="text-xs text-stone-400 font-mono">
                {activeVenue.amenities?.length || 0} Assets Monitored
              </span>
            </div>

            <div className="border border-stone-200 rounded-xl divide-y divide-stone-100 overflow-hidden bg-white">
              {activeVenue.amenities?.map((am) => (
                <div key={am.id} className="p-3 flex items-start justify-between gap-3 hover:bg-stone-50 transition">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-medium text-slate-900 text-sm">{am.name}</span>
                      <StatusBadge status={am.health} type="amenity" size="sm" />
                    </div>
                    {am.defectDescription ? (
                      <p className="text-xs text-red-600 mt-1 font-mono bg-red-50 p-1 rounded">
                        ⚠ Defect: {am.defectDescription}
                      </p>
                    ) : (
                      <p className="text-[11px] text-stone-400 mt-0.5">
                        Last Inspected: {new Date(am.lastInspectedAt).toLocaleDateString('en-IN')}
                      </p>
                    )}
                  </div>

                  <span className="text-xs font-mono text-stone-400 uppercase">
                    {am.type}
                  </span>
                </div>
              ))}
            </div>
          </div>

          {/* Today's Schedule Timeline */}
          <div>
            <h3 className="text-xs uppercase font-bold tracking-wider text-stone-500 mb-2">
              Today's Schedule & Reservations
            </h3>
            {activeVenue.upcomingSchedule?.length > 0 ? (
              <div className="space-y-2">
                {activeVenue.upcomingSchedule.map((slot) => (
                  <div
                    key={slot.id}
                    className="flex items-center justify-between p-3 rounded-lg border border-stone-200 bg-stone-50/40 text-xs"
                  >
                    <div>
                      <span className="font-semibold text-slate-900 block">{slot.title}</span>
                      <span className="text-stone-500">{slot.organizer}</span>
                    </div>
                    <div className="text-right">
                      <span className="font-mono font-semibold text-slate-800 bg-white px-2 py-0.5 rounded border border-stone-200 block">
                        {slot.startTime} – {slot.endTime}
                      </span>
                      <span className="text-[10px] uppercase font-bold text-stone-400 mt-0.5 block">
                        {slot.type === 'class' ? 'Timetable Lecture' : 'Booking'}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-xs text-stone-400 italic">No further schedule slots booked for today.</p>
            )}
          </div>
        </div>

        {/* Footer Actions — INTEGRATION POINT WITH WHAT-IF SIMULATOR */}
        <div className="p-5 border-t border-stone-200 bg-stone-50 flex flex-col sm:flex-row items-center gap-3">
          {/* Report Issue Action */}
          <button
            onClick={() => setReportModalVenue(activeVenue)}
            className="w-full sm:w-auto px-4 py-2.5 border border-stone-300 hover:border-stone-400 text-slate-800 text-xs font-semibold rounded-lg bg-white hover:bg-stone-100 transition shadow-xs"
          >
            Report Defect / Issue 🛠️
          </button>

          {/* Connected Action to What-If Module */}
          <Link
            to={`/what-if?scenario=${whatIfScenarioType}&target=${activeVenue.code}`}
            onClick={() => selectVenue(null)}
            className="w-full sm:flex-1 px-4 py-2.5 bg-slate-900 hover:bg-slate-800 text-amber-400 text-xs font-semibold rounded-lg text-center transition shadow-xs flex items-center justify-center gap-1.5"
          >
            <span>Simulate Impact in What-If</span>
            <span>⚡</span>
          </Link>
        </div>
      </div>
    </div>
  );
}

