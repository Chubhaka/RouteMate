import React from 'react';
import { NavLink } from 'react-router-dom';
import { Home, Users, Radio, Compass, Shield } from 'lucide-react';
import '../BottomNav.css';

const tabs = [
  { to: '/home',     icon: Home,    label: 'Home'    },
  { to: '/pods',     icon: Users,   label: 'Pods'    },
  { to: '/feed',     icon: Radio,   label: 'Feed'    },
  { to: '/discover', icon: Compass, label: 'Discover'},
  { to: '/safety',   icon: Shield,  label: 'Safety'  },
];

export default function BottomNav() {
  return (
    <nav className="bottom-nav" aria-label="Main navigation">
      {tabs.map(({ to, icon: Icon, label }) => (
        <NavLink
          key={to}
          to={to}
          className={({ isActive }) =>
            'nav-tab' + (isActive ? ' nav-tab--active' : '')
          }
        >
          <Icon size={22} strokeWidth={1.75} aria-hidden="true" />
          <span className="nav-tab__label">{label}</span>
        </NavLink>
      ))}
    </nav>
  );
}