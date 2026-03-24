export default function DealbreakerToggle({ checked, onChange }) {
  return (
    <label className="flex items-center justify-between gap-3 px-4 py-3 border-t border-gray-100 cursor-pointer">
      <div>
        <p className="text-sm font-medium text-gray-900">Dealbreaker</p>
        <p className="text-xs text-gray-500">
          Make this filter strict with no exceptions.
        </p>
      </div>
      <button
        type="button"
        onClick={() => onChange(!checked)}
        aria-pressed={checked}
        className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
          checked ? 'bg-primary-500' : 'bg-gray-300'
        }`}
      >
        <span
          className={`inline-block h-5 w-5 transform rounded-full bg-white shadow-sm transition-transform ${
            checked ? 'translate-x-5' : 'translate-x-0.5'
          }`}
        />
        <span className="sr-only">Toggle dealbreaker</span>
      </button>
    </label>
  );
}
