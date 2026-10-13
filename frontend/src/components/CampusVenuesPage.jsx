// frontend/src/components/CampusVenuesPage.jsx
import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { blocks as apiBlocks, venues as apiVenues } from '../api';

export default function CampusVenuesPage() {
  const [blocksList, setBlocksList] = useState([]);
  const [selectedBlock, setSelectedBlock] = useState('');
  const [floorsList, setFloorsList] = useState([]);
  const [selectedFloor, setSelectedFloor] = useState('');
  const [typeFilter, setTypeFilter] = useState('');
  const [capacityFilter, setCapacityFilter] = useState('');
  const [venuesList, setVenuesList] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // 1. Fetch blocks on mount
  useEffect(() => {
    async function loadBlocks() {
      try {
        const blks = await apiBlocks.list();
        setBlocksList(blks || []);
      } catch (err) {
        console.error('Failed to load blocks:', err);
        setError('Could not connect to campus server. Please ensure backend is running.');
      }
    }
    loadBlocks();
  }, []);

  // 2. Fetch floors whenever selectedBlock changes
  useEffect(() => {
    if (!selectedBlock) {
      setFloorsList([]);
      setSelectedFloor('');
      return;
    }

    async function loadFloors() {
      try {
        const res = await apiBlocks.floors(selectedBlock);
        setFloorsList(res?.floors || []);
        setSelectedFloor('');
      } catch (err) {
        console.error('Failed to load floors:', err);
      }
    }
    loadFloors();
  }, [selectedBlock]);

  // 3. Fetch venues whenever filters change
  useEffect(() => {
    async function loadVenues() {
      setLoading(true);
      setError('');
      try {
        const data = await apiVenues.list({
          block_id: selectedBlock || undefined,
          floor_id: selectedFloor || undefined,
          type: typeFilter || undefined,
          min_capacity: capacityFilter ? Number(capacityFilter) : undefined,
        });
        setVenuesList(data || []);
      } catch (err) {
        console.error('Failed to load venues:', err);
        setError(err.message || 'Error fetching venue data.');
      } finally {
        setLoading(false);
      }
    }
    loadVenues();
  }, [selectedBlock, selectedFloor, typeFilter, capacityFilter]);

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* Page Title */}
      <div className="flex flex-col md:flex-row md:items-center justify-between pb-6 border-b border-stone-200 gap-4">
        <div>
          <h1 className="text-3xl font-serif font-bold text-slate-900">
            Campus Venues
          </h1>
          <p className="text-stone-500 text-sm mt-1">
            Browse Amrita university classrooms, seminar halls, and conference auditoriums
          </p>
        </div>
        <div className="flex items-center gap-3">
          <Link
            to="/recommend"
            className="inline-flex items-center gap-2 bg-amber-600 hover:bg-amber-500 text-white text-xs font-semibold px-4 py-2.5 rounded-lg shadow-sm transition"
          >
            <span>✨ AI Venue Finder</span>
          </Link>
        </div>
      </div>

      {/* Filter Controls */}
      <div className="bg-white rounded-xl border border-stone-200 p-4 mt-6 shadow-sm grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Block Filter */}
        <div>
          <label className="block text-xs font-semibold text-stone-700 uppercase tracking-wider mb-1.5">
            Campus Block
          </label>
          <select
            value={selectedBlock}
            onChange={(e) => setSelectedBlock(e.target.value)}
            className="w-full text-sm border border-stone-300 rounded-lg p-2.5 bg-stone-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-amber-500/50"
          >
            <option value="">All Campus Blocks</option>
            {blocksList.map((b) => (
              <option key={b.id} value={b.id}>
                {b.name} ({b.venue_count} venues)
              </option>
            ))}
          </select>
        </div>

        {/* Floor Filter */}
        <div>
          <label className="block text-xs font-semibold text-stone-700 uppercase tracking-wider mb-1.5">
            Floor Level
          </label>
          <select
            value={selectedFloor}
            onChange={(e) => setSelectedFloor(e.target.value)}
            disabled={!selectedBlock}
            className="w-full text-sm border border-stone-300 rounded-lg p-2.5 bg-stone-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-amber-500/50 disabled:opacity-50"
          >
            <option value="">All Floors</option>
            {floorsList.map((f) => (
              <option key={f.id} value={f.id}>
                Floor {f.floor_number} ({f.venue_count} venues)
              </option>
            ))}
          </select>
        </div>

        {/* Venue Type */}
        <div>
          <label className="block text-xs font-semibold text-stone-700 uppercase tracking-wider mb-1.5">
            Venue Classification
          </label>
          <select
            value={typeFilter}
            onChange={(e) => setTypeFilter(e.target.value)}
            className="w-full text-sm border border-stone-300 rounded-lg p-2.5 bg-stone-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-amber-500/50"
          >
            <option value="">All Classifications</option>
            <option value="classroom">Classroom</option>
            <option value="hall">Seminar Hall</option>
            <option value="conference_hall">Conference Auditorium</option>
          </select>
        </div>

        {/* Capacity */}
        <div>
          <label className="block text-xs font-semibold text-stone-700 uppercase tracking-wider mb-1.5">
            Min Seating Capacity
          </label>
          <input
            type="number"
            min="0"
            placeholder="e.g. 50"
            value={capacityFilter}
            onChange={(e) => setCapacityFilter(e.target.value)}
            className="w-full text-sm border border-stone-300 rounded-lg p-2.5 bg-stone-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-amber-500/50"
          />
        </div>
      </div>

      {error && (
        <div className="mt-6 p-4 bg-rose-50 border border-rose-200 text-rose-700 text-sm rounded-xl">
          {error}
        </div>
      )}

      {/* Venues Grid */}
      <div className="mt-8">
        {loading ? (
          <div className="text-center py-16 text-stone-500 font-mono text-sm">
            Fetching campus infrastructure data...
          </div>
        ) : venuesList.length === 0 ? (
          <div className="text-center py-16 bg-white rounded-xl border border-stone-200">
            <span className="text-4xl block mb-2">🏢</span>
            <p className="text-stone-600 font-medium">No venues match the selected filters.</p>
            <button
              onClick={() => {
                setSelectedBlock('');
                setSelectedFloor('');
                setTypeFilter('');
                setCapacityFilter('');
              }}
              className="mt-3 text-xs text-amber-700 font-semibold underline"
            >
              Reset all filters
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {venuesList.map((v) => (
              <div
                key={v.id}
                className="bg-white rounded-xl border border-stone-200 overflow-hidden shadow-sm hover:shadow-md transition flex flex-col justify-between"
              >
                <div>
                  {/* Card Header Banner */}
                  <div className="bg-gradient-to-r from-slate-900 to-slate-800 p-4 text-white flex items-start justify-between">
                    <div>
                      <span className="text-[10px] font-mono uppercase tracking-wider text-amber-400 block mb-0.5">
                        {v.block_name} • Floor {v.floor_number}
                      </span>
                      <h2 className="text-lg font-bold font-serif">{v.name}</h2>
                    </div>
                    <span className="text-xs px-2 py-0.5 rounded bg-white/10 text-stone-200 font-medium capitalize">
                      {v.type.replace('_', ' ')}
                    </span>
                  </div>

                  <div className="p-5">
                    {/* Capacity & Dean Approval Badges */}
                    <div className="flex flex-wrap items-center gap-2 mb-4">
                      <span className="text-xs bg-stone-100 text-stone-700 px-2.5 py-1 rounded-full font-medium">
                        👥 Capacity: {v.capacity}
                      </span>

                      {v.requires_dean_approval ? (
                        <span className="text-xs bg-amber-50 text-amber-800 border border-amber-200 px-2 py-0.5 rounded-full font-medium" title="Requires Dean approval for student bookings">
                          🏛️ Dean Review
                        </span>
                      ) : (
                        <span className="text-xs bg-indigo-50 text-indigo-800 border border-indigo-200 px-2 py-0.5 rounded-full font-medium">
                          📋 Block Head Approval
                        </span>
                      )}

                      {v.open_issues > 0 && (
                        <span className="text-xs bg-rose-50 text-rose-700 border border-rose-200 px-2 py-0.5 rounded-full font-medium">
                          ⚠️ {v.open_issues} Open Issue{v.open_issues > 1 ? 's' : ''}
                        </span>
                      )}
                    </div>

                    {/* Amenities list */}
                    <div>
                      <span className="text-[11px] font-semibold uppercase tracking-wider text-stone-500 block mb-1.5">
                        Amenities Available:
                      </span>
                      <div className="flex flex-wrap gap-1.5">
                        {v.amenities && v.amenities.length > 0 ? (
                          v.amenities.map((a) => (
                            <span
                              key={a.id}
                              className="text-xs bg-stone-100 text-stone-700 px-2 py-0.5 rounded"
                            >
                              ✓ {a.name}
                            </span>
                          ))
                        ) : (
                          <span className="text-xs text-stone-400 italic">Standard furnishings</span>
                        )}
                      </div>
                    </div>
                  </div>
                </div>

                <div className="px-5 pb-5 pt-2 border-t border-stone-100 flex items-center justify-between">
                  <Link
                    to={`/venues/${v.id}`}
                    className="text-xs font-semibold text-stone-700 hover:text-slate-900"
                  >
                    View Details →
                  </Link>
                  <Link
                    to={`/venues/${v.id}?tab=book`}
                    className="text-xs font-semibold bg-slate-900 hover:bg-slate-800 text-white px-3.5 py-2 rounded-lg transition"
                  >
                    Book Venue
                  </Link>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

