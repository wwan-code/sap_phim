// src/hooks/usePopperTooltip.js
import { useState, useCallback, useRef, useEffect } from 'react';
import { createPopper } from '@popperjs/core';

// Helper để phát hiện thiết bị cảm ứng một lần
const isTouchDevice = () => {
    if (typeof window === 'undefined') return false;
    return 'ontouchstart' in window || navigator.maxTouchPoints > 0;
};

const IS_TOUCH_DEVICE = isTouchDevice();

export function usePopperTooltip({
    placement = 'top',
    trigger: triggerProp = 'hover',
    delay: delayProp = 0,
    offset = [0, 8],
    strategy = 'absolute',
    modifiers: customModifiers = [],
    onFirstUpdate,
    interactive = false,
} = {}) {
    const [visible, setVisible] = useState(false);
    const [referenceElement, setReferenceElement] = useState(null);
    const [popperElement, setPopperElement] = useState(null);
    const [arrowElement, setArrowElement] = useState(null);

    const popperInstanceRef = useRef(null);
    const showTimeoutRef = useRef(null);
    const hideTimeoutRef = useRef(null);

    // Sử dụng trigger 'click' thay cho 'hover' trên thiết bị cảm ứng
    const trigger = IS_TOUCH_DEVICE && triggerProp.includes('hover') ? ['click'] : Array.isArray(triggerProp) ? triggerProp : [triggerProp];

    const clearTimeouts = useCallback(() => {
        clearTimeout(showTimeoutRef.current);
        clearTimeout(hideTimeoutRef.current);
    }, []);

    const getDelay = useCallback((type) => {
        if (typeof delayProp === 'number') return delayProp;
        return delayProp?.[type] || 0;
    }, [delayProp]);

    const showTooltip = useCallback(() => {
        clearTimeouts();
        const showDelay = getDelay('show');
        if (showDelay > 0) {
            showTimeoutRef.current = setTimeout(() => setVisible(true), showDelay);
        } else {
            setVisible(true);
        }
    }, [clearTimeouts, getDelay]);

    const hideTooltip = useCallback(() => {
        clearTimeouts();
        const hideDelay = getDelay('hide');
        if (hideDelay > 0) {
            hideTimeoutRef.current = setTimeout(() => setVisible(false), hideDelay);
        } else {
            setVisible(false);
        }
    }, [clearTimeouts, getDelay]);

    const toggleTooltip = useCallback(() => {
        // Hủy các timeout đang chờ để tránh xung đột
        clearTimeouts();
        setVisible(v => !v);
    }, [clearTimeouts]);


    // TỐI ƯU HIỆU SUẤT: Tách useEffect để tạo và hủy popper instance
    useEffect(() => {
        if (!referenceElement || !popperElement) return;

        popperInstanceRef.current = createPopper(referenceElement, popperElement, {
            // Các options ban đầu, sẽ được cập nhật ở useEffect dưới
        });

        return () => {
            if (popperInstanceRef.current) {
                popperInstanceRef.current.destroy();
                popperInstanceRef.current = null;
            }
        };
    }, [referenceElement, popperElement]);

    // TỐI ƯU HIỆU SUẤT: useEffect chỉ để cập nhật options của popper khi cần
    useEffect(() => {
        if (popperInstanceRef.current) {
            popperInstanceRef.current.setOptions({
                placement,
                strategy,
                onFirstUpdate,
                modifiers: [
                    { name: 'arrow', options: { element: arrowElement, padding: 5 } },
                    { name: 'offset', options: { offset } },
                    ...customModifiers,
                ],
            });
        }
    }, [placement, strategy, onFirstUpdate, arrowElement, offset, customModifiers]);


    // LOGIC THÔNG MINH: Quản lý các trigger (hover, focus, click)
    useEffect(() => {
        if (!referenceElement) return;

        const eventHandlers = {};
        
        const handleShow = () => showTooltip();
        const handleHide = () => {
            // Nếu là interactive, chỉ ẩn khi chuột không vào popper
            if (interactive) {
                // Đặt một độ trễ nhỏ để kiểm tra xem chuột có di chuyển vào popper không
                hideTimeoutRef.current = setTimeout(() => {
                     setVisible(false);
                }, 100); // 100ms là đủ để di chuyển chuột
            } else {
                hideTooltip();
            }
        };

        if (trigger.includes('hover')) {
            eventHandlers.mouseenter = handleShow;
            eventHandlers.mouseleave = handleHide;
        }
        if (trigger.includes('focus')) {
            eventHandlers.focus = handleShow;
            eventHandlers.blur = handleHide;
        }
        if (trigger.includes('click')) {
            eventHandlers.click = toggleTooltip;
        }
        
        Object.entries(eventHandlers).forEach(([eventName, handler]) => {
            referenceElement.addEventListener(eventName, handler);
        });

        return () => {
            Object.entries(eventHandlers).forEach(([eventName, handler]) => {
                if (referenceElement) {
                    referenceElement.removeEventListener(eventName, handler);
                }
            });
        };
    }, [referenceElement, trigger.join(','), interactive, showTooltip, hideTooltip, toggleTooltip]); // Thêm interactive vào dependency

    // LOGIC TƯƠNG TÁC: Giữ tooltip mở khi di chuột vào nó
    useEffect(() => {
        if (!popperElement || !interactive || !trigger.includes('hover')) return;

        const handleMouseEnter = () => {
            clearTimeouts(); // Hủy lệnh ẩn tooltip nếu có
        };

        const handleMouseLeave = () => {
            hideTooltip();
        };

        popperElement.addEventListener('mouseenter', handleMouseEnter);
        popperElement.addEventListener('mouseleave', handleMouseLeave);

        return () => {
            popperElement.removeEventListener('mouseenter', handleMouseEnter);
            popperElement.removeEventListener('mouseleave', handleMouseLeave);
        };
    }, [popperElement, interactive, trigger.join(','), clearTimeouts, hideTooltip]);

    // UX & A11Y: Đóng khi click ra ngoài (cho trigger 'click') hoặc nhấn phím 'Escape'
    useEffect(() => {
        if (!visible) return;

        // Xử lý đóng bằng phím Escape
        const handleKeyDown = (event) => {
            if (event.key === 'Escape') {
                hideTooltip();
            }
        };

        // Xử lý đóng khi click ra ngoài
        const handleClickOutside = (event) => {
            if (
                popperElement && !popperElement.contains(event.target) &&
                referenceElement && !referenceElement.contains(event.target)
            ) {
                hideTooltip();
            }
        };

        document.addEventListener('keydown', handleKeyDown);
        if (trigger.includes('click')) {
            document.addEventListener('mousedown', handleClickOutside);
        }

        return () => {
            document.removeEventListener('keydown', handleKeyDown);
            if (trigger.includes('click')) {
                document.removeEventListener('mousedown', handleClickOutside);
            }
        };
    }, [visible, trigger.join(','), popperElement, referenceElement, hideTooltip]);
    
    return {
        visible,
        reference: setReferenceElement,
        popper: setPopperElement,
        arrow: setArrowElement,
        styles: popperInstanceRef.current?.state?.styles?.popper,
        arrowStyles: popperInstanceRef.current?.state?.styles?.arrow,
        attributes: popperInstanceRef.current?.state?.attributes?.popper,
        update: popperInstanceRef.current?.update,
        show: showTooltip,
        hide: hideTooltip,
        toggle: toggleTooltip,
    };
}