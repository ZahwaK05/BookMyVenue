/**
 * @file ScenarioPresets.jsx
 * @description One-click demonstration scenario presets for quick evaluation.
 */

import { useWhatIfSimulation } from '../../context/WhatIfContext';

export default function ScenarioPresets() {
  const { presets, applyPreset, scenarioDraft } = useWhatIfSimulation();

  return (
    <div className="bg-white border border-stone-200 rounded-xl p-4 shadow-xs">
      <div className="flex items-center justify-between mb-3">
        <span className="text-xs uppercase font-bold text-stone-500 tracking-wider">
          Quick Demonstration Presets
        </span>
        <span className="text-[11px] text-amber-700 font-mono bg-amber-50 border border-amber-200 px-2 py-0.5 rounded">
          One-Click Test Scenarios
        </span>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2.5">
        {presets.map((preset) => {
          const isActive =
            scenarioDraft.type === preset.payload.type &&
            scenarioDraft.scopeId === preset.payload.scopeId;

          return (
            <button
              key={preset.id}
              onClick={() => applyPreset(preset)}
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

