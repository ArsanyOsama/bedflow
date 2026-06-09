// src/App.tsx
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { useAuth } from './hooks/useAuth'
import { useEMSRequests } from './hooks/useEMSRequests'
import { EMSRequestNotification } from './components/EMSRequestNotification'

// Pages
import Login     from './pages/Login'
import Dashboard from './pages/Dashboard'
import WardView  from './pages/WardView'
import CityMap   from './pages/CityMap'
import Reports   from './pages/Reports'
import Settings  from './pages/Settings'
import Alerts    from './pages/Alerts'

function Guard({ children }: { children: React.ReactNode }) {
  const { profile, loading } = useAuth()
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#F5F4F0]">
        <p className="text-[#8896AB]">Loading BedFlow...</p>
      </div>
    )
  }
  if (!profile) return <Navigate to="/login" replace />
  return <>{children}</>
}

// EMS Listener: This sits outside of Routes so it stays mounted at all times
function EMSListener() {
  const { incoming, acceptRequest, rejectRequest, dismissIncoming } = useEMSRequests()
  
  return (
    <>
      {incoming && (
        <EMSRequestNotification 
          request={incoming}
          onAccept={acceptRequest}
          onReject={rejectRequest}
          onDismiss={dismissIncoming}
        />
      )}
    </>
  )
}

export default function App() {
  return (
    <BrowserRouter>
      {/* Global listener renders on top of everything */}
      <EMSListener />
      
      <Routes>
        <Route path="/login"     element={<Login />} />
        
        {/* Corrected: Each path now maps to its specific page */}
        <Route path="/dashboard" element={<Guard><Dashboard /></Guard>} />
        <Route path="/wards"     element={<Guard><WardView /></Guard>} />
        <Route path="/map"       element={<Guard><CityMap /></Guard>} />
        <Route path="/reports"   element={<Guard><Reports /></Guard>} />
        <Route path="/settings"  element={<Guard><Settings /></Guard>} />
        <Route path="/alerts"    element={<Guard><Alerts /></Guard>} />
        
        <Route path="/"          element={<Navigate to="/dashboard" replace />} />
        <Route path="*"          element={<Navigate to="/login" replace />} />
      </Routes>
    </BrowserRouter>
  )
}