import { Navigate, Route, Routes, useLocation } from 'react-router-dom';
import Header from './components/Header.jsx';
import ScrollThumb from './components/ScrollThumb.jsx';
import MyWait from './pages/guest/MyWait.jsx';
import Floor from './pages/host/Floor.jsx';
import Waitlist from './pages/host/Waitlist.jsx';
import Board from './pages/manager/Board.jsx';
import Welcome from './pages/Welcome.jsx';

export default function App() {
  const { pathname } = useLocation();
  return (
    <div className="app">
          <Header />
                <ScrollThumb />
      {/* The key restarts the page's entrance animation on every navigation. */}
      <main className="main" key={pathname}>
        <Routes>
          <Route path="/" element={<Welcome />} />
          <Route path="/host" element={<Navigate to="/host/floor" replace />} />
          <Route path="/host/floor"  element={<Floor mode="host" />} />
          <Route path="/host/waitlist" element={<Waitlist />} />
          <Route path="/staff" element={<Floor mode="staff" />} />
         <Route path="/guest" element={<MyWait />} />
          <Route path="/manager" element={<Navigate to="/manager/board" replace />} />
          <Route path="/manager/board" element={<Board />} />

          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </main>
    </div>
  );
}
