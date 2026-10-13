/**
 * @file BlockHierarchyViewer.jsx
 * @description Floor level selector and navigation tabs for the selected campus block.
 */

import { useDigitalTwin } from '../../context/DigitalTwinContext';

export default function BlockHierarchyViewer() {
  const { activeBlock, selectedFloorNumber, selectFloor } = useDigitalTwin();

  if (!activeBlock) return null;

  return (
    <div className="bg-white border border-stone-200 rounded-xl p-4 shadow-xs">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 mb-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="font-mono text-xs font-bold px-2 py-0.5 rounded bg-slate-900 text-amber-400">
              {activeBlock.code}
            </span>
            <h2 className="text-xl font-bold font-serif text-slate-900">
              {activeBlock.name} — Floor Blueprint
            </h2>
          </div>
          <p className="text-xs text-stone-500 mt-1">
            Select a floor level to inspect individual smart classrooms, seminar halls, and equipment states.
          </p>
        </div>

        <div className="text-xs font-mono text-stone-500 bg-stone-50 border border-stone-200 px-3 py-1.5 rounded-lg">
          Building Health: <span className="font-bold text-slate-900">{activeBlock.overallHealthScore}%</span> • Venues: <span className="font-bold text-slate-900">{activeBlock.totalVenuesCount}</span>
        </div>
      </div>

      {/* Floor Selection Tabs */}
      <div className="flex items-center gap-2 overflow-x-auto pb-1 border-t border-stone-100 pt-3">
        {activeBlock.floors.map((floor) => {
          const isSelected = selectedFloorNumber === floor.floorNumber;
          const venueCount = floor.venues.length;
          const hasDegraded = floor.venues.some((v) => v.operationalStatus === 'DEGRADED' || v.operationalStatus === 'MAINTENANCE');

          return (
            <button
              key={floor.id}
              onClick={() => selectFloor(floor.floorNumber)}
              className={`flex-1 sm:flex-initial min-w-[140px] px-4 py-2.5 rounded-lg border text-left transition ${
                isSelected
                  ? 'bg-slate-900 text-white border-slate-900 shadow-xs'
                  : 'bg-stone-50 text-slate-800 border-stone-200 hover:bg-stone-100'
              }`}
            >
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold uppercase tracking-wider">
                  {floor.name}
                </span>
                {hasDegraded && (
                  <span className="w-2 h-2 rounded-full bg-amber-400" title="Contains degraded equipment" />
                )}
              </div>
              <p className={`text-[11px] mt-1 ${isSelected ? 'text-stone-300' : 'text-stone-500'}`}>
                {venueCount} {venueCount === 1 ? 'Venue' : 'Venues'}
              </p>
            </button>
          );
        })}
      </div>
    </div>
  );
}

