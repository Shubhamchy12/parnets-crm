import React from 'react';
import { FaMicrochip } from 'react-icons/fa';

const Logo = ({ size = 'medium', showText = true, className = '' }) => {
  const sizeClasses = {
    small: 'h-8 w-8',
    medium: 'h-12 w-12',
    large: 'h-16 w-16',
    xlarge: 'h-24 w-24'
  };

  const textSizeClasses = {
    small: 'text-lg',
    medium: 'text-xl',
    large: 'text-2xl',
    xlarge: 'text-3xl'
  };

  return (
    <div className={`flex items-center space-x-3 logo-container ${className}`}>
      <div className="relative">
        {/* Try to load the actual logo first, fallback to icon */}
        <img 
          src="/logo.jpg" 
          alt="CRM Logo" 
          className={`${sizeClasses[size]} object-contain rounded-lg shadow-sm`}
          onError={(e) => {
            // If image fails to load, replace with icon
            e.target.style.display = 'none';
            e.target.nextSibling.style.display = 'flex';
          }}
        />
        {/* Fallback icon */}
        <div 
          className={`${sizeClasses[size]} bg-gradient-to-br from-blue-500 to-indigo-600 rounded-lg shadow-lg items-center justify-center text-white hidden`}
          style={{ display: 'none' }}
        >
          <FaMicrochip className="w-1/2 h-1/2" />
        </div>
      </div>
      {showText && (
        <div className="flex flex-col">
          <h1 className={`${textSizeClasses[size]} font-bold text-white`}>
            IT CRM System
          </h1>
          {size === 'large' || size === 'xlarge' ? (
            <p className="text-blue-200 text-sm">Management System</p>
          ) : null}
        </div>
      )}
    </div>
  );
};

export default Logo;