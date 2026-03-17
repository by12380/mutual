import { useCallback, useEffect, useRef, useState } from 'react';

export function useAnchoredPopover(open, { width, gap = 8, padding = 16 } = {}) {
  const anchorRef = useRef(null);
  const popoverRef = useRef(null);
  const [popoverStyle, setPopoverStyle] = useState({});

  const updatePosition = useCallback(() => {
    if (!anchorRef.current) return;

    const rect = anchorRef.current.getBoundingClientRect();
    const measuredWidth = popoverRef.current?.offsetWidth ?? width ?? rect.width;
    const left = Math.min(
      Math.max(padding, rect.left),
      window.innerWidth - padding - measuredWidth,
    );
    const top = rect.bottom + gap;
    const maxHeight = Math.max(160, window.innerHeight - top - padding);

    setPopoverStyle({
      position: 'fixed',
      top: `${top}px`,
      left: `${left}px`,
      maxHeight: `${maxHeight}px`,
      zIndex: 60,
    });
  }, [gap, padding, width]);

  useEffect(() => {
    if (!open) return undefined;

    updatePosition();

    window.addEventListener('resize', updatePosition);
    window.addEventListener('scroll', updatePosition, true);

    return () => {
      window.removeEventListener('resize', updatePosition);
      window.removeEventListener('scroll', updatePosition, true);
    };
  }, [open, updatePosition]);

  return {
    anchorRef,
    popoverRef,
    popoverStyle,
    updatePosition,
  };
}
