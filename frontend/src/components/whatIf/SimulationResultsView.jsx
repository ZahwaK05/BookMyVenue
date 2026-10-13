/**
 * @file SimulationResultsView.jsx
 * @description Summary KPI metrics and multi-stage progress indicator for What-If Simulation results.
 */

import { useWhatIfSimulation } from '../../context/WhatIfContext';
import MetricCard from '../common/MetricCard';

export default function SimulationResultsView() {
  const { simulationResults, simulationState, simulationStep, resetSimulation } = useWhatIfSimulation();

  if (simulationState === 'simulating') {
    return (
      <div className="bg-white border border-stone-200 rounded-xl p-8 text-center space-y-5 shadow-xs">
        <div className="w-12 h-12 rounded-full border-4 border-amber-500 border-t-transparent animate-spin mx-auto" />
        <div>
          <h3 className="font-bold font-serif text-lg text-slate-900">
            Evaluating Campus Infrastructure Constraints
          </h3>
          <p className="text-xs text-stone-500 mt-1">
            Running hypothetical disruption solver against class timetables and live Digital Twin state.
          </p>
        </div>

        {/* 3-Step Progress Indicator */}
        <div className="max-w-md mx-auto space-y-2 text-left pt-2">
          <div className={`p-2.5 rounded-lg border text-xs flex items-center gap-2.5 ${simulationStep >= 1 ? 'border-amber-500 bg-amber-50/50 text-slate-900 font-medium' : 'border-stone-200 text-stone-400'}`}>
            <span>{simulationStep > 1 ? '✓' : '1.'}</span>
            <span>Step 1: Identifying affected lectures and approved event bookings...</span>
          </div>

          <div className={`p-2.5 rounded-lg border text-xs flex items-center gap-2.5 ${simulationStep >= 2 ? 'border-amber-500 bg-amber-50/50 text-slate-900 font-medium' : 'border-stone-200 text-stone-400'}`}>
            <span>{simulationStep > 2 ? '✓' : '2.'}</span>
            <span>Step 2: Checking Digital Twin equipment telemetry across candidate rooms...</span>
          </div>

          <div className={`p-2.5 rounded-lg border text-xs flex items-center gap-2.5 ${simulationStep >= 3 ? 'border-amber-500 bg-amber-50/50 text-slate-900 font-medium' : 'border-stone-200 text-stone-400'}`}>
            <span>{simulationStep > 3 ? '✓' : '3.'}</span>
            <span>Step 3: Calculating compatibility scores and ranking alternative reallocations...</span>
          </div>
        </div>
      </div>
    );
  }

  if (!simulationResults) return null;

  const { metrics, scenario } = simulationResults;

  if (metrics.totalAffectedSessions === 0) {
    return (
      <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-8 text-center space-y-3">
        <span className="text-4xl block">🛡️</span>
        <h3 className="text-lg font-bold font-serif text-emerald-950">
          Zero Operational Disruptions Detected
        </h3>
        <p className="text-xs text-emerald-800 max-w-md mx-auto leading-relaxed">
          No scheduled lectures or approved bookings intersect with this disruption window.
          The campus schedule can sustain this scenario without any venue reallocations.
        </p>
        <button
          onClick={resetSimulation}
          className="mt-2 text-xs font-semibold text-emerald-900 bg-white border border-emerald-300 px-3 py-1.5 rounded-lg hover:bg-emerald-100 transition"
        >
          Reset Simulation
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Scenario Context Banner */}
      <div className="bg-slate-900 text-white rounded-xl p-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 shadow-xs">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-xs font-mono font-bold bg-amber-400 text-slate-950 px-2 py-0.5 rounded">
              {scenario.type}
            </span>
            <span className="text-xs text-stone-300">
              Target: <strong>{scenario.scopeLabel}</strong>
            </span>
          </div>
          <p className="text-xs text-stone-400 mt-1">
            Window: {scenario.startTime} – {scenario.endTime} on {scenario.targetDate} • Reason: {scenario.reason}
          </p>
        </div>

        <button
          onClick={resetSimulation}
          className="text-xs font-semibold text-stone-300 hover:text-white bg-slate-800 hover:bg-slate-700 px-3 py-1.5 rounded-lg border border-slate-700 transition"
        >
          Reset Scenario
        </button>
      </div>

      {/* KPI Impact Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
        <MetricCard
          title="Total Disrupted"
          value={metrics.totalAffectedSessions}
          subtitle="Classes & Events"
          badgeColor="red"
          icon="⚠️"
        />
        <MetricCard
          title="Lectures Impacted"
          value={metrics.affectedTimetableClasses}
          subtitle="Regular courses"
          badgeColor="purple"
          icon="🎓"
        />
        <MetricCard
          title="Events Impacted"
          value={metrics.affectedApprovedBookings}
          subtitle="Club & department"
          badgeColor="amber"
          icon="📅"
        />
        <MetricCard
          title="Auto-Resolvable"
          value={metrics.autoReallocatableCount}
          subtitle="Alternative found"
          badgeText={`${Math.round((metrics.autoReallocatableCount / metrics.totalAffectedSessions) * 100)}%`}
          badgeColor="emerald"
          icon="✅"
        />
        <MetricCard
          title="Unresolvable"
          value={metrics.unresolvableCriticalCount}
          subtitle="Needs Admin Action"
          badgeColor={metrics.unresolvableCriticalCount > 0 ? 'red' : 'emerald'}
          icon="🚨"
        />
      </div>
    </div>
  );
}

