/**
 * @file CampusMacroOverview.jsx
 * @description Macro overview of the 4 campus blocks with interactive SVG health score gauges and outage simulation triggers.
 */

import { Link } from 'react-router-dom';
import { useDigitalTwin } from '../../context/DigitalTwinContext';
import StatusBadge from '../common/StatusBadge';

export default function CampusMacroOverview() {
  const { campusGraph, selectedBlockId, selectBlock } = useDigitalTwin();

  if (!campusGraph) return null;

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
      {campusGraph.blocks.map((block) => {
        const isSelected = selectedBlockId === block.code;
        const healthColor =
          block.overallHealthScore >= 90
            ? 'text-emerald-600 border-emerald-500'
            : block.overallHealthScore >= 75
            ? 'text-amber-600 border-amber-500'
            : 'text-red-600 border-red-500';

        return (
          <div
            key={block.code}
            onClick={() => selectBlock(block.code)}
            className={`bg-white rounded-xl border p-5 transition-all cursor-pointer flex flex-col justify-between shadow-xs hover:shadow-md ${
              isSelected
                ? 'border-amber-600 ring-2 ring-amber-500/20 bg-amber-50/20'
                : 'border-stone-200 hover:border-stone-400'
            }`}
          >
            <div>
              <div className="flex items-center justify-between mb-3">
                <span className="font-mono text-sm font-bold px-2 py-0.5 rounded bg-slate-900 text-amber-400">
                  {block.code}
                </span>
                <StatusBadge status={block.isOperational ? 'OPERATIONAL' : 'OFFLINE'} size="sm" />
              </div>

              <h3 className="font-serif text-lg font-bold text-slate-900 leading-snug">
                {block.name}
              </h3>
              <p className="text-xs text-stone-500 mt-1 line-clamp-2">
                {block.description}
              </p>

              {/* Metrics Grid */}
              <div className="grid grid-cols-2 gap-2 mt-4 pt-4 border-t border-stone-100 text-xs">
                <div>
                  <span className="text-stone-400 block text-[11px]">Floors & Venues</span>
                  <span className="font-semibold text-slate-800">
                    {block.floors.length} Floors • {block.totalVenuesCount} Venues
                  </span>
                </div>
                <div>
                  <span className="text-stone-400 block text-[11px]">Occupancy</span>
                  <span className="font-semibold text-slate-800">
                    {block.currentOccupancyRate}% Active
                  </span>
                </div>
              </div>
            </div>

            {/* Health Score Gauge & What-If link */}
            <div className="mt-5 pt-3 border-t border-stone-100 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className={`w-8 h-8 rounded-full border-2 flex items-center justify-center font-bold text-xs ${healthColor}`}>
                  {block.overallHealthScore}%
                </div>
                <div className="flex flex-col text-[11px] leading-tight">
                  <span className="font-semibold text-slate-800">Twin Health</span>
                  <span className="text-stone-400">Score</span>
                </div>
              </div>

              {/* Connected Action to What-If Module */}
              <Link
                to={`/what-if?scenario=BLOCK_UNAVAILABLE&target=${block.code}`}
                onClick={(e) => e.stopPropagation()}
                title={`Simulate what happens if ${block.code} suffers a disruption`}
                className="text-[11px] font-semibold text-amber-800 hover:text-amber-950 bg-amber-50 hover:bg-amber-100 border border-amber-300 px-2 py-1 rounded transition flex items-center gap-1"
              >
                Simulate Outage ⚡
              </Link>
            </div>
          </div>
        );
      })}
    </div>
  );
}

