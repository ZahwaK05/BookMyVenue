// frontend/src/components/RecommendationPage.jsx
import { useState } from 'react';
import { recommend as apiRecommend } from '../api';
import { Link, useNavigate } from 'react-router-dom';

export default function RecommendationPage() {
  const navigate = useNavigate();
  const [query, setQuery] = useState('hall for 150 with a projector tomorrow 2-5 pm');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState('');

  const sampleQueries = [
    'hall for 150 with a projector tomorrow 2-5 pm',
    'classroom for 60 with sound system tomorrow 10am-12pm',
    'conference hall for 200 with air conditioning tomorrow 14:00-17:00',
  ];

  async function handleSearch(searchQuery) {
    const q = (searchQuery || query).trim();
    if (!q) return;

    setLoading(true);
    setError('');
    setResult(null);

    try {
      const data = await apiRecommend.query(q);
      setResult(data);
    } catch (err) {
      console.error('Recommendation query failed:', err);
      if (err.data?.understood) {
        setResult(err.data);
      }
      setError(err.message || 'Failed to query Recommendation Agent.');
    } finally {
      setLoading(false);
    }
  }

  const recommendations = result?.recommendations || result?.results || [];
  const understood = result?.understood;

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* Header */}
      <div className="pb-6 border-b border-stone-200">
        <div className="flex items-center gap-2 mb-1">
          <span className="text-2xl">✨</span>
          <h1 className="text-3xl font-serif font-bold text-slate-900">
            AI Venue Recommendation Agent
          </h1>
        </div>
        <p className="text-stone-500 text-sm">
          Natural-language conversational venue discovery powered by Azure Functions AI Agent, constraint reasoning, and Campus Digital Twin availability
        </p>
      </div>

      {/* Query Search Bar */}
      <div className="mt-6 bg-white rounded-2xl border border-stone-200 p-6 shadow-sm">
        <label className="block text-xs font-semibold uppercase tracking-wider text-stone-700 mb-2">
          Describe your event requirements in natural English:
        </label>
        <div className="flex flex-col sm:flex-row gap-3">
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleSearch(query)}
            placeholder="e.g. Hall for 150 with a projector tomorrow 2-5 pm"
            className="flex-1 px-4 py-3 text-sm border border-stone-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-amber-500/50 text-slate-900 bg-stone-50 focus:bg-white"
          />
          <button
            onClick={() => handleSearch(query)}
            disabled={loading}
            className="bg-slate-900 hover:bg-slate-800 text-white font-semibold text-sm px-6 py-3 rounded-xl transition shadow-sm disabled:opacity-50 shrink-0"
          >
            {loading ? 'Reasoning...' : 'Search Venues ✨'}
          </button>
        </div>

        {/* Suggestion prompts */}
        <div className="mt-4 flex flex-wrap items-center gap-2">
          <span className="text-xs text-stone-400 font-medium">Try asking:</span>
          {sampleQueries.map((sq, i) => (
            <button
              key={i}
              onClick={() => {
                setQuery(sq);
                handleSearch(sq);
              }}
              className="text-xs bg-stone-100 hover:bg-stone-200 text-stone-700 px-3 py-1 rounded-full transition"
            >
              "{sq}"
            </button>
          ))}
        </div>
      </div>

      {/* Error banner */}
      {error && (
        <div className="mt-6 p-4 bg-amber-50 border border-amber-200 text-amber-900 text-sm rounded-xl">
          <p className="font-semibold mb-1">Agent Feedback:</p>
          <p>{error}</p>
        </div>
      )}

      {/* Understood Constraints Banner */}
      {understood && (
        <div className="mt-6 bg-slate-900 text-white rounded-xl p-5 shadow-sm">
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs uppercase font-mono tracking-wider text-amber-400 font-semibold">
              Structured Semantic Interpretation
            </span>
            <span className="text-[10px] bg-white/10 px-2 py-0.5 rounded font-mono text-stone-300">
              Agent Confidence: High
            </span>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
            <div className="bg-slate-800/80 p-2.5 rounded-lg border border-slate-700">
              <span className="text-stone-400 text-[10px] uppercase block">Type Required:</span>
              <span className="font-semibold text-white capitalize">
                {understood.type?.replace('_', ' ') || 'Any Venue'}
              </span>
            </div>
            <div className="bg-slate-800/80 p-2.5 rounded-lg border border-slate-700">
              <span className="text-stone-400 text-[10px] uppercase block">Minimum Capacity:</span>
              <span className="font-semibold text-white">
                {understood.capacity ? `${understood.capacity} people` : 'Unspecified'}
              </span>
            </div>
            <div className="bg-slate-800/80 p-2.5 rounded-lg border border-slate-700">
              <span className="text-stone-400 text-[10px] uppercase block">Desired Amenities:</span>
              <span className="font-semibold text-white">
                {understood.amenities && understood.amenities.length > 0
                  ? understood.amenities.join(', ')
                  : 'Standard'}
              </span>
            </div>
            <div className="bg-slate-800/80 p-2.5 rounded-lg border border-slate-700">
              <span className="text-stone-400 text-[10px] uppercase block">Requested Slot:</span>
              <span className="font-semibold text-white font-mono text-[11px]">
                {understood.date ? `${understood.date} (${understood.start?.slice(11) || ''} - ${understood.end?.slice(11) || ''})` : 'Flexible'}
              </span>
            </div>
          </div>

          {result?.explanation && (
            <p className="mt-3 text-xs text-stone-300 italic border-t border-slate-800 pt-3">
              "{result.explanation}"
            </p>
          )}
        </div>
      )}

      {/* Recommendations Cards */}
      {result && (
        <div className="mt-8 space-y-4">
          <h2 className="text-lg font-serif font-bold text-slate-900">
            Ranked Recommendations ({recommendations.length})
          </h2>

          {recommendations.length === 0 ? (
            <div className="bg-white rounded-xl border border-stone-200 p-8 text-center">
              <span className="text-3xl block mb-2">🔍</span>
              <p className="text-stone-700 font-semibold">No venue completely satisfies all constraints.</p>
              <p className="text-stone-500 text-xs mt-1">
                Try reducing required capacity, adjusting the requested time slot, or asking for fewer specific amenities.
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              {recommendations.map((rec, index) => (
                <div
                  key={rec.venue_id || index}
                  className="bg-white rounded-xl border border-stone-200 p-5 shadow-sm hover:border-stone-300 hover:shadow-md transition flex flex-col justify-between"
                >
                  <div>
                    <div className="flex items-start justify-between gap-3 mb-2">
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="bg-amber-100 text-amber-900 text-xs font-bold px-2 py-0.5 rounded-full">
                            #{index + 1} Match
                          </span>
                          <span className="text-xs font-mono uppercase text-stone-500">
                            {rec.block_name} • Floor {rec.floor_number}
                          </span>
                        </div>
                        <h3 className="text-xl font-bold font-serif text-slate-900 mt-1">
                          {rec.venue_name}
                        </h3>
                      </div>

                      {rec.score !== undefined && (
                        <div className="text-right">
                          <span className="text-xs font-mono font-bold text-emerald-700 block">
                            Score: {Math.round(rec.score * 100)}%
                          </span>
                        </div>
                      )}
                    </div>

                    <div className="flex flex-wrap items-center gap-2 my-2.5">
                      <span className="text-xs bg-stone-100 text-stone-700 px-2 py-0.5 rounded font-medium capitalize">
                        {rec.venue_type?.replace('_', ' ')}
                      </span>
                      <span className="text-xs bg-stone-100 text-stone-700 px-2 py-0.5 rounded font-medium">
                        👥 Capacity: {rec.capacity}
                      </span>
                      {rec.requires_dean_approval && (
                        <span className="text-xs bg-amber-50 text-amber-800 border border-amber-200 px-2 py-0.5 rounded font-medium">
                          🏛️ Requires Dean Sign-off
                        </span>
                      )}
                    </div>

                    {rec.reason && (
                      <p className="text-xs text-stone-600 bg-stone-50 p-2.5 rounded-lg border border-stone-100 mt-3">
                        <strong>Reason:</strong> {rec.reason}
                      </p>
                    )}
                  </div>

                  <div className="mt-5 pt-3 border-t border-stone-100 flex items-center justify-between">
                    <Link
                      to={`/venues/${rec.venue_id}`}
                      className="text-xs font-semibold text-stone-700 hover:text-slate-900"
                    >
                      Inspect Venue →
                    </Link>
                    <button
                      onClick={() => navigate(`/venues/${rec.venue_id}`)}
                      className="text-xs font-semibold bg-slate-900 hover:bg-slate-800 text-white px-4 py-2 rounded-lg transition shadow-sm"
                    >
                      Book This Venue
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

