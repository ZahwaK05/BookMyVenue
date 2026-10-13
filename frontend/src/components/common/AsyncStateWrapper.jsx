/**
 * @file AsyncStateWrapper.jsx
 * @description Standardized container handling Blueprint Skeletons, Error retry banners, and Empty states.
 */

export default function AsyncStateWrapper({
  loading,
  error,
  empty,
  emptyMessage = 'No venues or data match the selected view.',
  onRetry,
  children,
}) {
  if (loading) {
    return (
      <div className="w-full space-y-4 py-8 animate-pulse">
        {/* Architectural skeleton layout */}
        <div className="h-8 bg-stone-200 rounded-md w-1/3 mb-4" />
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <div
              key={i}
              className="h-44 bg-white border border-stone-200 rounded-xl p-4 flex flex-col justify-between"
            >
              <div className="flex justify-between items-center">
                <div className="h-5 bg-stone-200 rounded-sm w-24" />
                <div className="h-5 bg-stone-100 rounded-full w-20" />
              </div>
              <div className="space-y-2 my-3">
                <div className="h-3 bg-stone-100 rounded-sm w-full" />
                <div className="h-3 bg-stone-100 rounded-sm w-3/4" />
              </div>
              <div className="h-6 bg-stone-50 rounded-sm w-1/2" />
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-xl p-8 text-center my-6">
        <div className="w-12 h-12 bg-red-100 text-red-600 rounded-full flex items-center justify-center mx-auto mb-3 text-xl font-bold">
          !
        </div>
        <h3 className="text-base font-semibold text-red-900">Failed to Load Campus State</h3>
        <p className="text-sm text-red-700 mt-1 max-w-md mx-auto">{error}</p>
        {onRetry && (
          <button
            onClick={onRetry}
            className="mt-4 px-4 py-2 bg-red-600 hover:bg-red-700 text-white text-sm font-medium rounded-lg transition"
          >
            Retry Synchronization
          </button>
        )}
      </div>
    );
  }

  if (empty) {
    return (
      <div className="bg-white border border-stone-200 rounded-xl p-12 text-center my-6">
        <div className="w-12 h-12 bg-stone-100 text-stone-500 rounded-full flex items-center justify-center mx-auto mb-3 text-xl">
          🏛️
        </div>
        <h3 className="text-base font-semibold text-slate-800">No Facilities Found</h3>
        <p className="text-sm text-stone-500 mt-1 max-w-sm mx-auto">{emptyMessage}</p>
      </div>
    );
  }

  return children;
}

