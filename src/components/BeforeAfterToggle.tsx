export type ViewMode = 'original' | 'optimized';

interface BeforeAfterToggleProps {
  viewMode: ViewMode;
  setViewMode: (mode: ViewMode) => void;
}

export function BeforeAfterToggle({
  viewMode,
  setViewMode,
}: BeforeAfterToggleProps) {
  const btn = (mode: ViewMode, label: string) => {
    const active = viewMode === mode;
    return (
      <button
        type="button"
        onClick={() => setViewMode(mode)}
        className={`rounded-md px-3 py-1.5 text-xs font-semibold transition ${
          active
            ? 'bg-indigo-600 text-white shadow-sm'
            : 'text-slate-400 hover:bg-slate-800 hover:text-slate-200'
        }`}
      >
        {label}
      </button>
    );
  };

  return (
    <div className="inline-flex rounded-lg border border-slate-700 bg-slate-900/95 p-0.5 shadow-lg backdrop-blur-sm">
      {btn('original', 'Original')}
      {btn('optimized', 'Optimized')}
    </div>
  );
}
