import React, { useEffect, useRef, useCallback, useState } from 'react';
import ReactDOM from 'react-dom';
import PropTypes from 'prop-types';
import classNames from '@/utils/classNames';
import '@/assets/scss/components/common/_modal.scss';

/**
 * Component Modal có thể tùy chỉnh, hỗ trợ a11y đầy đủ.
 * @param {object} props - Props cho component.
 * @param {boolean} props.isOpen - Trạng thái mở/đóng của modal.
 * @param {() => void} props.onClose - Callback được gọi khi modal yêu cầu đóng.
 * @param {string | React.ReactNode} [props.title] - Tiêu đề của modal.
 * @param {'sm'|'md'|'lg'|'xl'|'fullscreen'|'sheet'} [props.size='md'] - Kích thước modal.
 * @param {boolean} [props.closeOnEsc=true] - Đóng modal khi nhấn phím ESC.
 * @param {boolean} [props.closeOnOutsideClick=true] - Đóng modal khi click bên ngoài.
 * @param {React.ReactNode} [props.footer] - Nội dung footer của modal.
 * @param {React.ReactNode} props.children - Nội dung chính của modal.
 * @param {React.Ref<HTMLElement>} [props.initialFocusRef] - Ref tới element sẽ được focus khi modal mở.
 * @param {boolean} [props.preventScroll=true] - Ngăn cuộn trang nền khi modal mở.
 * @param {number} [props.zIndex] - Tùy chỉnh z-index.
 * @param {string} [props.className] - Class CSS tùy chỉnh.
 * @param {string} [props.ariaDescribedBy] - ID của element mô tả modal.
 */
const Modal = ({
  isOpen,
  onClose,
  title,
  size = 'md',
  closeOnEsc = true,
  closeOnOutsideClick = true,
  footer,
  children,
  initialFocusRef,
  preventScroll = true,
  zIndex,
  className,
  ariaDescribedBy,
}) => {
  const modalRef = useRef(null);
  const lastActiveElement = useRef(null);
  const [shouldRender, setShouldRender] = useState(false);
  const [isAnimating, setIsAnimating] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setShouldRender(true);
      const animationTimeout = setTimeout(() => {
        setIsAnimating(true);
      }, 10);
      return () => clearTimeout(animationTimeout);
    } else {
      setIsAnimating(false);
      const unmountTimeout = setTimeout(() => {
        setShouldRender(false);
      }, 300);
      return () => clearTimeout(unmountTimeout);
    }
  }, [isOpen]);

  // Xử lý đóng modal bằng phím ESC
  const handleKeyDown = useCallback((event) => {
    if (event.key === 'Escape' && closeOnEsc) {
      onClose();
    }
  }, [closeOnEsc, onClose]);

  // Xử lý focus trap
  const handleFocusTrap = useCallback((event) => {
    if (event.key !== 'Tab' || !modalRef.current) return;

    const focusableElements = modalRef.current.querySelectorAll(
      'a[href], button, textarea, input[type="text"], input[type="radio"], input[type="checkbox"], select'
    );
    const firstElement = focusableElements[0];
    const lastElement = focusableElements[focusableElements.length - 1];

    if (event.shiftKey) { // Shift + Tab
      if (document.activeElement === firstElement) {
        lastElement.focus();
        event.preventDefault();
      }
    } else { // Tab
      if (document.activeElement === lastElement) {
        firstElement.focus();
        event.preventDefault();
      }
    }
  }, []);

  useEffect(() => {
    if (isOpen) {
      // Lưu lại element đang focus trước khi mở modal
      lastActiveElement.current = document.activeElement;

      // Ngăn cuộn trang
      if (preventScroll) {
        document.body.style.overflow = 'hidden';
      }

      // Thêm event listeners
      document.addEventListener('keydown', handleKeyDown);
      document.addEventListener('keydown', handleFocusTrap);

      // Set focus vào modal hoặc element được chỉ định
      setTimeout(() => {
        if (initialFocusRef && initialFocusRef.current) {
          initialFocusRef.current.focus();
        } else if (modalRef.current) {
          modalRef.current.focus();
        }
      }, 100); // Timeout nhỏ để đảm bảo modal đã render

      // Cleanup effect
      return () => {
        document.removeEventListener('keydown', handleKeyDown);
        document.removeEventListener('keydown', handleFocusTrap);
        if (preventScroll) {
          document.body.style.overflow = '';
        }
        // Khôi phục focus
        if (lastActiveElement.current) {
          lastActiveElement.current.focus();
        }
      };
    }
  }, [isOpen, preventScroll, handleKeyDown, handleFocusTrap, initialFocusRef]);

  if (!shouldRender) {
    return null;
  }

  const backdropClasses = classNames('w-modal__backdrop', { 'w-modal__backdrop--open': isAnimating });
  const dialogClasses = classNames('w-modal__dialog', className);
  const modalWrapperClasses = classNames('w-modal', `w-modal--${size}`);

  return ReactDOM.createPortal(
    <div className={modalWrapperClasses} style={{ zIndex }}>
      <div
        className={backdropClasses}
        onClick={closeOnOutsideClick ? onClose : undefined}
      >
        <div
          ref={modalRef}
          className={dialogClasses}
          role="dialog"
          aria-modal="true"
          aria-labelledby={title ? 'modal-title' : undefined}
          aria-describedby={ariaDescribedBy}
          onClick={(e) => e.stopPropagation()} // Ngăn event click lan ra backdrop
          tabIndex={-1} // Cho phép focus vào dialog
        >
          {title && (
            <div className="w-modal__header">
              <h2 id="modal-title" className="w-modal__title">{title}</h2>
              <button onClick={onClose} className="w-modal__close" aria-label="Đóng modal">&times;</button>
            </div>
          )}
          <div className="w-modal__body">
            {children}
          </div>
          {footer && (
            <div className="w-modal__footer">
              {footer}
            </div>
          )}
        </div>
      </div>
    </div>,
    document.body
  );
};

Modal.propTypes = {
  isOpen: PropTypes.bool.isRequired,
  onClose: PropTypes.func.isRequired,
  title: PropTypes.node,
  size: PropTypes.oneOf(['sm', 'md', 'lg', 'xl', 'fullscreen', 'sheet']),
  closeOnEsc: PropTypes.bool,
  closeOnOutsideClick: PropTypes.bool,
  footer: PropTypes.node,
  children: PropTypes.node.isRequired,
  initialFocusRef: PropTypes.shape({ current: PropTypes.instanceOf(Element) }),
  preventScroll: PropTypes.bool,
  zIndex: PropTypes.number,
  className: PropTypes.string,
  ariaDescribedBy: PropTypes.string,
};

export default Modal;
