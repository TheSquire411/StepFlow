import React, { useState } from 'react';
import { Link } from 'react-router-dom';

interface MenuItem {
  label: string;
  href: string;
  icon?: React.ReactNode;
}

interface MobileMenuProps {
  items: MenuItem[];
  isOpen: boolean;
  onClose: () => void;
  className?: string;
}

export const MobileMenu: React.FC<MobileMenuProps> = ({
  items,
  isOpen,
  onClose,
  className = ''
}) => {
  if (!isOpen) return null;

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black bg-opacity-50 z-40 md:hidden"
        onClick={onClose}
      />
      
      {/* Menu */}
      <div className={`fixed top-0 left-0 h-full w-64 bg-white shadow-lg z-50 transform transition-transform duration-300 ease-in-out md:hidden ${className}`}>
        <div className="flex flex-col h-full">
          {/* Header */}
          <div className="flex items-center justify-between p-4 border-b">
            <h2 className="text-lg font-semibold text-gray-900">Menu</h2>
            <button
              onClick={onClose}
              className="p-2 rounded-md text-gray-400 hover:text-gray-600 hover:bg-gray-100"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          {/* Menu Items */}
          <nav className="flex-1 px-4 py-6 space-y-2">
            {items.map((item, index) => (
              <Link
                key={index}
                to={item.href}
                onClick={onClose}
                className="flex items-center px-3 py-2 text-gray-700 rounded-md hover:bg-gray-100 hover:text-gray-900 transition-colors"
              >
                {item.icon && <span className="mr-3">{item.icon}</span>}
                {item.label}
              </Link>
            ))}
          </nav>
        </div>
      </div>
    </>
  );
};