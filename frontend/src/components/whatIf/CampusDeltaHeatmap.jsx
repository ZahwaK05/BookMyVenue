/**
 * @file CampusDeltaHeatmap.jsx
 * @description Visual campus absorption map showing which blocks shed load and which absorb reallocated sessions.
 */

import { useState, useEffect } from 'react';
import { useWhatIfSimulation } from '../../context/WhatIfContext';
import { blocks as apiBlocks } from '../../api';

export default function CampusDeltaHeatmap() {
  const { simulationResults } = useWhatIfSimulation();
  const [campusBlocks, setCampusBlocks] = useState([]);

  useEffect(() => {
    let isCancelled = false;
    apiBlocks
      .list()
      .then((data) => {
        if (!isCancelled && Array.isArray(data)) setCampusBlocks(data);
      })
      .catch(() => {});
    return () => {
      isCancelled = true;
    };
  }, []);

  if (!simulationResults) return null;

  const { scenario, reallocations } = simulationResults;

  // Compute block-level reallocations
  const reallocationsByBlock = {};
  reallocations.forEach((r) => {
    const blockKey = r.recommendedAlternative?.blockCode || r.recommendedAlternative?.venueName || 'Other';
    reallocationsByBlock[blockKey] = (reallocationsByBlock[blockKey] || 0) + 1;
  });

  const displayBlocks = campusBlocks.length > 0 ? campusBlocks : [
    { id: 'b-a', name: 'Block A' },
    { id: 'b-b', name: 'Block B' },
    { id: 'b-c', name: 'Block C' },
    { id: 'b-d', name: 'Block D' },
  ];

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
        {displayBlocks.map((b) => {
          const isTargetDisrupted =
            scenario.scopeId === b.id ||
            scenario.scopeLabel?.includes(b.name);
          const absorbedCount = reallocationsByBlock[b.name] || reallocationsByBlock[b.id] || 0;

          let cardStyle = 'border-stone-200 bg-stone-50';
          let statusBadge = <span className="text-[10px] text-stone-500 font-medium">Normal</span>;

          if (isTargetDisrupted) {
            cardStyle = 'border-red-300 bg-red-50/60 ring-1 ring-red-200';
            statusBadge = (
              <span className="text-[10px] bg-red-100 text-red-800 font-bold px-1.5 py-0.5 rounded">
                DISRUPTED
              </span>
            );
          } else if (absorbedCount > 0) {
            cardStyle = 'border-emerald-300 bg-emerald-50/60 ring-1 ring-emerald-200';
            statusBadge = (
              <span className="text-[10px] bg-emerald-100 text-emerald-800 font-bold px-1.5 py-0.5 rounded">
                ABSORBING (+{absorbedCount})
              </span>
            );
          }

          return (
            <div
              key={b.id || b.name}
              className={`p-3.5 rounded-xl border text-xs flex flex-col justify-between ${cardStyle}`}
            >
              <div className="flex items-center justify-between mb-2">
                <span className="font-mono font-bold text-slate-900">{b.name}</span>
                {statusBadge}
              </div>
              <p className="text-stone-500 text-[11px]">
                {isTargetDisrupted ? (
                  <span>
                    Disrupted Sessions: <strong className="text-red-700">{reallocations.length}</strong>
                  </span>
                ) : (
                  <span>
                    Absorbed: <strong className="text-slate-800">{absorbedCount} reallocations</strong>
                  </span>
                )}
              </p>
            </div>
          );
        })}
      </div>
    </div>
  );
}
