import { useState, useRef, useEffect, useCallback } from 'react';

const MIN_INCHES = 48;  // 4'0"
const MAX_INCHES = 84;  // 7'0"

function inchesToLabel(totalInches) {
  const feet = Math.floor(totalInches / 12);
  const inches = totalInches % 12;
  return `${feet}'${inches}"`;
}

/**
 * Pill button that opens a popover with a dual-thumb range slider for height filtering.
 *
 * Props:
 * - value: [number, number] | null  (current [minInches, maxInches], null = off)
 * - onChange: (range: [number, number] | null) => void
 */
export default function HeightFilter({ value, onChange }) {
  const [open, setOpen] = useState(false);
  const [localMin, setLocalMin] = useState(value?.[0] ?? MIN_INCHES);
  const [localMax, setLocalMax] = useState(value?.[1] ?? MAX_INCHES);
  const ref = useRef(null);

  useEffect(() => {
    setLocalMin(value?.[0] ?? MIN_INCHES);
    setLocalMax(value?.[1] ?? MAX_INCHES);
  }, [value]);

  useEffect(() => {
    function handleClickOutside(e) {
      if (ref.current && !ref.current.contains(e.target)) {
        setOpen(false);
      }
    }
    if (open) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => document.removeEventListener('mousedown', handleClickOutside);
    }
  }, [open]);

  const handleApply = () => {
    if (localMin === MIN_INCHES && localMax === MAX_INCHES) {
      onChange(null);
    } else {
      onChange([localMin, localMax]);
    }
    setOpen(false);
  };

  const handleClear = () => {
    onChange(null);
    setLocalMin(MIN_INCHES);
    setLocalMax(MAX_INCHES);
    setOpen(false);
  };

  const active = value != null;

  const label = active
    ? `${inchesToLabel(value[0])} – ${inchesToLabel(value[1])}`
    : 'Height';

  return (
    <div className="relative inline-block flex-shrink-0" ref={ref}>
      <button
        type="button"
        onClick={() => setOpen((prev) => !prev)}
        className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm font-medium transition-colors whitespace-nowrap ${
          active
            ? 'bg-primary-500 text-white'
            : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
        }`}
      >
        <svg className="w-4 h-4 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7l4-4m0 0l4 4m-4-4v18" />
        </svg>
        {label}
        <svg
          className={`w-3.5 h-3.5 flex-shrink-0 transition-transform ${open ? 'rotate-180' : ''}`}
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {open && (
        <div className="absolute left-0 mt-2 w-64 bg-white rounded-xl shadow-lg border border-gray-200 z-50 animate-fade-in overflow-hidden">
          <div className="px-4 pt-4 pb-2">
            <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1">
              Height Range
            </p>
            <p className="text-lg font-semibold text-gray-900">
              {inchesToLabel(localMin)} – {inchesToLabel(localMax)}{localMax === MAX_INCHES ? '+' : ''}
            </p>
          </div>

          <div className="px-4 pb-4">
            <RangeSlider
              min={MIN_INCHES}
              max={MAX_INCHES}
              valueMin={localMin}
              valueMax={localMax}
              onChangeMin={setLocalMin}
              onChangeMax={setLocalMax}
            />
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
        </div>
      )}
    </div>
  );
}

function RangeSlider({ min, max, valueMin, valueMax, onChangeMin, onChangeMax }) {
  const trackRef = useRef(null);

  const getPercent = useCallback(
    (val) => ((val - min) / (max - min)) * 100,
    [min, max],
  );

  const minPercent = getPercent(valueMin);
  const maxPercent = getPercent(valueMax);

  return (
    <div className="relative h-8 flex items-center">
      <div className="absolute w-full h-1.5 rounded-full bg-gray-200" />
      <div
        ref={trackRef}
        className="absolute h-1.5 rounded-full bg-primary-500"
        style={{ left: `${minPercent}%`, width: `${maxPercent - minPercent}%` }}
      />

      <input
        type="range"
        min={min}
        max={max}
        value={valueMin}
        onChange={(e) => {
          const val = Math.min(Number(e.target.value), valueMax - 1);
          onChangeMin(val);
        }}
        className="range-thumb absolute w-full pointer-events-none appearance-none bg-transparent z-10"
        style={{ zIndex: valueMin > max - 10 ? 20 : 10 }}
      />
      <input
        type="range"
        min={min}
        max={max}
        value={valueMax}
        onChange={(e) => {
          const val = Math.max(Number(e.target.value), valueMin + 1);
          onChangeMax(val);
        }}
        className="range-thumb absolute w-full pointer-events-none appearance-none bg-transparent z-10"
      />
    </div>
  );
}
