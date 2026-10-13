/**
 * @file FloorPlanBlueprint.jsx
 * @description Blueprint grid rendering all rooms on the selected floor with status filters.
 */

import { useState } from 'react';
import { useDigitalTwin } from '../../context/DigitalTwinContext';
import VenueTwinCard from './VenueTwinCard';

export default function FloorPlanBlueprint() {
  const { activeFloor, selectVenue } = useDigitalTwin();
  const [filterType, setFilterType] = useState('ALL');

  if (!activeFloor || !activeFloor.venues) {
    return (
      <div className="bg-white border border-stone-200 rounded-xl p-8 text-center text-stone-500">
        No floor data available.
      </div>
    );
  }

  const filteredVenues = activeFloor.venues.filter((venue) => {
    if (filterType === 'ALL') return true;
    if (filterType === 'CLASSROOM') return venue.type === 'classroom';
    if (filterType === 'HALL') return venue.type === 'hall' || venue.type === 'conference_hall' || venue.type === 'auditorium';
    if (filterType === 'DEGRADED') return venue.operationalStatus !== 'OPERATIONAL';
    return true;
  });

  return (
    <div className="space-y-4">
      {/* Sub-bar: Filter buttons & floor summary */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 bg-white p-3.5 rounded-xl border border-stone-200">
        <div className="flex items-center gap-1.5 flex-wrap">
          <span className="text-xs font-semibold text-stone-400 mr-1">Filter View:</span>
          {[
            { id: 'ALL', label: 'All Venues' },
            { id: 'CLASSROOM', label: 'Classrooms' },
            { id: 'HALL', label: 'Seminar Halls / Conf' },
            { id: 'DEGRADED', label: '⚠️ Equipment Issues' },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setFilterType(tab.id)}
              className={`px-2.5 py-1 text-xs font-medium rounded-md transition ${
                filterType === tab.id
                  ? 'bg-slate-900 text-white font-semibold'
                  : 'bg-stone-100 text-stone-600 hover:bg-stone-200'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        <div className="text-xs text-stone-500 font-mono">
          Showing <span className="font-bold text-slate-900">{filteredVenues.length}</span> of {activeFloor.venues.length} rooms
        </div>
      </div>

      {/* Blueprint Rooms Grid */}
      {filteredVenues.length === 0 ? (
        <div className="bg-white border border-stone-200 rounded-xl p-12 text-center text-stone-500">
          <p className="text-sm">No venues match the selected filter on {activeFloor.name}.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredVenues.map((venue) => (
            <VenueTwinCard
              key={venue.id}
              venue={venue}
              onInspect={selectVenue}
            />
          ))}
        </div>
      )}
    </div>
  );
}

