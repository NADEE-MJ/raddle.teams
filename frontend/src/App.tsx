import { Routes, Route } from 'react-router-dom'
import { PlayerProvider } from './context/PlayerContext'
import { GameProvider } from './context/GameContext'
import HomePage from './pages/HomePage'
import LobbyPage from './pages/LobbyPage'
import GamePage from './pages/GamePage'
import AdminPage from './pages/AdminPage'

function App() {
    return (
        <PlayerProvider>
            <GameProvider>
                <div className="min-h-screen bg-gray-100">
                    <Routes>
                        <Route path="/" element={<HomePage />} />
                        <Route path="/lobby" element={<LobbyPage />} />
                        <Route path="/game" element={<GamePage />} />
                        <Route path="/admin" element={<AdminPage />} />
                    </Routes>
                </div>
            </GameProvider>
        </PlayerProvider>
    )
}

export default App
