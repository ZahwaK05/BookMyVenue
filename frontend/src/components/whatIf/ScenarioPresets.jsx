/**
 * @file ScenarioPresets.jsx
 * @description One-click demonstration scenario presets that automatically resolve to live campus IDs.
 */

import { useState, useEffect } from 'react';
import { useWhatIfSimulation } from '../../context/WhatIfContext';
import { blocks as apiBlocks, venues as apiVenues, amenities as apiAmenities } from '../../api';

export default function ScenarioPresets() {
  const { presets, applyPreset, scenarioDraft } = useWhatIfSimulation();
  const [liveBlocks, setLiveBlocks] = useState([]);
  const [liveVenues, setLiveVenues] = useState([]);
  const [liveAmenities, setLiveAmenities] = useState([]);

  useEffect(() => {
    let isCancelled = false;
    Promise.all([
      apiBlocks.list().catch(() => []),
      apiVenues.list().catch(() => []),
      apiAmenities.list().catch(() => []),
    ]).then(([blks, vens, amens]) => {
      if (!isCancelled) {
        setLiveBlocks(blks || []);
        setLiveVenues(vens || []);
        setLiveAmenities(amens || []);
      }
    });
    return () => {
      isCancelled = true;
    };
  }, []);

  function handlePresetClick(preset) {
    const payload = { ...preset.payload };

    // Auto-populate live IDs if preset has empty scope
    if (!payload.scopeId) {
      if (payload.type === 'BLOCK_UNAVAILABLE' && liveBlocks.length > 0) {
        payload.scopeId = liveBlocks[0].id;
        payload.scopeLabel = liveBlocks[0].name;
        payload.reason = `Scheduled power maintenance and building shutdown for ${liveBlocks[0].name}.`;
      } else if (payload.type === 'VENUE_UNAVAILABLE' && liveVenues.length > 0) {
        payload.scopeId = liveVenues[0].id;
        payload.scopeLabel = `${liveVenues[0].name} (${liveVenues[0].block_name})`;
        payload.reason = `Emergency HVAC / infrastructure repair in ${liveVenues[0].name}.`;
      } else if (payload.type === 'AMENITY_FAILURE' && liveVenues.length > 0) {
        payload.scopeId = liveVenues[0].id;
        const targetAmenity = liveAmenities[0];
        if (targetAmenity) {
          payload.amenityId = targetAmenity.id;
          payload.scopeLabel = `${liveVenues[0].name} — ${targetAmenity.name} Failure`;
          payload.reason = `Hardware defect in ${targetAmenity.name} inside ${liveVenues[0].name}.`;
        }
      }
    }

    applyPreset({ ...preset, payload });
  }

  return (
    <div className="bg-white border border-stone-200 rounded-xl p-4 shadow-xs">
      <div className="flex items-center justify-between mb-3">
        <span className="text-xs uppercase font-bold text-stone-500 tracking-wider">
          Quick Demonstration Presets
        </span>
        <span className="text-[11px] text-amber-700 font-mono bg-amber-50 border border-amber-200 px-2 py-0.5 rounded">
          One-Click Live Campus Scenarios
        </span>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2.5">
        {presets.map((preset) => {
          const isActive =
            scenarioDraft.type === preset.payload.type &&
            scenarioDraft.scopeId === preset.payload.scopeId;

          return (
            <button
              type="button"
              key={preset.id}
              onClick={() => handlePresetClick(preset)}
              className={`text-left p-3 rounded-lg border transition ${
                isActive
                  ? 'border-amber-600 bg-amber-50/60 ring-1 ring-amber-500'
                  : 'border-stone-200 bg-stone-50/60 hover:bg-stone-100'
              }`}
            >
              <h4 className="text-xs font-bold text-slate-900 leading-snug">
                {preset.name}
              </h4>
              <p className="text-[11px] text-stone-500 mt-1 line-clamp-2">
                {preset.description}
              </p>
            </button>
          );
        })}
      </div>
    </div>
  );
}
