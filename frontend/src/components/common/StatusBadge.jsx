/**
 * @file StatusBadge.jsx
 * @description Reusable status badge with standardized color styling for operational and occupancy states.
 */

export default function StatusBadge({ status, type = 'operational', size = 'md' }) {
  if (!status) return null;

  const sizeClasses = size === 'sm' ? 'px-2 py-0.5 text-xs' : 'px-2.5 py-1 text-xs font-semibold';

  // OPERATIONAL STATUS
  if (type === 'operational') {
    switch (status) {
      case 'OPERATIONAL':
        return (
          <span className={`inline-flex items-center gap-1.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200 ${sizeClasses}`}>
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
            OPERATIONAL
          </span>
        );
      case 'DEGRADED':
        return (
          <span className={`inline-flex items-center gap-1.5 rounded-full bg-amber-50 text-amber-700 border border-amber-300 ${sizeClasses}`}>
            <span className="w-1.5 h-1.5 rounded-full bg-amber-500" />
            DEGRADED
          </span>
        );
      case 'MAINTENANCE':
        return (
          <span className={`inline-flex items-center gap-1.5 rounded-full bg-orange-50 text-orange-700 border border-orange-300 ${sizeClasses}`}>
            <span className="w-1.5 h-1.5 rounded-full bg-orange-500" />
            MAINTENANCE
          </span>
        );
      case 'OFFLINE':
        return (
          <span className={`inline-flex items-center gap-1.5 rounded-full bg-red-50 text-red-700 border border-red-300 ${sizeClasses}`}>
            <span className="w-1.5 h-1.5 rounded-full bg-red-500" />
            OFFLINE
          </span>
        );
      default:
        return <span className={`inline-flex rounded-full bg-gray-100 text-gray-700 ${sizeClasses}`}>{status}</span>;
    }
  }

  // OCCUPANCY STATE
  if (type === 'occupancy') {
    switch (status) {
      case 'VACANT':
        return (
          <span className={`inline-flex items-center gap-1 rounded-full bg-slate-100 text-slate-700 border border-slate-200 ${sizeClasses}`}>
            <span className="w-1.5 h-1.5 rounded-full bg-slate-400" />
            Vacant
          </span>
        );
      case 'CLASS_IN_SESSION':
        return (
          <span className={`inline-flex items-center gap-1 rounded-full bg-indigo-50 text-indigo-700 border border-indigo-200 ${sizeClasses}`}>
            <span className="w-1.5 h-1.5 rounded-full bg-indigo-600" />
            Class in Session
          </span>
        );
      case 'EVENT_OCCUPIED':
        return (
          <span className={`inline-flex items-center gap-1 rounded-full bg-purple-50 text-purple-700 border border-purple-200 ${sizeClasses}`}>
            <span className="w-1.5 h-1.5 rounded-full bg-purple-600" />
            Approved Event
          </span>
        );
      case 'RESERVED_IMMINENT':
        return (
          <span className={`inline-flex items-center gap-1 rounded-full bg-amber-50 text-amber-800 border border-amber-300 ${sizeClasses}`}>
            <span className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-ping" />
            Starts Soon
          </span>
        );
      default:
        return <span className={`inline-flex rounded-full bg-gray-100 text-gray-700 ${sizeClasses}`}>{status}</span>;
    }
  }

  // AMENITY / EQUIPMENT HEALTH
  if (type === 'amenity') {
    switch (status) {
      case 'FUNCTIONAL':
        return <span className={`inline-flex rounded-full bg-emerald-50 text-emerald-700 font-medium ${sizeClasses}`}>✓ Functional</span>;
      case 'DEFECTIVE':
        return <span className={`inline-flex rounded-full bg-red-50 text-red-700 font-medium ${sizeClasses}`}>⚠ Defective</span>;
      case 'OFFLINE':
        return <span className={`inline-flex rounded-full bg-gray-100 text-gray-600 font-medium ${sizeClasses}`}>Offline</span>;
      default:
        return <span className={`inline-flex rounded-full bg-gray-100 text-gray-700 ${sizeClasses}`}>{status}</span>;
    }
  }

  return <span className={`inline-flex rounded-full bg-gray-100 text-gray-700 ${sizeClasses}`}>{status}</span>;
}

