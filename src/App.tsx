import { Routes, Route, Navigate } from 'react-router-dom'
import { useAuth } from './hooks/useAuth'
import LoginPage from './pages/LoginPage'
import PokemonListPage from './pages/PokemonListPage'
import PokemonDetailPage from './pages/PokemonDetailPage'
import CardsPage from './pages/CardsPage'
import BinderPage from './pages/BinderPage'
import AppLayout from './layouts/AppLayout'
import LoadingScreen from './components/LoadingScreen'
import { LOADING } from './constants/strings'

export default function App() {
  const { user, loading: authLoading } = useAuth()

  if (authLoading) return <LoadingScreen message={LOADING.AUTH} />
  if (!user) return <LoginPage />

  return (
    <Routes>
      <Route element={<AppLayout />}>
        <Route path="/pokemon" element={<PokemonListPage />} />
        <Route path="/pokemon/:id" element={<PokemonDetailPage />} />
        <Route path="/cards" element={<CardsPage />} />
        <Route path="/binder" element={<BinderPage />} />
        <Route path="*" element={<Navigate to="/pokemon" replace />} />
      </Route>
    </Routes>
  )
}
