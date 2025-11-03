import React from 'react';

// FIX: Add props interface to accept a 'size' prop.
interface SpinnerProps {
  size?: 'sm' | 'md' | 'lg';
}

// FIX: Update component signature to accept props and provide a default value.
const Spinner: React.FC<SpinnerProps> = ({ size = 'md' }) => {
  // FIX: Define size classes to dynamically change spinner size.
  const sizeClasses = {
    sm: 'h-4 w-4',
    md: 'h-5 w-5',
    lg: 'h-8 w-8',
  };

  return (
    <svg
      // FIX: Use a dynamic className based on the 'size' prop.
      className={`animate-spin ${sizeClasses[size]}`}
      xmlns="http://www.w3.org/2000/svg"
      fill="none"
      viewBox="0 0 24 24"
    >
      <circle
        className="opacity-25"
        cx="12"
        cy="12"
        r="10"
        stroke="currentColor"
        strokeWidth="4"
      ></circle>
      <path
        className="opacity-75"
        fill="currentColor"
        d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
      ></path>
    </svg>
  );
};

export default Spinner;
