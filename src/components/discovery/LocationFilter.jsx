import { useState, useRef, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { useAnchoredPopover } from '../../hooks/useAnchoredPopover';

const DISTANCE_OPTIONS = [5, 10, 25, 50, 100, 250];

/**
 * Pill button that opens a popover for selecting a distance radius filter.
 *
 * Props:
 * - value: number | null  (current max distance in miles, null = off)
 * - onChange: (miles: number | null) => void
 * - hasLocation: boolean  (whether the current user has a location set)
 */
export default function LocationFilter({ value, onChange, hasLocation }) {
  const [open, setOpen] = useState(false);
  const containerRef = useRef(null);
  const { anchorRef, popoverRef, popoverStyle } = useAnchoredPopover(open, { width: 224 });

  useEffect(() => {
    function handleClickOutside(e) {
      const clickedTrigger = containerRef.current?.contains(e.target);
      const clickedPopover = popoverRef.current?.contains(e.target);

      if (!clickedTrigger && !clickedPopover) {
        setOpen(false);
      }
    }
    if (open) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => document.removeEventListener('mousedown', handleClickOutside);
    }
  }, [open]);

  const active = value != null;

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
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z"
          />
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M15 11a3 3 0 11-6 0 3 3 0 016 0z"
          />
        </svg>
        {active ? `${value} mi` : 'Location'}
        <svg
          className={`w-3.5 h-3.5 transition-transform ${open ? 'rotate-180' : ''}`}
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
          className="w-56 bg-white rounded-xl shadow-lg border border-gray-200 animate-fade-in overflow-y-auto"
        >
          {!hasLocation ? (
            <div className="p-4 text-sm text-gray-500 text-center">
              <svg className="w-8 h-8 mx-auto mb-2 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z"
                />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
              </svg>
              Set your location in your profile to use this filter.
            </div>
          ) : (
            <>
              <div className="px-3 pt-3 pb-1.5">
                <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">
                  Distance
                </p>
              </div>
              <div className="px-1.5 pb-1.5">
                {DISTANCE_OPTIONS.map((miles) => (
                  <button
                    key={miles}
                    type="button"
                    onClick={() => {
                      onChange(miles);
                      setOpen(false);
                    }}
                    className={`w-full text-left px-3 py-2 rounded-lg text-sm transition-colors ${
                      value === miles
                        ? 'bg-primary-50 text-primary-700 font-medium'
                        : 'text-gray-700 hover:bg-gray-50'
                    }`}
                  >
                    Within {miles} miles
                  </button>
                ))}
              </div>
              {active && (
                <div className="border-t border-gray-100 px-1.5 py-1.5">
                  <button
                    type="button"
                    onClick={() => {
                      onChange(null);
                      setOpen(false);
                    }}
                    className="w-full text-left px-3 py-2 rounded-lg text-sm text-red-500 hover:bg-red-50 transition-colors"
                  >
                    Clear filter
                  </button>
                </div>
              )}
            </>
          )}
        </div>,
        document.body,
      )}
    </div>
  );
}
