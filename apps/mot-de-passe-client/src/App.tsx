import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import HostPage from './pages/HostPage'
import JoinPage from './pages/JoinPage'
import RoomPage from './pages/RoomPage'

export default function App() {
  return (
    <BrowserRouter basename={import.meta.env.BASE_URL}>
      <Routes>
        <Route path="/" element={<HostPage />} />
        <Route path="/join/:roomCode" element={<JoinPage />} />
        <Route path="/room/:roomCode" element={<RoomPage />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  )
}
