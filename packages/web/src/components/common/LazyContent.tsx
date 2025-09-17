import React, { useState, useRef, useEffect, ReactNode } from 'react';

interface LazyContentProps {
  children: ReactNode;
  fallback?: ReactNode;
  threshold?: number;
  rootMargin?: string;
  className?: string;
  minHeight?: string;
  onInView?: () => void;
}

export const LazyContent: React.FC<LazyContentProps> = ({
  children,
  fallback = <div className="animate-pulse bg-gray-200 rounded h-32"></div>,
  threshold = 0.1,
  rootMargin = '100px',
  className = '',
  minHeight = 'auto',
  onInView,
}) => {
  const [isInView, setIsInView] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setIsInView(true);
          onInView?.();
          observer.disconnect();
        }
      },
      {
        threshold,
        rootMargin,
      }
    );

    if (containerRef.current) {
      observer.observe(containerRef.current);
    }

    return () => observer.disconnect();
  }, [threshold, rootMargin, onInView]);

  return (
    <div
      ref={containerRef}
      className={className}
      style={{ minHeight }}
    >
      {isInView ? children : fallback}
    </div>
  );
};