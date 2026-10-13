/**
 * @file WhatIfDashboard.jsx
 * @description Main orchestrator page for Module 2 — What-If Simulation Dashboard.
 */

import { useWhatIfSimulation } from '../../context/WhatIfContext';
import ScenarioPresets from './ScenarioPresets';
import ScenarioBuilderForm from './ScenarioBuilderForm';
import SimulationResultsView from './SimulationResultsView';
import ReallocationMatrix from './ReallocationMatrix';
import CampusDeltaHeatmap from './CampusDeltaHeatmap';

export default function WhatIfDashboard() {
  const { simulationState, error, runSimulation } = useWhatIfSimulation();

  return (
    <div className="min-h-screen bg-stone-50 pb-16">
      {/* Header */}
      <div className="bg-white border-b border-stone-200 py-8 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-amber-500" />
              <span className="text-xs font-mono font-bold uppercase tracking-wider text-stone-500">
                Decision Support Sandbox
              </span>
            </div>
            <h1 className="text-3xl font-extrabold font-serif text-slate-900 mt-1">
              What-If Disruption Simulation Sandbox
            </h1>
            <p className="text-sm text-stone-600 mt-1 max-w-2xl leading-relaxed">
              Hypothetically simulate building power cutoffs, equipment defects, and capacity surges.
              The engine identifies impacted bookings and suggests conflict-free alternative venues.
            </p>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 mt-6 space-y-6">
        {/* Error banner if solver failed */}
        {error && (
          <div className="bg-red-50 border border-red-200 rounded-xl p-4 text-xs text-red-800 flex items-center justify-between">
            <span>⚠️ {error}</span>
            <button
              onClick={() => runSimulation()}
              className="px-3 py-1 bg-red-600 text-white rounded font-bold hover:bg-red-700"
            >
              Retry Solver
            </button>
          </div>
        )}

        {/* 1. Quick Demonstration Presets */}
        <ScenarioPresets />

        {/* 2. Main Workspace Grid: Scenario Form (Left) & Simulation Results (Right) */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          {/* Left Column: Scenario Builder (5 cols) */}
          <div className="lg:col-span-5 space-y-6">
            <ScenarioBuilderForm />
          </div>

          {/* Right Column: Results & Reallocation Proposals (7 cols) */}
          <div className="lg:col-span-7 space-y-6">
            {simulationState === 'idle' ? (
              <div className="bg-white border border-stone-200 rounded-xl p-10 text-center space-y-4 shadow-xs">
                <div className="w-16 h-16 bg-amber-50 border border-amber-200 text-amber-700 rounded-full flex items-center justify-center text-3xl mx-auto">
                  🔮
                </div>
                <h3 className="font-serif font-bold text-lg text-slate-900">
                  Ready to Run Simulation Experiment
                </h3>
                <p className="text-xs text-stone-500 max-w-md mx-auto leading-relaxed">
                  Configure your disruption parameters on the left or select a quick demonstration preset above.
                  Click <strong>Run What-If Simulation Experiment</strong> to analyze schedule collisions and view automated room alternatives.
                </p>

                <div className="pt-4 border-t border-stone-100 max-w-sm mx-auto text-left text-xs text-stone-600 space-y-2">
                  <div className="flex items-center gap-2">
                    <span className="text-emerald-600 font-bold">1.</span>
                    <span>Scans class timetable for lecture overlap</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-emerald-600 font-bold">2.</span>
                    <span>Validates equipment health in the Digital Twin</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-emerald-600 font-bold">3.</span>
                    <span>Matches capacity, type, and proximity</span>
                  </div>
                </div>
              </div>
            ) : (
              <>
                <SimulationResultsView />
                <CampusDeltaHeatmap />
                <ReallocationMatrix />
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

