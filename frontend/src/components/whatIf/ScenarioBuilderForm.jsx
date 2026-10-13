/**
 * @file ScenarioBuilderForm.jsx
 * @description Form allowing administrators to configure custom hypothetical campus disruptions.
 */

import { useWhatIfSimulation } from '../../context/WhatIfContext';

const SCENARIO_TYPES = [
  { id: 'BLOCK_UNAVAILABLE', label: '🏢 Block Outage', blurb: 'Complete building closure or power cutoff' },
  { id: 'VENUE_UNAVAILABLE', label: '🚪 Room Closure', blurb: 'Specific classroom or hall shutdown' },
  { id: 'AMENITY_FAILURE', label: '🛠️ Equipment Failure', blurb: 'Projector, audio, or AC defect in room' },
  { id: 'DEMAND_SURGE', label: '📈 Demand Surge', blurb: 'Unplanned requirement for multiple rooms' },
];

export default function ScenarioBuilderForm() {
  const { scenarioDraft, setDraftField, runSimulation, simulationState } = useWhatIfSimulation();

  function handleSubmit(e) {
    e.preventDefault();
    runSimulation();
  }

  const isSimulating = simulationState === 'simulating';

  return (
    <form onSubmit={handleSubmit} className="bg-white border border-stone-200 rounded-xl p-5 shadow-xs space-y-5">
      <div>
        <h3 className="text-base font-bold font-serif text-slate-900">
          Configure Disruption Scenario
        </h3>
        <p className="text-xs text-stone-500 mt-0.5">
          Define hypothetical operational constraints without affecting live bookings.
        </p>
      </div>

      {/* 1. Scenario Type Selection */}
      <div>
        <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">
          1. Select Disruption Type
        </label>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
          {SCENARIO_TYPES.map((t) => {
            const isSelected = scenarioDraft.type === t.id;
            return (
              <button
                type="button"
                key={t.id}
                onClick={() => setDraftField('type', t.id)}
                className={`p-3 rounded-lg border text-left transition ${
                  isSelected
                    ? 'border-slate-900 bg-slate-900 text-white shadow-xs'
                    : 'border-stone-200 bg-stone-50 hover:bg-stone-100 text-slate-800'
                }`}
              >
                <span className="font-bold text-xs block">{t.label}</span>
                <span className={`text-[10px] mt-1 block leading-tight ${isSelected ? 'text-stone-300' : 'text-stone-500'}`}>
                  {t.blurb}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {/* 2. Target Scope Details */}
      <div className="bg-stone-50 p-3.5 rounded-lg border border-stone-200 space-y-3 text-xs">
        <label className="block font-bold text-slate-700 uppercase tracking-wider">
          2. Target Infrastructure Scope
        </label>

        {scenarioDraft.type === 'BLOCK_UNAVAILABLE' && (
          <div>
            <label className="block font-medium text-slate-600 mb-1">Target Campus Block</label>
            <select
              value={scenarioDraft.scopeId}
              onChange={(e) => {
                setDraftField('scopeId', e.target.value);
                setDraftField('scopeLabel', `Academic Block (${e.target.value})`);
              }}
              className="w-full border border-stone-300 rounded-lg p-2.5 bg-white text-slate-800 focus:outline-none focus:ring-1 focus:ring-amber-500"
            >
              <option value="AB1">Academic Block 1 (AB1 - 4 Floors, 11 Venues)</option>
              <option value="AB2">Academic Block 2 (AB2 - 3 Floors, 8 Venues)</option>
              <option value="MB">Mechanical Block (MB - 2 Floors, 5 Venues)</option>
              <option value="CIR">Corporate & Industry Relations (CIR - 2 Floors, 4 Venues)</option>
            </select>
          </div>
        )}

        {(scenarioDraft.type === 'VENUE_UNAVAILABLE' || scenarioDraft.type === 'AMENITY_FAILURE') && (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block font-medium text-slate-600 mb-1">Target Room Code</label>
              <select
                value={scenarioDraft.scopeId}
                onChange={(e) => {
                  setDraftField('scopeId', e.target.value);
                  setDraftField('scopeLabel', `Room ${e.target.value}`);
                }}
                className="w-full border border-stone-300 rounded-lg p-2.5 bg-white text-slate-800 focus:outline-none"
              >
                <option value="AB1-204">AB1-204 (Classroom, Cap: 60 - Has Proj Issue)</option>
                <option value="AB1-101">AB1-101 (Classroom, Cap: 60)</option>
                <option value="AB1-Seminar-1">AB1-Seminar-1 (Seminar Hall, Cap: 150)</option>
                <option value="CIR-Auditorium">CIR-Auditorium (Central Auditorium, Cap: 400)</option>
                <option value="AB2-Conf-1">AB2-Conf-1 (Conference Hall, Cap: 80)</option>
                <option value="MB-001">MB-001 (Advanced Manufacturing Studio, Cap: 60)</option>
              </select>
            </div>

            {scenarioDraft.type === 'AMENITY_FAILURE' && (
              <div>
                <label className="block font-medium text-slate-600 mb-1">Failed Amenity Type</label>
                <select
                  defaultValue="Projector"
                  className="w-full border border-stone-300 rounded-lg p-2.5 bg-white text-slate-800 focus:outline-none"
                >
                  <option value="Projector">4K Laser Projector Unit</option>
                  <option value="Audio System">JBL Wireless Audio Array</option>
                  <option value="Air Conditioning">Centralized AC Unit</option>
                  <option value="Podium Mic">Podium Microphone Rig</option>
                </select>
              </div>
            )}
          </div>
        )}

        {scenarioDraft.type === 'DEMAND_SURGE' && (
          <div className="grid grid-cols-3 gap-2">
            <div>
              <label className="block font-medium text-slate-600 mb-1">Surge Venue Type</label>
              <select
                value={scenarioDraft.surgeParams?.venueType || 'classroom'}
                onChange={(e) =>
                  setDraftField('surgeParams', { ...scenarioDraft.surgeParams, venueType: e.target.value })
                }
                className="w-full border border-stone-300 rounded-lg p-2 bg-white"
              >
                <option value="classroom">Classrooms</option>
                <option value="hall">Seminar Halls</option>
                <option value="lab">Computer Labs</option>
              </select>
            </div>

            <div>
              <label className="block font-medium text-slate-600 mb-1">Needed Rooms</label>
              <input
                type="number"
                min="1"
                max="10"
                value={scenarioDraft.surgeParams?.neededCount || 3}
                onChange={(e) =>
                  setDraftField('surgeParams', {
                    ...scenarioDraft.surgeParams,
                    neededCount: parseInt(e.target.value, 10) || 1,
                  })
                }
                className="w-full border border-stone-300 rounded-lg p-2 bg-white"
              />
            </div>

            <div>
              <label className="block font-medium text-slate-600 mb-1">Min Capacity</label>
              <input
                type="number"
                min="20"
                step="10"
                value={scenarioDraft.surgeParams?.minCapacity || 60}
                onChange={(e) =>
                  setDraftField('surgeParams', {
                    ...scenarioDraft.surgeParams,
                    minCapacity: parseInt(e.target.value, 10) || 40,
                  })
                }
                className="w-full border border-stone-300 rounded-lg p-2 bg-white"
              />
            </div>
          </div>
        )}
      </div>

      {/* 3. Time Window */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
        <div>
          <label className="block font-bold text-slate-700 uppercase tracking-wider mb-1">
            Date
          </label>
          <input
            type="date"
            value={scenarioDraft.targetDate}
            onChange={(e) => setDraftField('targetDate', e.target.value)}
            className="w-full border border-stone-300 rounded-lg p-2.5 text-slate-800"
          />
        </div>

        <div>
          <label className="block font-bold text-slate-700 uppercase tracking-wider mb-1">
            Start Time
          </label>
          <input
            type="time"
            value={scenarioDraft.startTime}
            onChange={(e) => setDraftField('startTime', e.target.value)}
            className="w-full border border-stone-300 rounded-lg p-2.5 text-slate-800"
          />
        </div>

        <div>
          <label className="block font-bold text-slate-700 uppercase tracking-wider mb-1">
            End Time
          </label>
          <input
            type="time"
            value={scenarioDraft.endTime}
            onChange={(e) => setDraftField('endTime', e.target.value)}
            className="w-full border border-stone-300 rounded-lg p-2.5 text-slate-800"
          />
        </div>
      </div>

      {/* 4. Rationale */}
      <div className="text-xs">
        <label className="block font-bold text-slate-700 uppercase tracking-wider mb-1">
          Operational Rationale / Context
        </label>
        <input
          type="text"
          value={scenarioDraft.reason}
          onChange={(e) => setDraftField('reason', e.target.value)}
          placeholder="e.g. Scheduled electrical transformer overhaul, fumigation, or chiller repair"
          className="w-full border border-stone-300 rounded-lg p-2.5 text-slate-800"
        />
      </div>

      {/* Submit Action */}
      <div className="pt-2">
        <button
          type="submit"
          disabled={isSimulating}
          className="w-full py-3 bg-slate-900 hover:bg-slate-800 text-amber-400 font-bold text-sm rounded-lg transition shadow-xs flex items-center justify-center gap-2 disabled:opacity-60"
        >
          {isSimulating ? (
            <>
              <span className="w-3 h-3 rounded-full border-2 border-amber-400 border-t-transparent animate-spin" />
              <span>Running What-If Simulation Solver…</span>
            </>
          ) : (
            <>
              <span>▶ Run What-If Simulation Experiment</span>
            </>
          )}
        </button>
      </div>
    </form>
  );
}

