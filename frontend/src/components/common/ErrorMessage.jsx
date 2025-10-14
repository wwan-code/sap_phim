import React, { useState } from 'react';
import PropTypes from 'prop-types';
import classNames from '@/utils/classNames';
import '@/assets/scss/components/common/_error-message.scss';

// Simple default icon
const DefaultErrorIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="12" cy="12" r="10"></circle>
    <line x1="12" y1="8" x2="12" y2="12"></line>
    <line x1="12" y1="16" x2="12.01" y2="16"></line>
  </svg>
);

/**
 * Component để hiển thị thông báo lỗi một cách linh hoạt.
 * @param {object} props - Props cho component.
 * @param {string} props.title - Tiêu đề của lỗi.
 * @param {string | React.ReactNode} props.message - Nội dung thông báo lỗi.
 * @param {string | React.ReactNode} [props.details] - Chi tiết kỹ thuật của lỗi.
 * @param {'inline' | 'card' | 'banner' | 'toast'} [props.variant='inline'] - Kiểu hiển thị.
 * @param {() => void} [props.onRetry] - Callback khi nhấn nút "Thử lại".
 * @param {{label: string; onClick: () => void; kind?: 'primary' | 'ghost'}[]} [props.actions] - Mảng các hành động tùy chỉnh.
 * @param {string} [props.code] - Mã lỗi để copy.
 * @param {boolean} [props.copyable=false] - Cho phép copy mã lỗi hoặc chi tiết.
 * @param {boolean} [props.dismissible=false] - Cho phép đóng thông báo.
 * @param {React.ReactNode} [props.icon] - Icon tùy chỉnh.
 * @param {string} [props.className] - Class CSS tùy chỉnh.
 */
const ErrorMessage = ({
  title,
  message,
  details,
  variant = 'inline',
  onRetry,
  actions,
  code,
  copyable = false,
  dismissible = false,
  icon = <DefaultErrorIcon />,
  className,
}) => {
  const [isVisible, setIsVisible] = useState(true);
  const [isCopied, setIsCopied] = useState(false);

  // Logic ẩn component khi người dùng đóng
  if (!isVisible) {
    return null;
  }

  const handleDismiss = () => {
    setIsVisible(false);
  };

  const handleCopy = () => {
    const contentToCopy = code || (typeof details === 'string' ? details : '');
    navigator.clipboard.writeText(contentToCopy).then(() => {
      setIsCopied(true);
      setTimeout(() => setIsCopied(false), 2000); // Reset trạng thái sau 2s
    });
  };

  const baseClassName = 'w-error';
  const componentClasses = classNames(
    baseClassName,
    `${baseClassName}--${variant}`,
    // Giả sử 'critical' là mặc định, có thể thêm prop `severity` để tùy chỉnh
    `${baseClassName}--critical`,
    className
  );

  const role = variant === 'banner' || variant === 'toast' ? 'alert' : undefined;
  const ariaLive = variant === 'banner' || variant === 'toast' ? 'assertive' : undefined;

  return (
    <div className={componentClasses} role={role} aria-live={ariaLive}>
      <div className={`${baseClassName}__header`}>
        <div className={`${baseClassName}__icon`} aria-hidden="true">{icon}</div>
        <h3 className={`${baseClassName}__title`}>{title}</h3>
        {dismissible && (
          <button onClick={handleDismiss} className={`${baseClassName}__close`} aria-label="Đóng thông báo">
            &times;
          </button>
        )}
      </div>
      <div className={`${baseClassName}__body`}>
        <p className={`${baseClassName}__msg`}>{message}</p>
        {details && (
          <pre className={`${baseClassName}__details`}>
            <code>{details}</code>
          </pre>
        )}
      </div>
      <div className={`${baseClassName}__actions`}>
        {onRetry && <button className={`${baseClassName}__action-btn ${baseClassName}__action-btn--primary`} onClick={onRetry}>Thử lại</button>}
        {copyable && (code || details) && (
          <button className={`${baseClassName}__action-btn ${baseClassName}__action-btn--secondary`} onClick={handleCopy}>{isCopied ? 'Đã sao chép!' : 'Sao chép'}</button>
        )}
        {actions && actions.map((action, index) => (
          <button key={index} onClick={action.onClick} className={`${baseClassName}__action-btn ${baseClassName}__action-btn--${action.kind || 'ghost'}`}>
            {action.label}
          </button>
        ))}
      </div>
    </div>
  );
};

ErrorMessage.propTypes = {
  title: PropTypes.string.isRequired,
  message: PropTypes.node.isRequired,
  details: PropTypes.node,
  variant: PropTypes.oneOf(['inline', 'card', 'banner', 'toast']),
  onRetry: PropTypes.func,
  actions: PropTypes.arrayOf(PropTypes.shape({
    label: PropTypes.string.isRequired,
    onClick: PropTypes.func.isRequired,
    kind: PropTypes.oneOf(['primary', 'ghost']),
  })),
  code: PropTypes.string,
  copyable: PropTypes.bool,
  dismissible: PropTypes.bool,
  icon: PropTypes.node,
  className: PropTypes.string,
};

export default ErrorMessage;
