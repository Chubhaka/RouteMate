import React from 'react';
import { Routes, Route, Navigate, useLocation } from 'react-router-dom';

import BottomNav from './components/BottomNav';
import Splash from './pages/Splash';
import Login from './Pages/Login';
import Onboarding from './Pages/Onboarding';
import Home from './Pages/Home';
import Pods from './Pages/Pods';
import LiveFeed from './Pages/LiveFeed';
import Discover from './Pages/Discover';
import Safety from './Pages/Safety';

import './App.css';

// Routes where the bottom nav should be hidden
const NO_NAV_ROUTES = ['/', '/login', '/onboarding'];

function Layout() {
  const location = useLocation();
  const showNav = !NO_NAV_ROUTES.includes(location.pathname);

  return (
    <div className="app-shell">
      <div className="page-content">
        <Routes>
          <Route path="/" element={<Splash />} />
          <Route path="/login" element={<Login />} />
          <Route path="/onboarding" element={<Onboarding />} />
          <Route path="/home" element={<PrivateRoute><Home /></PrivateRoute>} />
          <Route path="/pods" element={<PrivateRoute><Pods /></PrivateRoute>} />
          <Route path="/feed" element={<PrivateRoute><LiveFeed /></PrivateRoute>} />
          <Route path="/discover" element={<PrivateRoute><Discover /></PrivateRoute>} />
          <Route path="/safety" element={<PrivateRoute><Safety /></PrivateRoute>} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </div>

      {showNav && <BottomNav />}
    </div>
  );
}

function PrivateRoute({ children }) {
  const isAuth = localStorage.getItem('rm_auth');
  return isAuth ? children : <Navigate to="/login" replace />;
}

export default function App() {
  return <Layout />;
}