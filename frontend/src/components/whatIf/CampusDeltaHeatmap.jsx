/**
 * @file CampusDeltaHeatmap.jsx
 * @description Visual campus absorption map showing which blocks shed load and which absorb reallocated sessions.
 */

import { useWhatIfSimulation } from '../../context/WhatIfContext';

export default function CampusDeltaHeatmap() {
  const { simulationResults } = useWhatIfSimulation();

  if (!simulationResults) return null;

  const { scenario, reallocations } = simulationResults;

  // Compute block-level reallocations
  const reallocationsByBlock = {
    AB1: 0,
    AB2: 0,
    MB: 0,
    CIR: 0,
  };

  reallocations.forEach((r) => {
    if (r.recommendedAlternative?.blockCode) {
      reallocationsByBlock[r.recommendedAlternative.blockCode] =
        (reallocationsByBlock[r.recommendedAlternative.blockCode] || 0) + 1;
    }
  });

  return (
    <div className="bg-white border border-stone-200 rounded-xl p-5 shadow-xs space-y-4">
      <div>
        <h3 className="text-base font-bold font-serif text-slate-900">
          Campus Load Redistribution Map
        </h3>
        <p className="text-xs text-stone-500">
          Visual delta of disrupted source blocks vs destination absorption zones.
        </p>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {/* AB1 */}
        <div
          className={`p-3.5 rounded-xl border text-xs flex flex-col justify-between ${
            scenario.scopeId === 'AB1' || scenario.scopeId?.startsWith('AB1')
              ? 'border-red-300 bg-red-50/50'
              : 'border-stone-200 bg-stone-50'
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="font-mono font-bold text-slate-900">AB1 (Academic B1)</span>
            {scenario.scopeId === 'AB1' && (
              <span className="text-[10px] bg-red-100 text-red-800 font-bold px-1.5 py-0.5 rounded">
                DISRUPTED
              </span>
            )}
          </div>
          <p className="text-stone-500 text-[11px] mt-2">
            Disrupted Sessions: <strong className="text-red-700">{reallocations.length}</strong>
          </p>
        </div>

        {/* AB2 */}
        <div
          className={`p-3.5 rounded-xl border text-xs flex flex-col justify-between ${
            reallocationsByBlock.AB2 > 0
              ? 'border-emerald-300 bg-emerald-50/50'
              : 'border-stone-200 bg-stone-50'
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="font-mono font-bold text-slate-900">AB2 (Academic B2)</span>
            {reallocationsByBlock.AB2 > 0 && (
              <span className="text-[10px] bg-emerald-100 text-emerald-800 font-bold px-1.5 py-0.5 rounded">
                ABSORPTION ZONE
              </span>
            )}
          </div>
          <p className="text-stone-500 text-[11px] mt-2">
            Absorbed Reallocations: <strong className="text-emerald-700">+{reallocationsByBlock.AB2}</strong>
          </p>
        </div>

        {/* MB */}
        <div
          className={`p-3.5 rounded-xl border text-xs flex flex-col justify-between ${
            reallocationsByBlock.MB > 0
              ? 'border-emerald-300 bg-emerald-50/50'
              : 'border-stone-200 bg-stone-50'
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="font-mono font-bold text-slate-900">MB (Mechanical)</span>
            {reallocationsByBlock.MB > 0 && (
              <span className="text-[10px] bg-emerald-100 text-emerald-800 font-bold px-1.5 py-0.5 rounded">
                ABSORBING
              </span>
            )}
          </div>
          <p className="text-stone-500 text-[11px] mt-2">
            Absorbed Reallocations: <strong className="text-slate-800">+{reallocationsByBlock.MB}</strong>
          </p>
        </div>

        {/* CIR */}
        <div
          className={`p-3.5 rounded-xl border text-xs flex flex-col justify-between ${
            scenario.scopeId === 'CIR-Auditorium'
              ? 'border-red-300 bg-red-50/50'
              : reallocationsByBlock.CIR > 0
              ? 'border-emerald-300 bg-emerald-50/50'
              : 'border-stone-200 bg-stone-50'
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="font-mono font-bold text-slate-900">CIR (Auditoriums)</span>
            {reallocationsByBlock.CIR > 0 && (
              <span className="text-[10px] bg-emerald-100 text-emerald-800 font-bold px-1.5 py-0.5 rounded">
                ABSORBING
              </span>
            )}
          </div>
          <p className="text-stone-500 text-[11px] mt-2">
            Status: <strong className="text-slate-800">Normal</strong>
          </p>
        </div>
      </div>
    </div>
  );
}

