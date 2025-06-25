import React, { useState, useRef, useEffect } from 'react';
import styled from 'styled-components';
import CustomTooltip from './CustomTooltip';

interface CustomDropdownProps {
  options: { value: string; label: string }[];
  value: string;
  onChange: (value: string) => void;
  placeholder: string;
  disabled?: boolean;
  tooltipText?: string;
  isLoading?: boolean;
  required?: boolean;
}

const CustomDropdown: React.FC<CustomDropdownProps> = ({
  options,
  value,
  onChange,
  placeholder,
  disabled = false,
  tooltipText,
  isLoading = false,
  required = false
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const selectedOption = options.find(opt => opt.value === value)?.label || placeholder;

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleSelect = (optionValue: string) => {
    onChange(optionValue);
    setIsOpen(false);
  };

  const dropdownContent = (
    <div 
      ref={dropdownRef}
      className={`select ${disabled || isLoading ? 'disabled' : ''} ${isOpen ? 'open' : ''} ${required && !value ? 'required' : ''}`}
      onClick={() => !disabled && !isLoading && setIsOpen(!isOpen)}
    >
      <div className="selected">
        {isLoading ? (
          <div className="loading-wrapper">
            <div className="loading-spinner"></div>
            <span>{placeholder}</span>
          </div>
        ) : (
          selectedOption
        )}
        <svg xmlns="http://www.w3.org/2000/svg" height="1em" viewBox="0 0 512 512" className="arrow">
          <path d="M233.4 406.6c12.5 12.5 32.8 12.5 45.3 0l192-192c12.5-12.5 12.5-32.8 0-45.3s-32.8-12.5-45.3 0L256 338.7 86.6 169.4c-12.5-12.5-32.8-12.5-45.3 0s-12.5 32.8 0 45.3l192 192z" />
        </svg>
      </div>
      <div className={`options ${isOpen && !isLoading ? 'show' : ''}`}>
        {options.map((option) => (
          <div 
            key={option.value} 
            className="option-wrapper"
            onClick={() => handleSelect(option.value)}
          >
            <div className="option">
              {option.label}
            </div>
          </div>
        ))}
      </div>
    </div>
  );

  return (
    <StyledWrapper>
      {((disabled || isLoading) && tooltipText) ? (
        <CustomTooltip text={tooltipText}>
          {dropdownContent}
        </CustomTooltip>
      ) : (
        dropdownContent
      )}
    </StyledWrapper>
  );
};

const StyledWrapper = styled.div`
  .select {
    width: 100%;
    cursor: pointer;
    position: relative;
    transition: 300ms;
    color: white;
    overflow: visible;
    background-color: rgb(51 65 85 / 0.5);
    border: 1px solid rgb(71 85 105);
    border-radius: 0.5rem;
    z-index: 50;
  }

  // .select.required {
  //   border-color: rgb(239 68 68);
  // }

  .select.disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }

  .select.open {
    border-color: rgb(59 130 246);
    z-index: 99999;
  }

  .loading-wrapper {
    display: flex;
    align-items: center;
    gap: 0.5rem;
  }

  .loading-spinner {
    width: 1rem;
    height: 1rem;
    border: 2px solid rgba(255, 255, 255, 0.3);
    border-radius: 50%;
    border-top-color: white;
    animation: spin 1s linear infinite;
  }

  @keyframes spin {
    to {
      transform: rotate(360deg);
    }
  }

  .selected {
    padding: 0.625rem 0.75rem;
    position: relative;
    z-index: 100000;
    font-size: 0.875rem;
    display: flex;
    align-items: center;
    justify-content: space-between;
  }

  .arrow {
    position: relative;
    right: 0px;
    height: 10px;
    transform: rotate(-90deg);
    width: 25px;
    fill: white;
    z-index: 100000;
    transition: 300ms;
  }

  .select.open .arrow {
    transform: rotate(0deg);
  }

  .options {
    display: flex;
    flex-direction: column;
    border-radius: 0.375rem;
    padding: 0.25rem;
    background-color: rgb(51 65 85 / 0.95);
    position: absolute;
    top: 100%;
    left: 0;
    right: 0;
    opacity: 0;
    visibility: hidden;
    transition: all 200ms ease;
    transform: translateY(-10px);
    z-index: 99999;
    border: 1px solid rgb(71 85 105);
    margin-top: 0.25rem;
    box-shadow: 0 4px 6px -1px rgb(0 0 0 / 0.1), 0 2px 4px -2px rgb(0 0 0 / 0.1);
  }

  .options.show {
    opacity: 1;
    visibility: visible;
    transform: translateY(0);
  }

  .option-wrapper {
    cursor: pointer;
    border-radius: 0.375rem;
    transition: 200ms;
  }

  .option-wrapper:hover {
    background-color: rgb(71 85 105 / 0.5);
  }

  .option {
    padding: 0.5rem;
    font-size: 0.875rem;
  }
`;

export default CustomDropdown; 