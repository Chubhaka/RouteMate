import React from 'react';
import {
  BrowserRouter, Routes, Route,
  Navigate, useLocation,
} from 'react-router-dom';

import BottomNav   from './Components/BottomNav';
import Splash      from './Pages/Splash';
import Login       from './Pages/Login';
import Onboarding  from './Pages/Onboarding';
import Home        from './Pages/Home';
import Pods        from './Pages/Pods';
import LiveFeed    from './Pages/LiveFeed';
import Discover    from './Pages/Discover';
import Safety      from './Pages/Safety';
import CommuteInfo from './Pages/CommuteInfo';
import Profile     from './Pages/Profile';
import AuthSync    from './Components/Authsync';

import './App.css';

// Routes where the bottom nav should be hidden
const NO_NAV = ['/', '/login', '/onboarding'];

function Layout() {
  const location = useLocation();
  const showNav  = !NO_NAV.includes(location.pathname);

  return (
    <div className="app-shell">
      <AuthSync />
      <div className="page-content">
        <Routes>
          <Route path="/"             element={<Splash />} />
          <Route path="/login"        element={<Login />} />
          <Route path="/onboarding"   element={<Onboarding />} />

          {/* Main app — all protected */}
          <Route path="/home"         element={<Private><Home /></Private>} />
          <Route path="/pods"         element={<Private><Pods /></Private>} />
          <Route path="/feed"         element={<Private><LiveFeed /></Private>} />
          <Route path="/discover"     element={<Private><Discover /></Private>} />
          <Route path="/safety"       element={<Private><Safety /></Private>} />
          <Route path="/commute"      element={<Private><CommuteInfo /></Private>} />
          <Route path="/profile"      element={<Private><Profile /></Private>} />

          {/* Fallback */}
          <Route path="*"             element={<Navigate to="/" replace />} />
        </Routes>
      </div>

      {showNav && <BottomNav />}
    </div>
  );
}

function Private({ children }) {
  const isAuth = localStorage.getItem('rm_auth');
  return isAuth ? children : <Navigate to="/login" replace />;
}

export default function App() {
  return (
    <BrowserRouter>
      <Layout />
    </BrowserRouter>
  );
}