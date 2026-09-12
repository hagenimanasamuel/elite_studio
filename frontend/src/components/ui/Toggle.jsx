import React from 'react';

// Accessible toggle switch (Tailwind, no animation lib needed)
const Toggle = ({ checked, onChange, label, description, disabled }) => (
  <label
    className={`flex items-start justify-between gap-3 cursor-pointer select-none ${
      disabled ? 'opacity-50 pointer-events-none' : ''
    }`}
  >
    <span className="flex-1">
      {label && <span className="block text-white text-sm font-medium">{label}</span>}
      {description && <span className="block text-gray-500 text-xs mt-0.5">{description}</span>}
    </span>
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={label}
      onClick={() => onChange(!checked)}
      className={`
        relative inline-flex h-6 w-11 flex-shrink-0 items-center rounded-full border transition-colors duration-200
        ${checked ? 'bg-amber border-amber' : 'bg-charcoal/70 border-white/15'}
      `}
    >
      <span
        className={`
          inline-block h-4 w-4 transform rounded-full bg-white shadow transition-transform duration-200
          ${checked ? 'translate-x-6' : 'translate-x-1'}
        `}
      />
    </button>
  </label>
);

export default Toggle;
