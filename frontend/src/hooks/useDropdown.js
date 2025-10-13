import { useState, useEffect, useCallback, useRef, useMemo } from 'react';

const DEFAULT_CONFIG = {
  closeOnEscape: true,
  closeOnClickOutside: true,
  closeOnScroll: false,
  preventAutoFocus: false,
  ariaLabel: 'Dropdown menu',
};

export const useDropdown = () => {
  const [openDropdownId, setOpenDropdownId] = useState(null);
  const [configs, setConfigs] = useState(new Map());
  
  // Use Map for better performance with multiple dropdowns
  const dropdownRefs = useRef(new Map());
  const configsRef = useRef(new Map());
  const refCallbacks = useRef(new Map());

  // Sync configs to ref for event handlers
  useEffect(() => {
    configsRef.current = configs;
  }, [configs]);

  // Memoized helper functions
  const isOpen = useCallback((id) => {
    if (!id) return false;
    return openDropdownId === id;
  }, [openDropdownId]);

  const open = useCallback((id, config = {}) => {
    if (!id) {
      console.warn('useDropdown: dropdown id is required');
      return;
    }

    setOpenDropdownId(id);
    
    if (Object.keys(config).length > 0) {
      setConfigs(prev => new Map(prev.set(id, { ...DEFAULT_CONFIG, ...config })));
    }

    // Focus management for accessibility
    const element = dropdownRefs.current.get(id);
    if (element && !config.preventAutoFocus) {
      // Small delay to ensure DOM is updated
      setTimeout(() => {
        const focusableElement = element.querySelector(
          'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
        );
        
        if (focusableElement) {
          focusableElement.focus();
        }
      }, 10);
    }
  }, []);

  const close = useCallback((id = null) => {
    if (id && openDropdownId !== id) return;
    
    const previousDropdownId = openDropdownId;
    setOpenDropdownId(null);
    
    // Return focus to trigger element for accessibility
    if (previousDropdownId) {
      const triggerElement = document.querySelector(
        `[aria-controls="${previousDropdownId}"]`
      );
      
      if (triggerElement) {
        triggerElement.focus();
      }
    }
  }, [openDropdownId]);

  const toggle = useCallback((id, config = {}) => {
    if (!id) {
      console.warn('useDropdown: dropdown id is required');
      return;
    }
    
    if (isOpen(id)) {
      close(id);
    } else {
      open(id, config);
    }
  }, [isOpen, open, close]);

  const registerDropdown = useCallback((id, element) => {
    if (!id) {
      console.warn('useDropdown: dropdown id is required for registration');
      return;
    }

    if (element) {
      dropdownRefs.current.set(id, element);
    } else {
      dropdownRefs.current.delete(id);
      setConfigs(prev => {
        const newConfigs = new Map(prev);
        newConfigs.delete(id);
        return newConfigs;
      });
    }
  }, []);

  // Enhanced event handlers with better error handling
  useEffect(() => {
    if (!openDropdownId) return;

    const currentConfig = configsRef.current.get(openDropdownId) || DEFAULT_CONFIG;

    const handleClickOutside = (event) => {
      if (!currentConfig.closeOnClickOutside || !openDropdownId) return;

      const target = event.target;
      const dropdownElement = dropdownRefs.current.get(openDropdownId);
      
      if (!dropdownElement || !target) return;

      // Check if click is outside dropdown and its trigger
      const triggerElement = document.querySelector(`[aria-controls="${openDropdownId}"]`);
      const isInsideDropdown = dropdownElement.contains(target);
      const isInsideTrigger = triggerElement && triggerElement.contains(target);

      if (!isInsideDropdown && !isInsideTrigger) {
        close(openDropdownId);
      }
    };

    const handleKeyDown = (event) => {
      if (!openDropdownId) return;

      const { key } = event;
      const dropdownElement = dropdownRefs.current.get(openDropdownId);

      if (key === 'Escape' && currentConfig.closeOnEscape) {
        event.preventDefault();
        close(openDropdownId);
        return;
      }

      // Enhanced keyboard navigation
      if (dropdownElement && (key === 'ArrowDown' || key === 'ArrowUp')) {
        event.preventDefault();
        
        const focusableElements = Array.from(
          dropdownElement.querySelectorAll(
            'button:not([disabled]), [href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"]):not([disabled])'
          )
        );

        if (focusableElements.length === 0) return;

        const currentIndex = focusableElements.indexOf(document.activeElement);
        let nextIndex;

        if (key === 'ArrowDown') {
          nextIndex = currentIndex < focusableElements.length - 1 ? currentIndex + 1 : 0;
        } else {
          nextIndex = currentIndex > 0 ? currentIndex - 1 : focusableElements.length - 1;
        }

        focusableElements[nextIndex] && focusableElements[nextIndex].focus();
      }
    };

    const handleScroll = () => {
      if (currentConfig.closeOnScroll && openDropdownId) {
        close(openDropdownId);
      }
    };

    // Add event listeners
    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('keydown', handleKeyDown);
    
    if (currentConfig.closeOnScroll) {
      document.addEventListener('scroll', handleScroll, true);
    }

    // Cleanup
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleKeyDown);
      document.removeEventListener('scroll', handleScroll, true);
    };
  }, [openDropdownId, close]);

  // Helper function to get dropdown props for accessibility
  const getDropdownProps = useCallback((id, config = {}) => {
    if (!id) {
      console.warn('useDropdown: dropdown id is required for getDropdownProps');
      return {};
    }
    const role = config.role || 'menu';
    const ariaLabel = config.ariaLabel || DEFAULT_CONFIG.ariaLabel;

    let refCb = refCallbacks.current.get(id);
    if (!refCb) {
      refCb = (element) => registerDropdown(id, element);
      refCallbacks.current.set(id, refCb);
    }

    return {
      ref: refCb,
      'data-dropdown-open': isOpen(id),
      id: id,
      role,
      'aria-label': ariaLabel,
    };
  }, [isOpen, registerDropdown]);

  // Helper function to get trigger props for accessibility
  const getTriggerProps = useCallback((id, config = {}) => {
    if (!id) {
      console.warn('useDropdown: dropdown id is required for getTriggerProps');
      return {};
    }
    const roleHint = config.role && ['menu','dialog','listbox','tree','grid'].includes(config.role) ? config.role : 'menu';
    const ariaLabel = config.ariaLabel;
    return {
      'aria-expanded': isOpen(id),
      'aria-haspopup': roleHint,
      'aria-controls': id,
      ...(ariaLabel ? { 'aria-label': ariaLabel } : {}),
      onClick: () => toggle(id, config),
      onKeyDown: (event) => {
        if (event.key === 'Enter' || event.key === ' ') {
          event.preventDefault();
          toggle(id, config);
        } else if (event.key === 'ArrowDown') {
          event.preventDefault();
          if (!isOpen(id)) {
            toggle(id, config);
          }
          const dropdownElement = dropdownRefs.current.get(id);
          if (dropdownElement) {
            const firstFocusable = dropdownElement.querySelector('button:not([disabled]), [href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"]):not([disabled])');
            if (firstFocusable) firstFocusable.focus();
          }
        }
      },
      role: 'button',
      tabIndex: 0,
    };
  }, [isOpen, toggle]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      dropdownRefs.current.clear();
      refCallbacks.current.clear();
      setConfigs(new Map());
    };
  }, []);

  // Memoize return object to prevent unnecessary re-renders
  return useMemo(() => ({
    openDropdownId,
    isOpen,
    open,
    close,
    toggle,
    registerDropdown,
    getDropdownProps,
    getTriggerProps,
  }), [
    openDropdownId,
    isOpen,
    open,
    close,
    toggle,
    registerDropdown,
    getDropdownProps,
    getTriggerProps,
  ]);
};