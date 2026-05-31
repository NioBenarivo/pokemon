import { Outlet } from 'react-router-dom'
import NavBar from '../components/NavBar'
import ScrollToTop from '../components/ScrollToTop'

export default function AppLayout() {
  return (
    <div className="min-h-screen pb-20">
      <ScrollToTop />
      <Outlet />
      <NavBar />
    </div>
  )
}
