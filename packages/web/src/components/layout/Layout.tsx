import React from 'react';
import { Header } from './Header';
import { Sidebar } from './Sidebar';
import { useAuthStore } from '../../stores/auth.store';

interface LayoutProps {
  children: React.ReactNode;
  showSidebar?: boolean;
}

export const Layout: React.FC<LayoutProps> = ({ children, showSidebar = true }) => {
  const { isAuthenticated } = useAuthStore();

  return (
    <div className="min-h-screen bg-gray-50">
      <Header />
      <div className="flex">
        {isAuthenticated && showSidebar && <Sidebar />}
        <main className="flex-1">
          <div className="py-6 px-4 sm:px-6 lg:px-8">
            {children}
          </div>
        </main>
      </div>
    </div>
  );
};