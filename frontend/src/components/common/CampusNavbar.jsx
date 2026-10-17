/**
 * @file CampusNavbar.jsx
 * @description Global campus navigation bar with institutional branding, real auth state, and campus role badges.
 */

import { useState, useEffect } from 'react';
import { NavLink, Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';

export default function CampusNavbar() {
  const [currentTime, setCurrentTime] = useState('');
  const { user, role, isBlockHead, isAdmin, logout } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    const updateTime = () => {
      const now = new Date();
      setCurrentTime(
        now.toLocaleTimeString('en-IN', {
          hour: '2-digit',
          minute: '2-digit',
          second: '2-digit',
          hour12: true,
        })
      );
    };
    updateTime();
    const interval = setInterval(updateTime, 1000);
    return () => clearInterval(interval);
  }, []);

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const navLinkClass = ({ isActive }) =>
    `px-3 py-2 text-xs md:text-sm font-medium rounded-lg transition-colors whitespace-nowrap ${
      isActive
        ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40'
        : 'text-stone-300 hover:text-white hover:bg-slate-800'
    }`;

  const renderRoleBadge = () => {
    if (isAdmin) {
      return (
        <span className="text-[10px] font-bold uppercase tracking-wider bg-rose-500/20 text-rose-300 border border-rose-500/30 px-2 py-0.5 rounded">
          Dean / Admin
        </span>
      );
    }
    if (isBlockHead) {
      return (
        <span className="text-[10px] font-bold uppercase tracking-wider bg-indigo-500/20 text-indigo-300 border border-indigo-500/30 px-2 py-0.5 rounded">
          Block Head
        </span>
      );
    }
    if (role === 'faculty') {
      return (
        <span className="text-[10px] font-bold uppercase tracking-wider bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 px-2 py-0.5 rounded">
          Faculty
        </span>
      );
    }
    return (
      <span className="text-[10px] font-bold uppercase tracking-wider bg-amber-500/20 text-amber-300 border border-amber-500/30 px-2 py-0.5 rounded">
        Student
      </span>
    );
  };

  return (
    <header className="bg-slate-900 border-b border-slate-800 text-stone-100 sticky top-0 z-40 shadow-md">
      {/* Top Banner: Amrita Campus Notice */}
      <div className="bg-amber-500/10 border-b border-amber-500/20 px-4 py-1 text-center text-xs text-amber-300 font-mono tracking-wide flex items-center justify-center gap-2">
        <span className="w-2 h-2 rounded-full bg-amber-400 animate-ping inline-block" />
        <span>AMRITA VISHWA VIDYAPEETHAM • CAMPUS VENUE MANAGEMENT & DIGITAL TWIN SYSTEM</span>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16 gap-4">
          {/* Brand Logo & Title */}
          <Link to="/venues" className="flex items-center gap-3 group shrink-0">
            <img
              src="/logo/amrita-emblem-white.png"
              alt="Amrita Vishwa Vidyapeetham"
              className="h-10 w-auto transition-transform group-hover:scale-105"
            />
            <div className="h-8 w-px bg-slate-700 hidden sm:block" />
            <div>
              <div className="flex items-center gap-2">
                <span className="font-serif text-lg font-bold tracking-tight text-white">
                  BookMyVenue
                </span>
              </div>
              <p className="text-[11px] text-stone-400 hidden sm:block">
                Campus Infrastructure Management
              </p>
            </div>
          </Link>

          {/* Navigation Links */}
          <nav className="flex items-center gap-1 sm:gap-2 overflow-x-auto py-1">
            <NavLink to="/venues" className={navLinkClass}>
              🏛️ Venues
            </NavLink>
            <NavLink to="/recommend" className={navLinkClass}>
              ✨ AI Finder
            </NavLink>
            {user && (
              <NavLink to="/my-bookings" className={navLinkClass}>
                📋 My Bookings
              </NavLink>
            )}
            {(isBlockHead || isAdmin) && (
              <NavLink to="/approvals" className={navLinkClass}>
                ⚖️ Approvals
              </NavLink>
            )}
            <NavLink to="/digital-twin" className={navLinkClass}>
              🌐 Digital Twin
            </NavLink>
            <NavLink to="/what-if" className={navLinkClass}>
              🔮 What-If
            </NavLink>
            {isAdmin && (
              <>
                <NavLink to="/security" className={navLinkClass}>
                  🚨 Security XAI
                </NavLink>
                <NavLink to="/admin" className={navLinkClass}>
                  🛡️ Admin
                </NavLink>
              </>
            )}
          </nav>

          {/* Right utility: Clock & User info */}
          <div className="flex items-center gap-3 shrink-0">
            <div className="hidden xl:flex flex-col text-right font-mono text-xs">
              <span className="text-emerald-400 flex items-center justify-end gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                {currentTime || 'Syncing...'}
              </span>
              <span className="text-stone-400 text-[10px]">CAMPUS TIME</span>
            </div>

            {user ? (
              <div className="flex items-center gap-3">
                <div className="hidden sm:flex flex-col text-right">
                  <span className="text-xs font-semibold text-white leading-tight">
                    {user.name}
                  </span>
                  <div className="mt-0.5">{renderRoleBadge()}</div>
                </div>
                <button
                  onClick={handleLogout}
                  className="text-xs text-stone-300 hover:text-white bg-slate-800 hover:bg-slate-700 px-2.5 py-1.5 rounded border border-slate-700 transition"
                  title="Log out of BookMyVenue"
                >
                  Log out
                </button>
              </div>
            ) : (
              <div className="flex items-center gap-2">
                <Link
                  to="/login"
                  className="text-xs text-stone-200 hover:text-white px-3 py-1.5 rounded border border-slate-700 hover:border-slate-600 transition"
                >
                  Log in
                </Link>
                <Link
                  to="/signup"
                  className="text-xs text-white bg-amber-600 hover:bg-amber-500 px-3 py-1.5 rounded font-medium transition"
                >
                  Sign up
                </Link>
              </div>
            )}
          </div>
        </div>
      </div>
    </header>
  );
}
