import { useState, useEffect, useRef, useCallback } from 'react';

interface UseLazyLoadingOptions {
  threshold?: number;
  rootMargin?: string;
  triggerOnce?: boolean;
}

export const useLazyLoading = (options: UseLazyLoadingOptions = {}) => {
  const {
    threshold = 0.1,
    rootMargin = '50px',
    triggerOnce = true,
  } = options;

  const [isInView, setIsInView] = useState(false);
  const [hasTriggered, setHasTriggered] = useState(false);
  const elementRef = useRef<HTMLElement>(null);

  useEffect(() => {
    const element = elementRef.current;
    if (!element) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        const inView = entry.isIntersecting;
        setIsInView(inView);

        if (inView && !hasTriggered) {
          setHasTriggered(true);
          if (triggerOnce) {
            observer.disconnect();
          }
        }
      },
      {
        threshold,
        rootMargin,
      }
    );

    observer.observe(element);

    return () => observer.disconnect();
  }, [threshold, rootMargin, triggerOnce, hasTriggered]);

  const reset = useCallback(() => {
    setIsInView(false);
    setHasTriggered(false);
  }, []);

  return {
    elementRef,
    isInView,
    hasTriggered,
    reset,
  };
};

interface UseInfiniteScrollOptions {
  hasNextPage: boolean;
  isFetchingNextPage: boolean;
  fetchNextPage: () => void;
  threshold?: number;
  rootMargin?: string;
}

export const useInfiniteScroll = ({
  hasNextPage,
  isFetchingNextPage,
  fetchNextPage,
  threshold = 1.0,
  rootMargin = '100px',
}: UseInfiniteScrollOptions) => {
  const loadMoreRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const element = loadMoreRef.current;
    if (!element || !hasNextPage || isFetchingNextPage) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          fetchNextPage();
        }
      },
      {
        threshold,
        rootMargin,
      }
    );

    observer.observe(element);

    return () => observer.disconnect();
  }, [hasNextPage, isFetchingNextPage, fetchNextPage, threshold, rootMargin]);

  return { loadMoreRef };
};

interface UseImagePreloadOptions {
  images: string[];
  priority?: boolean;
}

export const useImagePreload = ({ images, priority = false }: UseImagePreloadOptions) => {
  const [loadedImages, setLoadedImages] = useState<Set<string>>(new Set());
  const [failedImages, setFailedImages] = useState<Set<string>>(new Set());

  useEffect(() => {
    if (images.length === 0) return;

    const preloadImage = (src: string): Promise<void> => {
      return new Promise((resolve) => {
        const img = new Image();
        
        img.onload = () => {
          setLoadedImages(prev => new Set(prev).add(src));
          resolve();
        };
        
        img.onerror = () => {
          setFailedImages(prev => new Set(prev).add(src));
          resolve();
        };

        // Set loading priority
        if (priority) {
          img.loading = 'eager';
        }
        
        img.src = src;
      });
    };

    // Preload images with concurrency limit
    const preloadBatch = async (batch: string[]) => {
      await Promise.all(batch.map(preloadImage));
    };

    const batchSize = priority ? images.length : 3; // Load all at once if priority, otherwise batch
    const batches: string[][] = [];
    
    for (let i = 0; i < images.length; i += batchSize) {
      batches.push(images.slice(i, i + batchSize));
    }

    // Process batches sequentially for non-priority images
    const processBatches = async () => {
      for (const batch of batches) {
        await preloadBatch(batch);
        if (!priority) {
          // Small delay between batches to avoid overwhelming the browser
          await new Promise(resolve => setTimeout(resolve, 100));
        }
      }
    };

    processBatches();
  }, [images, priority]);

  const isImageLoaded = useCallback((src: string) => loadedImages.has(src), [loadedImages]);
  const isImageFailed = useCallback((src: string) => failedImages.has(src), [failedImages]);
  
  const progress = images.length > 0 
    ? (loadedImages.size + failedImages.size) / images.length 
    : 1;

  return {
    loadedImages,
    failedImages,
    isImageLoaded,
    isImageFailed,
    progress,
    isComplete: progress === 1,
  };
};