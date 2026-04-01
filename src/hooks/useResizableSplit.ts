'use client';
import { useState, useRef, useCallback } from 'react';

interface SplitOptions {
  initialPercent: number;
  minPercent: number;
  maxPercent: number;
  direction: 'horizontal' | 'vertical';
}

export function useResizableSplit(options: SplitOptions) {
  const { initialPercent, minPercent, maxPercent, direction } = options;
  const [percent, setPercent] = useState(initialPercent);
  const isDragging = useRef(false);
  const containerRef = useRef<HTMLDivElement>(null);

  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    isDragging.current = true;
    document.body.style.cursor = direction === 'horizontal' ? 'col-resize' : 'row-resize';
    document.body.style.userSelect = 'none';

    const handleMouseMove = (e: MouseEvent) => {
      if (!isDragging.current || !containerRef.current) return;
      const rect = containerRef.current.getBoundingClientRect();
      let newPercent: number;

      if (direction === 'horizontal') {
        const offset = e.clientX - rect.left;
        newPercent = (offset / rect.width) * 100;
      } else {
        const offset = e.clientY - rect.top;
        newPercent = (offset / rect.height) * 100;
      }

      newPercent = Math.max(minPercent, Math.min(maxPercent, newPercent));
      setPercent(newPercent);
    };

    const handleMouseUp = () => {
      isDragging.current = false;
      document.body.style.cursor = '';
      document.body.style.userSelect = '';
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };

    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);
  }, [minPercent, maxPercent, direction]);

  const handleTouchStart = useCallback((e: React.TouchEvent) => {
    isDragging.current = true;

    const handleTouchMove = (e: TouchEvent) => {
      if (!isDragging.current || !containerRef.current) return;
      const touch = e.touches[0];
      const rect = containerRef.current.getBoundingClientRect();
      let newPercent: number;

      if (direction === 'horizontal') {
        const offset = touch.clientX - rect.left;
        newPercent = (offset / rect.width) * 100;
      } else {
        const offset = touch.clientY - rect.top;
        newPercent = (offset / rect.height) * 100;
      }

      newPercent = Math.max(minPercent, Math.min(maxPercent, newPercent));
      setPercent(newPercent);
    };

    const handleTouchEnd = () => {
      isDragging.current = false;
      document.removeEventListener('touchmove', handleTouchMove);
      document.removeEventListener('touchend', handleTouchEnd);
    };

    document.addEventListener('touchmove', handleTouchMove);
    document.addEventListener('touchend', handleTouchEnd);
  }, [minPercent, maxPercent, direction]);

  return { percent, setPercent, containerRef, handleMouseDown, handleTouchStart };
}
