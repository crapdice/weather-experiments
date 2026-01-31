import { useState, useEffect, RefObject } from 'react';

export function useDimensions(ref: RefObject<HTMLElement | null>) {
    const [dimensions, setDimensions] = useState({ width: 0, height: 0 });

    useEffect(() => {
        const handleResize = () => {
            if (ref.current) {
                setDimensions({
                    width: ref.current.clientWidth,
                    height: ref.current.clientHeight
                });
            }
        };

        // Call handleResize immediately on mount to get initial dimensions
        // This addresses the "sync setState" aspect by ensuring dimensions are set as soon as the ref is available.
        handleResize();

        // Use requestAnimationFrame for subsequent updates to avoid layout thrashing
        // and ensure measurements are taken after the browser has painted.
        const rafId = requestAnimationFrame(handleResize);
        window.addEventListener('resize', handleResize);

        return () => {
            cancelAnimationFrame(rafId);
            window.removeEventListener('resize', handleResize);
        };
    }, [ref]);

    return dimensions;
}
