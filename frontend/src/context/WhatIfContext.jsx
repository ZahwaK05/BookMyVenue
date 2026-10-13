/* eslint-disable react-refresh/only-export-components */
/**
 * @file WhatIfContext.jsx
 * @description React Context managing What-If Simulation scenario drafting, multi-stage execution, and reallocation decisions.
 */

import { createContext, useContext, useState, useCallback } from 'react';
import { useSearchParams } from 'react-router-dom';
import { runWhatIfSimulation, MOCK_SIMULATION_PRESETS } from '../services/mockWhatIfService';

const WhatIfContext = createContext(null);

const DEFAULT_SCENARIO_DRAFT = {
  type: 'BLOCK_UNAVAILABLE',
  scopeId: 'AB1',
  scopeLabel: 'Academic Block 1 (AB1)',
  targetDate: new Date().toISOString().split('T')[0],
  startTime: '10:00',
  endTime: '14:00',
  reason: 'Scheduled electrical transformer maintenance and power cutoff.',
  surgeParams: {
    venueType: 'classroom',
    neededCount: 3,
    minCapacity: 60,
    requiredAmenities: ['Projector', 'Audio System'],
  },
};

export function WhatIfProvider({ children }) {
  const [searchParams] = useSearchParams();

  // Lazy initializer to read query parameters once on mount without causing cascading renders
  const [scenarioDraft, setScenarioDraft] = useState(() => {
    const scenarioType = searchParams.get('scenario');
    const target = searchParams.get('target');
    const initial = { ...DEFAULT_SCENARIO_DRAFT };
    if (scenarioType) initial.type = scenarioType;
    if (target) {
      initial.scopeId = target;
      if (scenarioType === 'BLOCK_UNAVAILABLE') {
        initial.scopeLabel = `Academic Block (${target})`;
        initial.reason = `Physical block ${target} closed for scheduled maintenance.`;
      } else if (scenarioType === 'AMENITY_FAILURE') {
        initial.scopeLabel = `Venue ${target} — Projector Failure`;
        initial.reason = `Reported optical hardware failure in ${target}. Slides unavailable.`;
      } else if (scenarioType === 'VENUE_UNAVAILABLE') {
        initial.scopeLabel = `Venue (${target})`;
        initial.reason = `Emergency repair in ${target}.`;
      }
    }
    return initial;
  });

  const [simulationState, setSimulationState] = useState('idle'); // 'idle' | 'simulating' | 'completed' | 'error'
  const [simulationStep, setSimulationStep] = useState(1);
  const [simulationResults, setSimulationResults] = useState(null);
  const [error, setError] = useState(null);
  const [reallocationDecisions, setReallocationDecisions] = useState({});

  const setDraftField = useCallback((field, value) => {
    setScenarioDraft((prev) => ({ ...prev, [field]: value }));
  }, []);

  const applyPreset = useCallback((preset) => {
    setScenarioDraft({ ...preset.payload });
    setSimulationState('idle');
    setSimulationResults(null);
    setReallocationDecisions({});
  }, []);

  const executeSimulation = useCallback(async (customDraft = scenarioDraft) => {
    try {
      setSimulationState('simulating');
      setError(null);
      setSimulationStep(1);

      // Simulate Step 1: Timetable collision check
      await new Promise((r) => setTimeout(r, 200));
      setSimulationStep(2);

      // Simulate Step 2: Twin infrastructure state inspection
      await new Promise((r) => setTimeout(r, 250));
      setSimulationStep(3);

      // Simulate Step 3: Constraint solver & alternative ranking
      const report = await runWhatIfSimulation(customDraft);
      setSimulationResults(report);
      setSimulationState('completed');

      // Initialize default decisions
      const initialDecisions = {};
      report.reallocations.forEach((r) => {
        if (r.recommendedAlternative) {
          initialDecisions[r.bookingId] = {
            status: 'pending_review',
            selectedVenueCode: r.recommendedAlternative.venueCode,
          };
        } else {
          initialDecisions[r.bookingId] = {
            status: 'requires_admin',
            selectedVenueCode: null,
          };
        }
      });
      setReallocationDecisions(initialDecisions);
    } catch (err) {
      console.error('[WhatIfContext] Simulation error:', err);
      setError('Simulation failed to evaluate constraints. Please adjust inputs and try again.');
      setSimulationState('error');
    }
  }, [scenarioDraft]);

  const acceptReallocation = useCallback((bookingId, venueCode) => {
    setReallocationDecisions((prev) => ({
      ...prev,
      [bookingId]: {
        status: 'accepted',
        selectedVenueCode: venueCode,
      },
    }));
  }, []);

  const chooseDifferentRoom = useCallback((bookingId, newVenueCode) => {
    setReallocationDecisions((prev) => ({
      ...prev,
      [bookingId]: {
        status: 'accepted',
        selectedVenueCode: newVenueCode,
      },
    }));
  }, []);

  const flagForAdmin = useCallback((bookingId) => {
    setReallocationDecisions((prev) => ({
      ...prev,
      [bookingId]: {
        status: 'flagged_admin',
        selectedVenueCode: null,
      },
    }));
  }, []);

  const resetSimulation = useCallback(() => {
    setSimulationState('idle');
    setSimulationResults(null);
    setReallocationDecisions({});
  }, []);

  const value = {
    scenarioDraft,
    simulationState,
    simulationStep,
    simulationResults,
    error,
    reallocationDecisions,
    presets: MOCK_SIMULATION_PRESETS,
    setDraftField,
    applyPreset,
    runSimulation: executeSimulation,
    acceptReallocation,
    chooseDifferentRoom,
    flagForAdmin,
    resetSimulation,
  };

  return <WhatIfContext.Provider value={value}>{children}</WhatIfContext.Provider>;
}

export function useWhatIfSimulation() {
  const ctx = useContext(WhatIfContext);
  if (!ctx) throw new Error('useWhatIfSimulation must be used within a WhatIfProvider');
  return ctx;
}
