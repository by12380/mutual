import { useEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { useAnchoredPopover } from '../../hooks/useAnchoredPopover';

const GENDER_OPTIONS = [
  { value: 'male', label: 'Male' },
  { value: 'female', label: 'Female' },
  { value: 'non-binary', label: 'Non-binary' },
];

export default function GenderFilter({ value, onChange }) {
  const [open, setOpen] = useState(false);
  const [localValue, setLocalValue] = useState(value ?? []);
  const containerRef = useRef(null);
  const { anchorRef, popoverRef, popoverStyle } = useAnchoredPopover(open, { width: 256 });

  useEffect(() => {
    setLocalValue(value ?? []);
  }, [value]);

  useEffect(() => {
    function handleClickOutside(event) {
      const clickedTrigger = containerRef.current?.contains(event.target);
      const clickedPopover = popoverRef.current?.contains(event.target);

      if (!clickedTrigger && !clickedPopover) {
        setOpen(false);
      }
    }

    if (open) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => document.removeEventListener('mousedown', handleClickOutside);
    }
  }, [open, popoverRef]);

  const active = value != null && value.length > 0;

  const label = useMemo(() => {
    if (!active) return 'Gender';

    const labels = GENDER_OPTIONS
      .filter((option) => value.includes(option.value))
      .map((option) => option.label);

    if (labels.length <= 2) {
      return labels.join(', ');
    }

    return `${labels.length} genders`;
  }, [active, value]);

  const toggleOption = (gender) => {
    setLocalValue((prev) => (
      prev.includes(gender)
        ? prev.filter((item) => item !== gender)
        : [...prev, gender]
    ));
  };

  const handleApply = () => {
    onChange(localValue.length > 0 ? localValue : null);
    setOpen(false);
  };

  const handleClear = () => {
    setLocalValue([]);
    onChange(null);
    setOpen(false);
  };

  return (
    <div className="relative inline-block flex-shrink-0" ref={containerRef}>
      <button
        ref={anchorRef}
        type="button"
        onClick={() => setOpen((prev) => !prev)}
        className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm font-medium transition-colors whitespace-nowrap ${
          active
            ? 'bg-primary-500 text-white'
            : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
        }`}
      >
        <svg className="w-4 h-4 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M7 21a4 4 0 010-8 5 5 0 019.584-1.5A3.5 3.5 0 1117.5 18H7z"
          />
        </svg>
        <span className="max-w-36 truncate">{label}</span>
        <svg
          className={`w-3.5 h-3.5 flex-shrink-0 transition-transform ${open ? 'rotate-180' : ''}`}
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {open && createPortal(
        <div
          ref={popoverRef}
          style={popoverStyle}
          className="w-64 bg-white rounded-xl shadow-lg border border-gray-200 animate-fade-in overflow-y-auto"
        >
          <div className="px-4 pt-4 pb-2">
            <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1">
              Gender
            </p>
            <p className="text-sm text-gray-600">
              Show people with these genders.
            </p>
          </div>

          <div className="px-3 pb-3 space-y-1.5">
            {GENDER_OPTIONS.map((option) => {
              const checked = localValue.includes(option.value);

              return (
                <label
                  key={option.value}
                  className="flex items-center gap-3 px-3 py-2 rounded-lg hover:bg-gray-50 cursor-pointer"
                >
                  <input
                    type="checkbox"
                    checked={checked}
                    onChange={() => toggleOption(option.value)}
                    className="h-4 w-4 rounded border-gray-300 text-primary-500 focus:ring-primary-500"
                  />
                  <span className="text-sm text-gray-800">{option.label}</span>
                </label>
              );
            })}
          </div>

          <div className="border-t border-gray-100 px-3 py-2.5 flex items-center justify-between gap-2">
            {active ? (
              <button
                type="button"
                onClick={handleClear}
                className="text-sm text-red-500 hover:text-red-600 transition-colors"
              >
                Clear
              </button>
            ) : (
              <span />
            )}
            <button
              type="button"
              onClick={handleApply}
              className="px-4 py-1.5 rounded-lg text-sm font-medium bg-primary-500 text-white hover:bg-primary-600 transition-colors"
            >
              Apply
            </button>
          </div>
        </div>,
        document.body,
      )}
    </div>
  );
}
