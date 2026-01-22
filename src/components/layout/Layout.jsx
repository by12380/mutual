import { Outlet, useLocation } from 'react-router-dom';
import BottomNav from './BottomNav';

/**
 * Main layout component with bottom navigation
 * Wraps all authenticated pages
 */
export default function Layout() {
  const location = useLocation();
  
  // Hide bottom nav on chat page for full-screen experience
  const hideNav = location.pathname.startsWith('/chat/');

  return (
    <div className="min-h-screen bg-gray-50">
      <main className={hideNav ? '' : 'pb-16'}>
        <Outlet />
      </main>
      {!hideNav && <BottomNav />}
    </div>
  );
}
