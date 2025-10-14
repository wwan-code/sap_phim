import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import classNames from '@/utils/classNames';
import '@/assets/scss/components/common/_multi-select.scss';

const MultiSelect = React.memo(({
    options = [],
    value = [],
    onChange,
    label,
    placeholder = "Select...",
    isSearchable = true,
    isCreatable = false,
    customRenderOption,
    customRenderTag,
    disabled = false,
}) => {
    const [isOpen, setIsOpen] = useState(false);
    const [searchTerm, setSearchTerm] = useState('');
    const [focusedOptionIndex, setFocusedOptionIndex] = useState(-1);
    const containerRef = useRef(null);
    const searchInputRef = useRef(null);
    const dropdownRef = useRef(null);
    const inputGroupRef = useRef(null);

    const filteredOptions = useMemo(() => {
        const lowerCaseSearchTerm = searchTerm.toLowerCase();
        return options.filter(option =>
            option.title.toLowerCase().includes(lowerCaseSearchTerm)
        );
    }, [searchTerm, options]);

    // Handle click outside to close dropdown
    useEffect(() => {
        const handleClickOutside = (event) => {
            if (containerRef.current && !containerRef.current.contains(event.target)) {
                setIsOpen(false);
                setSearchTerm('');
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => {
            document.removeEventListener('mousedown', handleClickOutside);
        };
    }, []);

    useEffect(() => {
        if (isOpen && focusedOptionIndex !== -1 && dropdownRef.current) {
            const focusedElement = dropdownRef.current.querySelector('.multi-select__option--focused');
            if (focusedElement) {
                focusedElement.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
            }
        }
    }, [isOpen, focusedOptionIndex]);

    const handleToggleDropdown = useCallback(() => {
        if (disabled) return;
        setIsOpen(prev => {
            const newState = !prev;
            if (newState && searchInputRef.current) {
                setTimeout(() => searchInputRef.current.focus(), 0);
            }
            if (!newState) {
                setSearchTerm('');
            }
            return newState;
        });
    }, [disabled]);

    const handleSearchChange = useCallback((e) => {
        setSearchTerm(e.target.value);
        setIsOpen(true); // Open dropdown if typing
    }, []);

    const handleOptionClick = useCallback((option) => {
        if (disabled) return;
        let newSelectedValue;
        if (value.some(selected => selected.id === option.id)) {
            newSelectedValue = value.filter(selected => selected.id !== option.id);
        } else {
            newSelectedValue = [...value, option];
        }
        onChange(newSelectedValue);
        setSearchTerm('');
        if (!isCreatable) {
            setIsOpen(false);
            inputGroupRef.current?.focus(); // Return focus to the input group
        }
    }, [value, onChange, isCreatable, disabled]);

    const handleRemoveTag = useCallback((id, e) => {
        if (disabled) return;
        e.stopPropagation();
        const newSelectedValue = value.filter(selected => selected.id !== id);
        onChange(newSelectedValue);
        searchInputRef.current?.focus();
    }, [value, onChange, disabled]);

    const handleClearAll = useCallback((e) => {
        if (disabled) return;
        e.stopPropagation();
        onChange([]);
        setIsOpen(false);
        setSearchTerm('');
        inputGroupRef.current?.focus(); // Return focus to the input group
    }, [onChange, disabled]);

    const handleCreateNewOption = useCallback(() => {
        if (disabled || searchTerm.trim() === '') return;
        const newOption = { id: searchTerm.trim(), title: searchTerm.trim() }; // Assuming id and title are the same for new options
        onChange([...value, newOption]);
        setSearchTerm('');
        setIsOpen(false);
        inputGroupRef.current?.focus(); // Return focus to the input group
    }, [value, onChange, searchTerm, disabled]);

    const handleKeyDown = useCallback((e) => {
        if (disabled) return;

        switch (e.key) {
            case 'ArrowDown':
                e.preventDefault();
                if (!isOpen) {
                    setIsOpen(true);
                    setFocusedOptionIndex(0);
                } else {
                    setFocusedOptionIndex(prev => (prev + 1) % filteredOptions.length);
                }
                break;
            case 'ArrowUp':
                e.preventDefault();
                if (isOpen) {
                    setFocusedOptionIndex(prev => (prev - 1 + filteredOptions.length) % filteredOptions.length);
                }
                break;
            case 'Enter':
                e.preventDefault();
                if (isOpen && focusedOptionIndex !== -1) {
                    handleOptionClick(filteredOptions[focusedOptionIndex]);
                } else if (isCreatable && searchTerm.trim() !== '') {
                    handleCreateNewOption();
                } else if (!isOpen) {
                    handleToggleDropdown();
                }
                break;
            case 'Escape':
                e.preventDefault();
                setIsOpen(false);
                setSearchTerm('');
                searchInputRef.current?.blur();
                inputGroupRef.current?.focus(); // Return focus to the input group
                break;
            case 'Tab':
                // Allow tab to move focus out of the component
                setIsOpen(false);
                setSearchTerm('');
                break;
            case 'Backspace':
                if (searchTerm === '' && value.length > 0) {
                    // Remove last selected item if search is empty
                    const newSelectedValue = value.slice(0, -1);
                    onChange(newSelectedValue);
                }
                break;
            default:
                if (!isOpen && isSearchable && e.key.length === 1) { // Only open if a single character is typed
                    setIsOpen(true);
                }
                break;
        }
    }, [isOpen, focusedOptionIndex, filteredOptions, handleOptionClick, isCreatable, searchTerm, handleCreateNewOption, handleToggleDropdown, value, onChange, isSearchable, disabled]);

    const showClearAll = value.length > 0;
    const showCreateNew = isCreatable && searchTerm.trim() !== '' && !filteredOptions.some(opt => opt.title.toLowerCase() === searchTerm.toLowerCase());
    const showPlaceholder = value.length === 0 && searchTerm === '';

    return (
        <div
            className={classNames("multi-select", {
                "multi-select--open": isOpen,
                "multi-select--disabled": disabled,
                "multi-select--has-value": value.length > 0,
            })}
            ref={containerRef}
            onKeyDown={handleKeyDown}
            role="combobox"
            aria-haspopup="listbox"
            aria-expanded={isOpen}
            aria-controls="multi-select-dropdown-list"
        >
            {label && <label className="multi-select__label">{label}</label>}
            <div
                className="multi-select__input-group"
                onClick={handleToggleDropdown}
                tabIndex={disabled ? -1 : 0}
                ref={inputGroupRef}
                aria-label={label || placeholder}
            >
                <ul className="multi-select__selection-tags">
                    {value.map((item) => (
                        customRenderTag ? customRenderTag(item, (e) => handleRemoveTag(item.id, e)) : (
                            <li key={item.id} className="multi-select__tag">
                                {item.title}
                                <button
                                    type="button"
                                    className="multi-select__tag-delete"
                                    onClick={(e) => handleRemoveTag(item.id, e)}
                                    disabled={disabled}
                                    aria-label={`Remove ${item.title}`}
                                >
                                    &times;
                                </button>
                            </li>
                        )
                    ))}
                    {showPlaceholder && (
                        <span className="multi-select__placeholder">{placeholder}</span>
                    )}
                </ul>
                <div className="multi-select__indicators">
                    {showClearAll && (
                        <button
                            type="button"
                            className="multi-select__clear-all"
                            onClick={handleClearAll}
                            disabled={disabled}
                            aria-label="Clear all selected items"
                        >
                            &times;
                        </button>
                    )}
                    <span className="multi-select__dropdown-indicator"></span>
                </div>
            </div>

            <div
                ref={dropdownRef}
                id="multi-select-dropdown-list"
                className={classNames("multi-select__dropdown", { "multi-select__dropdown--open": isOpen })}
                role="listbox"
                aria-hidden={!isOpen}
            >
                {isSearchable && (
                    <div className="multi-select__search-wrapper">
                        <input
                            type="search"
                            className="multi-select__search-input"
                            autoComplete="off"
                            value={searchTerm}
                            onChange={handleSearchChange}
                            ref={searchInputRef}
                            placeholder="Search..."
                            disabled={disabled}
                            aria-label="Search options"
                        />
                    </div>
                )}
                <div className="multi-select__options">
                    {filteredOptions.length > 0 ? (
                        filteredOptions.map((option, index) => (
                            customRenderOption ? customRenderOption(option, value.some(selected => selected.id === option.id), index === focusedOptionIndex) : (
                                <div
                                    key={option.id}
                                    className={classNames("multi-select__option", {
                                        "multi-select__option--selected": value.some(selected => selected.id === option.id),
                                        "multi-select__option--focused": index === focusedOptionIndex
                                    })}
                                    onClick={() => handleOptionClick(option)}
                                    role="option"
                                    aria-selected={value.some(selected => selected.id === option.id)}
                                >
                                    {option.title}
                                </div>
                            )
                        ))
                    ) : (
                        !showCreateNew && <div className="multi-select__option multi-select__option--no-results">No options found.</div>
                    )}
                </div>
                {showCreateNew && (
                    <div className="multi-select__create-new" onClick={handleCreateNewOption} role="option">
                        Create "{searchTerm}"
                    </div>
                )}
            </div>
        </div>
    );
});

export default MultiSelect;
