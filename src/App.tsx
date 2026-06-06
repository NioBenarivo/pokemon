import { Routes, Route, Navigate } from 'react-router-dom'
import { useAuth } from './hooks/useAuth'
import LoginPage from './pages/LoginPage'
import PokemonListPage from './pages/PokemonListPage'
import PokemonDetailPage from './pages/PokemonDetailPage'
import CardsPage from './pages/CardsPage'
import BinderListPage from './pages/BinderListPage'
import BinderPage from './pages/BinderPage'
import WishlistPage from './pages/WishlistPage'
import PacksListPage from './pages/PacksListPage'
import PackDetailPage from './pages/PackDetailPage'
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
        <Route path="/packs" element={<PacksListPage />} />
        <Route path="/packs/:id" element={<PackDetailPage />} />
        <Route path="/binder" element={<BinderListPage />} />
        <Route path="/binder/:id" element={<BinderPage />} />
        <Route path="/wishlist" element={<WishlistPage />} />
        <Route path="*" element={<Navigate to="/pokemon" replace />} />
      </Route>
    </Routes>
  )
}
