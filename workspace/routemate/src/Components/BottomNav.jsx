import React from 'react';
import { NavLink } from 'react-router-dom';
import { Home, Users, Radio, Compass, Shield, User } from 'lucide-react';
import '../BottomNav.css';

const TABS = [
  { to: '/home',     icon: Home,    label: 'Home'     },
  { to: '/pods',     icon: Users,   label: 'Pods'     },
  { to: '/feed',     icon: Radio,   label: 'Feed'     },
  { to: '/discover', icon: Compass, label: 'Discover' },
  { to: '/safety',   icon: Shield,  label: 'Safety'   },
  { to: '/profile',  icon: User,    label: 'Profile'  },
];

export default function BottomNav() {
  return (
    <nav className="bottom-nav" aria-label="Main navigation">
      {TABS.map(({ to, icon: Icon, label }) => (
        <NavLink
          key={to}
          to={to}
          className={({ isActive }) =>
            'nav-tab' + (isActive ? ' nav-tab--active' : '')
          }
          aria-label={label}
        >
          <Icon size={20} strokeWidth={1.75} aria-hidden="true" />
          <span className="nav-tab__label">{label}</span>
        </NavLink>
      ))}
    </nav>
  );
}