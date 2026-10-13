/**
 * @file DigitalTwinDashboard.jsx
 * @description Main orchestrator page for Module 1 — Digital Twin Campus Dashboard.
 */

import { useDigitalTwin } from '../../context/DigitalTwinContext';
import MetricCard from '../common/MetricCard';
import AsyncStateWrapper from '../common/AsyncStateWrapper';
import TemporalTimeSlider from './TemporalTimeSlider';
import CampusMacroOverview from './CampusMacroOverview';
import BlockHierarchyViewer from './BlockHierarchyViewer';
import FloorPlanBlueprint from './FloorPlanBlueprint';
import VenueTwinDrawer from './VenueTwinDrawer';
import IssueReportModal from './IssueReportModal';

export default function DigitalTwinDashboard() {
  const { campusGraph, loading, error, refreshTwinState } = useDigitalTwin();

  const telemetry = campusGraph?.telemetry || {
    totalVenues: 0,
    operationalVenues: 0,
    activeClassesCount: 0,
    activeEventsCount: 0,
    openIssuesCount: 0,
    campusUtilizationRate: 0,
  };

  return (
    <div className="min-h-screen bg-stone-50 pb-16">
      {/* Page Header */}
      <div className="bg-white border-b border-stone-200 py-8 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse" />
              <span className="text-xs font-mono font-bold uppercase tracking-wider text-stone-500">
                Amrita Infrastructure Telemetry
              </span>
            </div>
            <h1 className="text-3xl font-extrabold font-serif text-slate-900 mt-1">
              Digital Twin Campus Dashboard
            </h1>
            <p className="text-sm text-stone-600 mt-1 max-w-2xl leading-relaxed">
              Real-time virtual representation of campus blocks, floors, venues, and equipment telemetry.
              Synchronized with class timetables and live defect logs.
            </p>
          </div>

          <button
            onClick={() => refreshTwinState()}
            className="self-start md:self-auto px-4 py-2 bg-stone-100 hover:bg-stone-200 text-slate-800 text-xs font-semibold rounded-lg border border-stone-300 transition flex items-center gap-1.5"
          >
            <span>🔄 Re-sync Twin Telemetry</span>
          </button>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 mt-6 space-y-6">
        <AsyncStateWrapper loading={loading} error={error} onRetry={refreshTwinState}>
          {/* 1. Macro Campus Telemetry Cards */}
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
            <MetricCard
              title="Tracked Venues"
              value={telemetry.totalVenues}
              subtitle="Across 4 main blocks"
              icon="🏛️"
              badgeColor="blue"
            />
            <MetricCard
              title="Operational"
              value={telemetry.operationalVenues}
              subtitle="Full service ready"
              badgeText={`${Math.round((telemetry.operationalVenues / (telemetry.totalVenues || 1)) * 100)}%`}
              badgeColor="emerald"
              icon="✅"
            />
            <MetricCard
              title="Classes Running"
              value={telemetry.activeClassesCount}
              subtitle="Timetable lectures"
              icon="🎓"
              badgeColor="purple"
            />
            <MetricCard
              title="Approved Events"
              value={telemetry.activeEventsCount}
              subtitle="Club & admin events"
              icon="📅"
              badgeColor="amber"
            />
            <MetricCard
              title="Open Defect Issues"
              value={telemetry.openIssuesCount}
              subtitle="Equipment maintenance"
              icon="🛠️"
              badgeColor={telemetry.openIssuesCount > 0 ? 'red' : 'emerald'}
            />
            <MetricCard
              title="Campus Utilization"
              value={`${telemetry.campusUtilizationRate}%`}
              subtitle="Active room density"
              icon="📊"
              badgeColor="blue"
            />
          </div>

          {/* 2. Temporal Mode Lens (Current / Predicted / Historical) */}
          <TemporalTimeSlider />

          {/* 3. Block Selection Grid (4 Campus Blocks) */}
          <div>
            <div className="flex items-center justify-between mb-3">
              <div>
                <h2 className="text-base font-bold font-serif text-slate-900">
                  Campus Blocks
                </h2>
                <p className="text-xs text-stone-500">
                  Click a block to inspect its floor plans and venues. Use "Simulate Outage" to evaluate disruptions.
                </p>
              </div>
            </div>
            <CampusMacroOverview />
          </div>

          {/* 4. Floor Selector & Blueprint Room Matrix */}
          <div className="space-y-4 pt-2">
            <BlockHierarchyViewer />
            <FloorPlanBlueprint />
          </div>

          {/* 5. Slide-over Room Detail Inspector Drawer */}
          <VenueTwinDrawer />

          {/* 6. Issue Report Modal */}
          <IssueReportModal />
        </AsyncStateWrapper>
      </div>
    </div>
  );
}

