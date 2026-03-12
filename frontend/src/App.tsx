import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import SuperAdminLogin from './pages/SuperAdmin/Login';
import SuperAdminDashboard from './pages/SuperAdmin/Dashboard';
import GlobalLogin from './pages/Auth/GlobalLogin';
import AdminLogin from './pages/Auth/AdminLogin';
import StudentLogin from './pages/Auth/StudentLogin';
import StudentRegister from './pages/Auth/StudentRegister';
import Home from './pages/Home';
import AdminDashboard from './pages/Admin/Dashboard'; // Placeholder for Phase 4
import StudentDashboard from './pages/Student/Dashboard'; // Placeholder for Phase 4
import ProtectedRoute from './components/ProtectedRoute'; // Placeholder for Phase 3
function App() {
  return (
    <div className="min-h-screen bg-slate-900 text-slate-50 font-sans" style={{ fontFamily: '"Inter", sans-serif' }}>
      <Toaster position="top-right" toastOptions={{
        style: { background: '#1e293b', color: '#f1f5f9', border: '1px solid #334155' }
      }} />
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/super-panel/login" element={<SuperAdminLogin />} />
          <Route path="/super-panel" element={<SuperAdminDashboard />} />
          <Route path="/login" element={<GlobalLogin />} />
          <Route path="/admin-login" element={<AdminLogin />} />
          <Route path="/student-login" element={<StudentLogin />} />
          <Route path="/student-register" element={<StudentRegister />} />
          
          {/* Tenant Routes */}
          <Route element={<ProtectedRoute allowedRoles={["Admin"]} />}>
            <Route path="/:slug/admin" element={<AdminDashboard />} />
          </Route>

          <Route element={<ProtectedRoute allowedRoles={["Student"]} />}>
            <Route path="/:slug/dashboard" element={<StudentDashboard />} />
          </Route>
        </Routes>
      </BrowserRouter>
    </div>
  );
}

export default App;
