/**
 * @file ScenarioBuilderForm.jsx
 * @description Dynamic What-If configuration form with cascading dropdowns
 * (Block -> Venue -> Amenity) populated from live campus API endpoints.
 */

import { useState, useEffect } from 'react';
import { useWhatIfSimulation } from '../../context/WhatIfContext';
import { blocks as apiBlocks, venues as apiVenues, amenities as apiAmenities } from '../../api';

const SCENARIO_TYPES = [
  { id: 'VENUE_UNAVAILABLE', label: '🚪 Venue Closure', blurb: 'Simulate single classroom or hall shutdown' },
  { id: 'BLOCK_UNAVAILABLE', label: '🏢 Block Closure', blurb: 'Complete building closure or power cutoff' },
  { id: 'AMENITY_FAILURE', label: '🛠️ Equipment Failure', blurb: 'Projector, audio, or AC defect in venue' },
];

export default function ScenarioBuilderForm() {
  const { scenarioDraft, setDraftField, runSimulation, simulationState } = useWhatIfSimulation();

  const [blocksList, setBlocksList] = useState([]);
  const [venuesList, setVenuesList] = useState([]);
  const [amenitiesList, setAmenitiesList] = useState([]);
  const [loadingMeta, setLoadingMeta] = useState(true);

  // Filter venue selection by block
  const [selectedBlockFilter, setSelectedBlockFilter] = useState('');

  // Fetch campus metadata from live backend
  useEffect(() => {
    let isCancelled = false;
    async function loadCampusMeta() {
      try {
        setLoadingMeta(true);
        const [blks, vens, amens] = await Promise.all([
          apiBlocks.list().catch(() => []),
          apiVenues.list().catch(() => []),
          apiAmenities.list().catch(() => []),
        ]);

        if (isCancelled) return;
        setBlocksList(blks || []);
        setVenuesList(vens || []);
        setAmenitiesList(amens || []);

        // Initialize default scope if empty or not a valid UUID
        const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
        if (!UUID_REGEX.test(scenarioDraft.scopeId || '')) {
          if (scenarioDraft.type === 'BLOCK_UNAVAILABLE' && blks?.length > 0) {
            setDraftField('scopeId', blks[0].id);
            setDraftField('scopeLabel', blks[0].name);
          } else if (vens?.length > 0) {
            setDraftField('scopeId', vens[0].id);
            setDraftField('scopeLabel', `${vens[0].name} (${vens[0].block_name || 'Campus'})`);
            if (amens?.length > 0 && !scenarioDraft.amenityId) {
              setDraftField('amenityId', amens[0].id);
            }
          }
        }
      } catch (err) {
        console.error('[ScenarioBuilderForm] Error loading campus metadata:', err);
      } finally {
        if (!isCancelled) setLoadingMeta(false);
      }
    }
    loadCampusMeta();
    return () => {
      isCancelled = true;
    };
  }, []);

  // When scenario type changes, ensure valid scopeId for the new type
  function handleTypeChange(newType) {
    setDraftField('type', newType);
    if (newType === 'BLOCK_UNAVAILABLE') {
      const targetBlock = blocksList.find((b) => b.id === scenarioDraft.scopeId) || blocksList[0];
      if (targetBlock) {
        setDraftField('scopeId', targetBlock.id);
        setDraftField('scopeLabel', targetBlock.name);
        setDraftField('reason', `Scheduled electrical maintenance and building shutdown for ${targetBlock.name}.`);
      }
    } else if (newType === 'VENUE_UNAVAILABLE') {
      const targetVenue = venuesList.find((v) => v.id === scenarioDraft.scopeId) || venuesList[0];
      if (targetVenue) {
        setDraftField('scopeId', targetVenue.id);
        setDraftField('scopeLabel', `${targetVenue.name} (${targetVenue.block_name})`);
        setDraftField('reason', `Emergency maintenance in ${targetVenue.name}.`);
      }
    } else if (newType === 'AMENITY_FAILURE') {
      const targetVenue = venuesList.find((v) => v.id === scenarioDraft.scopeId) || venuesList[0];
      const targetAmenity = amenitiesList.find((a) => a.id === scenarioDraft.amenityId) || amenitiesList[0];
      if (targetVenue) {
        setDraftField('scopeId', targetVenue.id);
        if (targetAmenity) {
          setDraftField('amenityId', targetAmenity.id);
          setDraftField('scopeLabel', `${targetVenue.name} — ${targetAmenity.name} Failure`);
          setDraftField('reason', `Hardware failure: ${targetAmenity.name} defective in ${targetVenue.name}.`);
        } else {
          setDraftField('scopeLabel', `${targetVenue.name} — Equipment Defect`);
        }
      }
    }
  }

  // Filtered venues based on block filter
  const filteredVenues = selectedBlockFilter
    ? venuesList.filter((v) => v.block_id === selectedBlockFilter || v.block_name === selectedBlockFilter)
    : venuesList;

  // Available amenities: prefer venue's specific amenities if present, else campus amenities catalog
  const currentVenue = venuesList.find((v) => v.id === scenarioDraft.scopeId);
  const availableAmenities =
    currentVenue?.amenities?.length > 0 ? currentVenue.amenities : amenitiesList;

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
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
          {SCENARIO_TYPES.map((t) => {
            const isSelected = scenarioDraft.type === t.id;
            return (
              <button
                type="button"
                key={t.id}
                onClick={() => handleTypeChange(t.id)}
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

      {/* 2. Target Scope Details (Cascading Block -> Venue -> Amenity Dropdowns) */}
      <div className="bg-stone-50 p-4 rounded-xl border border-stone-200 space-y-3.5 text-xs">
        <label className="block font-bold text-slate-700 uppercase tracking-wider">
          2. Target Infrastructure Scope (Live Campus Data)
        </label>

        {loadingMeta ? (
          <p className="text-stone-400 italic py-2">Loading campus blocks, venues, and amenities…</p>
        ) : (
          <>
            {/* Scenario: BLOCK CLOSURE */}
            {scenarioDraft.type === 'BLOCK_UNAVAILABLE' && (
              <div>
                <label className="block font-medium text-slate-700 mb-1">Target Campus Block</label>
                <select
                  value={scenarioDraft.scopeId}
                  onChange={(e) => {
                    const blk = blocksList.find((b) => b.id === e.target.value);
                    setDraftField('scopeId', e.target.value);
                    setDraftField('scopeLabel', blk ? blk.name : 'Selected Block');
                    setDraftField('reason', `Scheduled electrical maintenance and building shutdown for ${blk?.name || 'block'}.`);
                  }}
                  className="w-full border border-stone-300 rounded-lg p-2.5 bg-white text-slate-800 font-medium focus:outline-none focus:ring-1 focus:ring-amber-500"
                >
                  <option value="">-- Choose a Campus Block --</option>
                  {blocksList.map((b) => (
                    <option key={b.id} value={b.id}>
                      {b.name}
                    </option>
                  ))}
                </select>
              </div>
            )}

            {/* Scenario: VENUE CLOSURE or AMENITY FAILURE */}
            {(scenarioDraft.type === 'VENUE_UNAVAILABLE' || scenarioDraft.type === 'AMENITY_FAILURE') && (
              <div className="space-y-3">
                {/* Optional Block Filter */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block font-medium text-slate-600 mb-1">Filter by Block (Optional)</label>
                    <select
                      value={selectedBlockFilter}
                      onChange={(e) => setSelectedBlockFilter(e.target.value)}
                      className="w-full border border-stone-300 rounded-lg p-2 bg-white text-slate-800 focus:outline-none"
                    >
                      <option value="">All Academic Blocks</option>
                      {blocksList.map((b) => (
                        <option key={b.id} value={b.id}>
                          {b.name}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block font-medium text-slate-700 mb-1">Target Venue *</label>
                    <select
                      value={scenarioDraft.scopeId}
                      onChange={(e) => {
                        const ven = venuesList.find((v) => v.id === e.target.value);
                        setDraftField('scopeId', e.target.value);
                        if (ven) {
                          setDraftField('scopeLabel', `${ven.name} (${ven.block_name})`);
                          // If amenity failure, pick first amenity of this venue if available
                          if (scenarioDraft.type === 'AMENITY_FAILURE') {
                            const firstAm = ven.amenities?.[0] || amenitiesList[0];
                            if (firstAm) {
                              setDraftField('amenityId', firstAm.id);
                              setDraftField('reason', `Hardware defect in ${firstAm.name} inside ${ven.name}.`);
                            }
                          } else {
                            setDraftField('reason', `Emergency maintenance / room shutdown for ${ven.name}.`);
                          }
                        }
                      }}
                      className="w-full border border-stone-300 rounded-lg p-2 bg-white text-slate-800 font-medium focus:outline-none"
                    >
                      <option value="">-- Choose a Venue --</option>
                      {filteredVenues.map((v) => (
                        <option key={v.id} value={v.id}>
                          {v.name} ({v.block_name} • Cap: {v.capacity} • {v.type})
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                {/* Amenity Picker for AMENITY_FAILURE */}
                {scenarioDraft.type === 'AMENITY_FAILURE' && (
                  <div>
                    <label className="block font-medium text-slate-700 mb-1">Failing Equipment / Amenity *</label>
                    <select
                      value={scenarioDraft.amenityId || ''}
                      onChange={(e) => {
                        const am = availableAmenities.find((a) => a.id === e.target.value);
                        setDraftField('amenityId', e.target.value);
                        if (am) {
                          setDraftField(
                            'scopeLabel',
                            `${currentVenue?.name || 'Venue'} — ${am.name} Defect`
                          );
                          setDraftField('reason', `Reported failure in ${am.name}. Multimedia / facility unavailable.`);
                        }
                      }}
                      className="w-full border border-stone-300 rounded-lg p-2.5 bg-white text-slate-800 font-medium focus:outline-none"
                    >
                      <option value="">-- Choose Failing Amenity --</option>
                      {availableAmenities.map((a) => (
                        <option key={a.id} value={a.id}>
                          {a.name}
                        </option>
                      ))}
                    </select>
                  </div>
                )}
              </div>
            )}
          </>
        )}
      </div>

      {/* 3. Time Window & Date Picker */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
        <div>
          <label className="block font-bold text-slate-700 uppercase tracking-wider mb-1">
            Simulation Date *
          </label>
          <input
            type="date"
            value={scenarioDraft.targetDate || ''}
            onChange={(e) => setDraftField('targetDate', e.target.value)}
            className="w-full border border-stone-300 rounded-lg p-2.5 text-slate-800 font-medium bg-white focus:outline-none focus:ring-1 focus:ring-amber-500"
            required
          />
        </div>

        <div>
          <label className="block font-bold text-slate-700 uppercase tracking-wider mb-1">
            Start Time
          </label>
          <input
            type="time"
            value={scenarioDraft.startTime || '09:00'}
            onChange={(e) => setDraftField('startTime', e.target.value)}
            className="w-full border border-stone-300 rounded-lg p-2.5 text-slate-800 bg-white"
          />
        </div>

        <div>
          <label className="block font-bold text-slate-700 uppercase tracking-wider mb-1">
            End Time
          </label>
          <input
            type="time"
            value={scenarioDraft.endTime || '17:00'}
            onChange={(e) => setDraftField('endTime', e.target.value)}
            className="w-full border border-stone-300 rounded-lg p-2.5 text-slate-800 bg-white"
          />
        </div>
      </div>

      {/* 4. Rationale */}
      <div className="text-xs">
        <label className="block font-bold text-slate-700 uppercase tracking-wider mb-1">
          Operational Context / Disruption Reason
        </label>
        <input
          type="text"
          value={scenarioDraft.reason || ''}
          onChange={(e) => setDraftField('reason', e.target.value)}
          placeholder="e.g. Electrical transformer overhaul, HVAC maintenance, or projector optical defect"
          className="w-full border border-stone-300 rounded-lg p-2.5 text-slate-800 bg-white"
        />
      </div>

      {/* Submit Action */}
      <div className="pt-2">
        <button
          type="submit"
          disabled={isSimulating || loadingMeta || !scenarioDraft.scopeId}
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
