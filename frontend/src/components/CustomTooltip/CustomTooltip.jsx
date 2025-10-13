import { forwardRef } from 'react';
import classNames from '@/utils/classNames';

/**
 * @typedef {Object} CustomTooltipProps
 * @property {string} [id]
 * @property {import('react').ReactNode} children
 * @property {string} [placement]
 * @property {{ ref?: import('react').Ref<HTMLElement>, style?: import('react').CSSProperties }} [arrowProps]
 * @property {import('react').CSSProperties} [style]
 * @property {string} [className]
 * @property {string} [role]
 * @property {boolean} [show]
 */

const CustomTooltip = forwardRef(
    /** @param {CustomTooltipProps & import('react').HTMLAttributes<HTMLDivElement>} props */
    ( { id, children, placement, arrowProps, style, className, role = 'tooltip', show, ...popperAttributes }, ref) => {
        return (
            <div
                ref={ref}
                id={id}
                role={role}
                className={classNames(
                    'custom-tooltip',
                    'fade',
                    { 'show': show },
                    placement && `bs-tooltip-${placement.split('-')[0]}`,
                    className
                )}
                style={style}
                {...popperAttributes}
            >
                <div
                    className="custom-tooltip-arrow"
                    ref={arrowProps?.ref}
                    style={arrowProps?.style}
                    data-popper-arrow
                />
                <div className="custom-tooltip-inner">
                    {children}
                </div>
            </div>
        );
    }
);

CustomTooltip.displayName = 'CustomTooltip';

export default CustomTooltip;