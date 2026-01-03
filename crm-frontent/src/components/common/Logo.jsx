import React from 'react';

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
      <img 
        src="/logo.jpg" 
        alt="CRM Logo" 
        className={`${sizeClasses[size]} object-contain rounded-lg shadow-sm`}
      />
      {showText && (
        <div className="flex flex-col">
          <h1 className={`${textSizeClasses[size]} font-bold text-primary-600`}>
            IT CRM System
          </h1>
          {size === 'large' || size === 'xlarge' ? (
            <p className="text-gray-500 text-sm">Management System</p>
          ) : null}
        </div>
      )}
    </div>
  );
};

export default Logo;