import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import SuperAdminLogin from './pages/SuperAdmin/Login';
import SuperAdminDashboard from './pages/SuperAdmin/Dashboard';
import GlobalLogin from './pages/Auth/GlobalLogin';
import AdminLogin from './pages/Auth/AdminLogin';
import StudentLogin from './pages/Auth/StudentLogin';
import StudentRegister from './pages/Auth/StudentRegister';
import Home from './pages/Home';
import About from './pages/About';
import Contact from './pages/Contact';
import AdminDashboard from './pages/Admin/Dashboard';
import AttendancePage from './pages/Admin/AttendancePage';
import StudentDashboard from './pages/Student/Dashboard';
import ParentAttendance from './pages/ParentAttendance';
import ProtectedRoute from './components/ProtectedRoute';
function App() {
  return (
    <div className="min-h-screen bg-slate-900 text-slate-50 font-sans" style={{ fontFamily: '"Inter", sans-serif' }}>
      <Toaster position="top-right" toastOptions={{
        style: { background: '#1e293b', color: '#f1f5f9', border: '1px solid #334155' }
      }} />
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/about" element={<About />} />
          <Route path="/contact" element={<Contact />} />
          <Route path="/super-panel/login" element={<SuperAdminLogin />} />
          <Route path="/super-panel" element={<SuperAdminDashboard />} />
          <Route path="/login" element={<GlobalLogin />} />
          <Route path="/admin-login" element={<AdminLogin />} />
          <Route path="/student-login" element={<StudentLogin />} />
          <Route path="/student-register" element={<StudentRegister />} />
          
          {/* Tenant Routes */}
          <Route element={<ProtectedRoute allowedRoles={["Admin"]} />}>
            <Route path="/:slug/admin" element={<AdminDashboard />} />
            <Route path="/:slug/admin/attendance" element={<AttendancePage />} />
          </Route>

          <Route element={<ProtectedRoute allowedRoles={["Student"]} />}>
            <Route path="/:slug/dashboard" element={<StudentDashboard />} />
          </Route>

          {/* Public parent route */}
          <Route path="/parent-attendance" element={<ParentAttendance />} />
        </Routes>
      </BrowserRouter>
    </div>
  );
}

export default App;
