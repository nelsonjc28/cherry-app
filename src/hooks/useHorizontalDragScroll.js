/**
 * useHorizontalDragScroll
 *
 * React hook to enable horizontal scrolling via mouse drag and touch gestures on any scrollable container.
 *
 * Usage:
 *   const ref = useRef(null);
 *   const { isDragging, eventHandlers } = useHorizontalDragScroll(ref);
 *   ...
 *   <div ref={ref} {...eventHandlers}> ... </div>
 *
 * - Works for both mouse and touch events.
 * - Prevents default browser behavior during drag.
 * - Adds a 'dragging' class to the container while dragging.
 * - You can adjust the scroll speed with the 'speed' constant.
 *
 * @param {React.RefObject} ref - Ref to the scrollable container element.
 * @returns {Object} { isDragging, eventHandlers }
 *   - isDragging: boolean indicating if the user is currently dragging.
 *   - eventHandlers: object with all necessary mouse and touch event handlers.
 */
import { useRef, useEffect } from 'react';

export default function useHorizontalDragScroll(ref) {
  const isDragging = useRef(false);
  const startX = useRef(0);
  const scrollLeft = useRef(0);

  // Change this value to control scroll speed (1 = normal, >1 = faster, <1 = slower)
  const speed = 1.5;

  /**
   * Mouse down event: Start dragging.
   */
  const handleMouseDown = (e) => {
    if (!ref.current) return;
    isDragging.current = true;
    ref.current.classList.add('dragging');
    startX.current = e.pageX - ref.current.offsetLeft;
    scrollLeft.current = ref.current.scrollLeft;
    e.preventDefault();
  };
  /**
   * Mouse move event: Scroll horizontally while dragging.
   */
  const handleMouseMove = (e) => {
    if (!isDragging.current || !ref.current) return;
    const x = e.pageX - ref.current.offsetLeft;
    const walk = (x - startX.current) * speed;
    ref.current.scrollLeft = scrollLeft.current - walk;
    e.preventDefault();
  };
  /**
   * Mouse up event: End dragging.
   */
  const handleMouseUp = () => {
    isDragging.current = false;
    if (ref.current) ref.current.classList.remove('dragging');
  };
  /**
   * Mouse leave event: End dragging if mouse leaves container.
   */
  const handleMouseLeave = () => {
    isDragging.current = false;
    if (ref.current) ref.current.classList.remove('dragging');
  };

  // --- Touch events: must be added manually to avoid passive errors ---
  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    const handleTouchStart = (e) => {
      isDragging.current = true;
      el.classList.add('dragging');
      startX.current = e.touches[0].pageX - el.offsetLeft;
      scrollLeft.current = el.scrollLeft;
    };
    const handleTouchMove = (e) => {
      if (!isDragging.current) return;
      const x = e.touches[0].pageX - el.offsetLeft;
      const walk = (x - startX.current) * speed;
      el.scrollLeft = scrollLeft.current - walk;
      e.preventDefault();
    };
    const handleTouchEnd = () => {
      isDragging.current = false;
      el.classList.remove('dragging');
    };

    el.addEventListener('touchstart', handleTouchStart, { passive: false });
    el.addEventListener('touchmove', handleTouchMove, { passive: false });
    el.addEventListener('touchend', handleTouchEnd, { passive: false });

    return () => {
      el.removeEventListener('touchstart', handleTouchStart);
      el.removeEventListener('touchmove', handleTouchMove);
      el.removeEventListener('touchend', handleTouchEnd);
    };
  }, [ref]);

  // Return handlers and dragging state (mouse only)
  return {
    isDragging: isDragging.current,
    eventHandlers: {
      onMouseDown: handleMouseDown,
      onMouseMove: handleMouseMove,
      onMouseUp: handleMouseUp,
      onMouseLeave: handleMouseLeave,
      // Touch events are handled natively
    },
  };
} 