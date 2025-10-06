import React, { useState, useRef, useEffect } from 'react';
import { ChevronDown, Loader2 } from 'lucide-react';

interface CustomDropdownProps {
  options: { value: string; label: string }[];
  value: string;
  onChange: (value: string) => void;
  required?: boolean;
  placeholder: string;
  disabled?: boolean;
  tooltipText?: string;
  isLoading?: boolean;
}

const CustomDropdown: React.FC<CustomDropdownProps> = ({
  options,
  value,
  onChange,
  placeholder,
  disabled = false,
  tooltipText,
  isLoading = false,
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const selectedOptionLabel = options.find(opt => opt.value === value)?.label || placeholder;

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

  const dropdownTrigger = (
    <button
      type="button"
      onClick={() => !disabled && !isLoading && setIsOpen(!isOpen)}
      className={`relative w-full px-3 py-2 bg-slate-700/50 border border-slate-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-white placeholder-slate-400 flex justify-between items-center transition-all ${
        disabled || isLoading ? 'cursor-not-allowed opacity-50' : ''
      } ${
        isOpen ? 'ring-2 ring-blue-500' : ''
      }`}
      disabled={disabled || isLoading}
    >
      <span className="flex items-center gap-2">
        {isLoading && <Loader2 className="w-4 h-4 animate-spin" />}
        {selectedOptionLabel}
      </span>
      <ChevronDown className={`w-4 h-4 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
    </button>
  );

  return (
    <div ref={dropdownRef} className={`relative w-full ${isOpen ? 'z-[100]' : 'z-30'}`}>
      {tooltipText && (disabled || isLoading) ? (
        <div className="relative group">
          {dropdownTrigger}
          <div className="absolute bottom-full mb-2 w-max bg-slate-800 text-white text-xs rounded py-1 px-2 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none">
            {tooltipText}
          </div>
        </div>
      ) : (
        dropdownTrigger
      )}

      {isOpen && !isLoading && (
        <div className="absolute z-[110] mt-1 w-full bg-slate-800 border border-slate-700 rounded-lg shadow-lg max-h-60 overflow-y-auto">
          <ul className="py-1">
            {options.map(option => (
              <li
                key={option.value}
                onClick={() => handleSelect(option.value)}
                className="px-3 py-2 text-sm text-slate-300 hover:bg-slate-700 cursor-pointer"
              >
                {option.label}
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
};

export default CustomDropdown; 