import { useCallback, useEffect, useRef } from "react";

const useCustomScrollbar = (deps = []) => {
    const containerRef = useRef(null);
    const scrollbarRef = useRef(null);
    const updateRef = useRef(() => {});

    const effectDeps = [containerRef, scrollbarRef, ...deps];

    useEffect(() => {
        const container = containerRef.current;
        const scrollbar = scrollbarRef.current;

        if (!container || !scrollbar) return;

        const track = scrollbar.parentElement;

        const updateScrollbar = () => {
            if (!container || !scrollbar) return;

            const contentHeight = container.scrollHeight;
            const containerHeight = container.clientHeight;
            const needsScroll = contentHeight > containerHeight + 1;

            scrollbar.style.display = needsScroll ? 'block' : 'none';
            scrollbar.style.opacity = needsScroll ? '1' : '0';
            scrollbar.style.pointerEvents = needsScroll ? 'auto' : 'none';
            if (track) {
                track.style.opacity = needsScroll ? '1' : '0';
            }

            if (!needsScroll) {
                scrollbar.style.transform = 'translateY(0)';
                return;
            }

            const scrollbarHeight = Math.max(
                (containerHeight / contentHeight) * containerHeight,
                20
            );
            scrollbar.style.height = `${scrollbarHeight}px`;

            const scrollTop = container.scrollTop;
            const maxScrollTop = contentHeight - containerHeight;
            const maxThumbTravel = containerHeight - scrollbarHeight;
            const scrollbarTop = maxScrollTop
                ? (scrollTop / maxScrollTop) * maxThumbTravel
                : 0;

            scrollbar.style.transform = `translateY(${scrollbarTop}px)`;
        };

        updateRef.current = updateScrollbar;

        const handleScroll = () => {
            updateScrollbar();
        };

        const handleDrag = (event) => {
            const startY = event.clientY;
            const startScrollTop = container.scrollTop;
            const contentHeight = container.scrollHeight;
            const containerHeight = container.clientHeight;

            const scrollbarHeight = scrollbar.offsetHeight || 1;
            const maxScrollTop = contentHeight - containerHeight;
            const maxThumbTravel = Math.max(containerHeight - scrollbarHeight, 1);

            const scrollRatio = maxScrollTop / maxThumbTravel;

            const onMouseMove = (moveEvent) => {
                const deltaY = moveEvent.clientY - startY;
                container.scrollTop = startScrollTop + deltaY * Math.max(scrollRatio, 1);
            };

            const onMouseUp = () => {
                document.removeEventListener("mousemove", onMouseMove);
                document.removeEventListener("mouseup", onMouseUp);
            };

            document.addEventListener("mousemove", onMouseMove);
            document.addEventListener("mouseup", onMouseUp);

            event.preventDefault();
        };

        scrollbar.addEventListener("mousedown", handleDrag);
        container.addEventListener("scroll", handleScroll);
        window.addEventListener("resize", updateScrollbar);

        let resizeObserver;
        if (typeof ResizeObserver === 'function') {
            resizeObserver = new ResizeObserver(updateScrollbar);
            resizeObserver.observe(container);
        }

        updateScrollbar();

        return () => {
            scrollbar.removeEventListener("mousedown", handleDrag);
            container.removeEventListener("scroll", handleScroll);
            window.removeEventListener("resize", updateScrollbar);
            resizeObserver?.disconnect();
        };
    }, effectDeps);

    useEffect(() => {
        updateRef.current?.();
    }, deps);

    const refresh = useCallback(() => {
        updateRef.current?.();
    }, []);

    return { containerRef, scrollbarRef, refresh };
};

export default useCustomScrollbar;
