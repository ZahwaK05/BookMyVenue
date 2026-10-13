/**
 * @file TemporalTimeSlider.jsx
 * @description Control bar for toggling between Current (Live), Predicted, and Historical Digital Twin perspectives.
 */

import { useDigitalTwin } from '../../context/DigitalTwinContext';

export default function TemporalTimeSlider() {
  const { temporalMode, predictionWindowHours, setTemporalMode } = useDigitalTwin();

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 text-stone-200 shadow-sm flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
      {/* Mode Buttons */}
      <div className="flex items-center gap-1 bg-slate-950 p-1 rounded-lg border border-slate-800 w-full md:w-auto">
        <button
          onClick={() => setTemporalMode('current')}
          className={`flex-1 md:flex-initial px-3 py-1.5 rounded-md text-xs font-medium transition flex items-center justify-center gap-1.5 ${
            temporalMode === 'current'
              ? 'bg-amber-500 text-slate-950 font-semibold shadow-xs'
              : 'text-stone-300 hover:text-white hover:bg-slate-850'
          }`}
        >
          <span className={`w-2 h-2 rounded-full ${temporalMode === 'current' ? 'bg-slate-950 animate-ping' : 'bg-emerald-400'}`} />
          Current (Real-Time)
        </button>

        <button
          onClick={() => setTemporalMode('predicted', predictionWindowHours)}
          className={`flex-1 md:flex-initial px-3 py-1.5 rounded-md text-xs font-medium transition flex items-center justify-center gap-1.5 ${
            temporalMode === 'predicted'
              ? 'bg-amber-500 text-slate-950 font-semibold shadow-xs'
              : 'text-stone-300 hover:text-white hover:bg-slate-850'
          }`}
        >
          🔮 Predicted Horizon
        </button>

        <button
          onClick={() => setTemporalMode('historical')}
          className={`flex-1 md:flex-initial px-3 py-1.5 rounded-md text-xs font-medium transition flex items-center justify-center gap-1.5 ${
            temporalMode === 'historical'
              ? 'bg-amber-500 text-slate-950 font-semibold shadow-xs'
              : 'text-stone-300 hover:text-white hover:bg-slate-850'
          }`}
        >
          📜 Past 7-Day Average
        </button>
      </div>

      {/* Sub-selector for Predicted Horizon */}
      {temporalMode === 'predicted' && (
        <div className="flex items-center gap-2 bg-slate-800/80 px-3 py-1.5 rounded-lg border border-slate-700 text-xs">
          <span className="text-stone-400">Projection Window:</span>
          {[2, 4, 24].map((hrs) => (
            <button
              key={hrs}
              onClick={() => setTemporalMode('predicted', hrs)}
              className={`px-2 py-0.5 rounded font-mono ${
                predictionWindowHours === hrs
                  ? 'bg-amber-400 text-slate-950 font-bold'
                  : 'text-stone-300 hover:text-white bg-slate-700/60'
              }`}
            >
              +{hrs}h
            </button>
          ))}
        </div>
      )}

      {/* Explanation Label */}
      <div className="text-xs text-stone-400 font-mono">
        {temporalMode === 'current' && '● Live campus state synchronized with real-time timetable and issue logs.'}
        {temporalMode === 'predicted' && `● Simulating projected occupancy & risk for the next ${predictionWindowHours} hours.`}
        {temporalMode === 'historical' && '● Displaying historical aggregate reliability and average utilization patterns.'}
      </div>
    </div>
  );
}

