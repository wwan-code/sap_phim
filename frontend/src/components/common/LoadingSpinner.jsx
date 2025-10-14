import React, { useEffect } from 'react';
import { createPortal } from 'react-dom';
import PropTypes from 'prop-types';
import classNames from '@/utils/classNames';
import '@/assets/scss/components/common/_loading-spinner.scss';

/**
 * Component hiển thị chỉ báo loading với nhiều biến thể.
 * @param {object} props - Props cho component.
 * @param {'spinner' | 'dots' | 'bar'} [props.variant='spinner'] - Kiểu spinner.
 * @param {'xs' | 'sm' | 'md' | 'lg'} [props.size='md'] - Kích thước.
 * @param {string | React.ReactNode} [props.label] - Nhãn hiển thị bên dưới.
 * @param {number} [props.progress] - Tiến trình (0-100) cho variant 'bar'.
 * @param {boolean} [props.overlay=false] - Hiển thị như một lớp phủ trên component cha.
 * @param {boolean} [props.fullscreen=false] - Hiển thị toàn màn hình.
 * @param {string} [props.className] - Class CSS tùy chỉnh.
 * @param {string} [props.ariaLabel='Đang tải…'] - Nhãn ARIA cho accessibility.
 */
const LoadingSpinner = ({
  variant = 'spinner',
  size = 'md',
  label,
  progress,
  overlay = false,
  fullscreen = false,
  className,
  ariaLabel = 'Đang tải…',
}) => {
  useEffect(() => {
    // Apply side effect when fullscreen is active
    if (fullscreen) {
      // Add class to body to prevent scrolling
      document.body.classList.add('w-body--no-scroll');

      // Cleanup function to remove the class
      return () => {
        document.body.classList.remove('w-body--no-scroll');
      };
    }
  }, [fullscreen]); // Dependency array ensures this runs only when fullscreen prop changes

  // Tạo class động dựa trên props
  const wrapperClasses = classNames(
    'w-spinner',
    `w-spinner--${size}`,
    {
      'w-spinner--variant-dots': variant === 'dots',
      'w-spinner--variant-bar': variant === 'bar',
      'w-spinner--overlay': overlay,
      'w-spinner--fullscreen': fullscreen,
    },
    className
  );

  const renderSpinner = () => {
    switch (variant) {
      case 'dots':
        return (
          <div className="w-spinner__dots" aria-hidden="true">
            <div className="w-spinner__dot"></div>
            <div className="w-spinner__dot"></div>
            <div className="w-spinner__dot"></div>
          </div>
        );
      case 'bar':
        return (
          <div className="w-spinner__bar" role="progressbar" aria-valuenow={progress} aria-valuemin="0" aria-valuemax="100">
            <div className="w-spinner__bar-progress" style={{ width: `${progress}%` }}></div>
          </div>
        );
      case 'spinner':
      default:
        return (
          <svg className="w-spinner__svg" viewBox="25 25 50 50" aria-hidden="true">
            <circle cx="50" cy="50" r="20" fill="none" />
          </svg>
        );
    }
  };

  const SpinnerComponent = (
    <div
      className={wrapperClasses}
      role="status"
      aria-live="polite"
      aria-label={label ? undefined : ariaLabel}
    >
      {renderSpinner()}
      {label && <span className="w-spinner__label">{label}</span>}
    </div>
  );

  // Khi ở chế độ fullscreen, render component vào body thông qua Portal
  // để đảm bảo nó hiển thị trên tất cả các element khác.
  if (fullscreen) {
    return createPortal(SpinnerComponent, document.body);
  }

  return SpinnerComponent;
};

LoadingSpinner.propTypes = {
  variant: PropTypes.oneOf(['spinner', 'dots', 'bar']),
  size: PropTypes.oneOf(['xs', 'sm', 'md', 'lg']),
  label: PropTypes.node,
  progress: PropTypes.number,
  overlay: PropTypes.bool,
  fullscreen: PropTypes.bool,
  className: PropTypes.string,
  ariaLabel: PropTypes.string,
};

export default LoadingSpinner;
