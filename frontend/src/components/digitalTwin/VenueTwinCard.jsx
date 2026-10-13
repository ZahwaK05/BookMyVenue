/**
 * @file VenueTwinCard.jsx
 * @description Blueprint-styled interactive card representing an individual room in the Digital Twin.
 */

import StatusBadge from '../common/StatusBadge';

export default function VenueTwinCard({ venue, onInspect }) {
  if (!venue) return null;

  // Left accent stripe based on operational status
  const stripeColor = {
    OPERATIONAL: 'bg-emerald-500',
    DEGRADED: 'bg-amber-500',
    MAINTENANCE: 'bg-orange-500',
    OFFLINE: 'bg-red-500',
  }[venue.operationalStatus] || 'bg-stone-400';

  const typeLabels = {
    classroom: 'Classroom',
    hall: 'Seminar Hall',
    conference_hall: 'Conference Room',
    lab: 'Computing / Lab',
    auditorium: 'Auditorium',
  };

  return (
    <div
      onClick={() => onInspect(venue.id)}
      className="bg-white rounded-xl border border-stone-200 overflow-hidden shadow-xs hover:shadow-md transition-all cursor-pointer flex flex-col justify-between group hover:border-slate-450"
    >
      <div>
        {/* Top Header bar with status stripe */}
        <div className="flex items-stretch border-b border-stone-100">
          <div className={`w-2 ${stripeColor}`} />
          <div className="flex-1 p-3.5 flex items-center justify-between">
            <div>
              <div className="flex items-center gap-2">
                <span className="font-mono text-sm font-bold text-slate-900 group-hover:text-blue-700 transition">
                  {venue.code}
                </span>
                <span className="text-[10px] uppercase font-semibold text-stone-500 bg-stone-100 px-1.5 py-0.5 rounded">
                  {typeLabels[venue.type] || venue.type}
                </span>
              </div>
              <h4 className="text-xs text-stone-600 mt-0.5 font-medium truncate max-w-[200px]">
                {venue.name}
              </h4>
            </div>

            <div className="flex flex-col items-end gap-1">
              <span className="text-xs font-semibold text-slate-700 bg-stone-50 px-2 py-0.5 rounded border border-stone-200">
                👥 {venue.capacity}
              </span>
            </div>
          </div>
        </div>

        {/* Status & Occupancy Badges */}
        <div className="p-3.5 space-y-3">
          <div className="flex items-center justify-between gap-1 flex-wrap">
            <StatusBadge status={venue.operationalStatus} type="operational" size="sm" />
            <StatusBadge status={venue.occupancyState} type="occupancy" size="sm" />
          </div>

          {/* Current Activity Box */}
          <div className="bg-stone-50 rounded-lg p-2.5 border border-stone-200 text-xs">
            {venue.currentOccupant ? (
              <div>
                <span className="text-[10px] font-bold uppercase tracking-wider text-indigo-700 block">
                  ● Currently Occupied
                </span>
                <p className="font-medium text-slate-900 truncate mt-0.5">
                  {venue.currentOccupant.title}
                </p>
                <div className="flex items-center justify-between text-[11px] text-stone-500 mt-1">
                  <span>{venue.currentOccupant.host}</span>
                  <span>Ends: {venue.currentOccupant.endsAt}</span>
                </div>
              </div>
            ) : (
              <div className="text-stone-500 text-xs flex items-center justify-between">
                <span>Room currently vacant</span>
                <span className="text-emerald-600 font-semibold text-[11px]">Available</span>
              </div>
            )}
          </div>

          {/* Equipment Status Pills */}
          <div>
            <span className="text-[10px] uppercase font-bold text-stone-400 tracking-wider block mb-1.5">
              Equipment Telemetry
            </span>
            <div className="flex items-center gap-1.5 flex-wrap">
              {venue.amenities &&
                venue.amenities.map((am) => {
                  const isDefective = am.health === 'DEFECTIVE';
                  const isFunctional = am.health === 'FUNCTIONAL';

                  const icon = am.name.toLowerCase().includes('projector')
                    ? '📽️'
                    : am.name.toLowerCase().includes('audio') || am.name.toLowerCase().includes('mic')
                    ? '🎙️'
                    : am.name.toLowerCase().includes('air')
                    ? '❄️'
                    : '📋';

                  return (
                    <span
                      key={am.id}
                      title={`${am.name}: ${am.health}${am.defectDescription ? ` (${am.defectDescription})` : ''}`}
                      className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[11px] font-mono border ${
                        isDefective
                          ? 'bg-red-50 text-red-700 border-red-300 font-bold'
                          : isFunctional
                          ? 'bg-stone-100 text-slate-700 border-stone-200'
                          : 'bg-stone-100 text-stone-400 border-stone-200'
                      }`}
                    >
                      <span>{icon}</span>
                      {isDefective && <span className="text-red-600 font-bold">!</span>}
                    </span>
                  );
                })}
            </div>
          </div>
        </div>
      </div>

      {/* Footer / Action */}
      <div className="p-3 border-t border-stone-100 bg-stone-50/50 flex items-center justify-between text-xs">
        <div className="flex items-center gap-1.5">
          <span className="text-stone-400">Twin Health:</span>
          <span
            className={`font-mono font-bold ${
              venue.healthScore >= 90
                ? 'text-emerald-700'
                : venue.healthScore >= 70
                ? 'text-amber-700'
                : 'text-red-700'
            }`}
          >
            {venue.healthScore}%
          </span>
        </div>

        <button
          onClick={(e) => {
            e.stopPropagation();
            onInspect(venue.id);
          }}
          className="text-xs font-semibold text-blue-600 hover:text-blue-800 hover:underline"
        >
          Inspect Specs →
        </button>
      </div>
    </div>
  );
}

