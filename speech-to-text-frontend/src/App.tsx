import React from 'react';
import { BrowserRouter as Router, Routes, Route, NavLink, Link } from 'react-router-dom';
import { Mic, LayoutDashboard, Radio, Cpu } from 'lucide-react';
import { LiveTranscription } from './pages/LiveTranscription';
import { Dashboard } from './pages/Dashboard';

export const App: React.FC = () => {
  return (
    <Router>
      <div className="d-flex flex-column min-vh-100 bg-light">
        {/* Global Navigation Bar */}
        <nav className="navbar navbar-expand-lg navbar-dark bg-dark sticky-top border-bottom border-secondary shadow-sm">
          <div className="container">
            {/* Brand */}
            <Link to="/" className="navbar-brand d-flex align-items-center gap-2 fw-bold text-white fs-4">
              <span className="p-2 bg-primary rounded-3 d-flex align-items-center justify-content-center">
                <Mic size={20} className="text-white" />
              </span>
              <span>VoiceFlow<span className="text-primary">.ai</span></span>
            </Link>

            {/* Toggle Button for Mobile */}
            <button
              className="navbar-toggler"
              type="button"
              data-bs-toggle="collapse"
              data-bs-target="#navbarContent"
              aria-controls="navbarContent"
              aria-expanded="false"
              aria-label="Toggle navigation"
            >
              <span className="navbar-toggler-icon"></span>
            </button>

            {/* Nav links */}
            <div className="collapse navbar-collapse" id="navbarContent">
              <ul className="navbar-nav me-auto mb-2 mb-lg-0 ms-lg-4 gap-2">
                <li className="nav-item">
                  <NavLink
                    to="/"
                    className={({ isActive }) =>
                      `nav-link d-flex align-items-center gap-2 px-3 py-2 rounded-2 ${
                        isActive ? 'active bg-primary text-white fw-semibold' : 'text-light'
                      }`
                    }
                  >
                    <Radio size={16} /> Live Streaming
                  </NavLink>
                </li>
                <li className="nav-item">
                  <NavLink
                    to="/dashboard"
                    className={({ isActive }) =>
                      `nav-link d-flex align-items-center gap-2 px-3 py-2 rounded-2 ${
                        isActive ? 'active bg-primary text-white fw-semibold' : 'text-light'
                      }`
                    }
                  >
                    <LayoutDashboard size={16} /> Records Dashboard
                  </NavLink>
                </li>
              </ul>

              {/* Status & Engine Badge */}
              <div className="d-flex align-items-center gap-3">
                <div className="badge bg-secondary-subtle text-light border border-secondary px-3 py-2 d-none d-md-flex align-items-center gap-2">
                  <Cpu size={14} className="text-info" />
                  <span className="font-monospace small">Gemini Live 3.1 & Spring Boot 4.x Proxy</span>
                </div>
              </div>
            </div>
          </div>
        </nav>

        {/* Main Content Body */}
        <main className="flex-grow-1">
          <Routes>
            <Route path="/" element={<LiveTranscription />} />
            <Route path="/dashboard" element={<Dashboard />} />
          </Routes>
        </main>

        {/* Global Footer */}
        <footer className="bg-white border-top py-3 mt-auto">
          <div className="container d-flex flex-column flex-md-row justify-content-between align-items-center gap-2 text-muted small">
            <div>
              &copy; {new Date().getFullYear()} VoiceFlow. Multilingual Real-Time Speech Recognition.
            </div>
            <div className="d-flex align-items-center gap-3">
              <span>Stack: React 18 &bull; Spring Boot 4.x &bull; MySQL 8+ &bull; WebSocket</span>
            </div>
          </div>
        </footer>
      </div>
    </Router>
  );
};

export default App;
