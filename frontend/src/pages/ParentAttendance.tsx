import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card";
import { ArrowLeft, ClipboardCheck, CheckCircle2, XCircle, LogIn } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import axios from "axios";
import toast from "react-hot-toast";
import { ProgressBar } from "@/components/ui/progress-bar";

const API_URL = import.meta.env.VITE_API_URL || "http://localhost:8000/api";

type AttendanceRecord = {
  date: string;
  status: string;
};

export default function ParentAttendance() {
  const navigate = useNavigate();

  // Login state
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [isLogging, setIsLogging] = useState(false);

  // After login
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [parentToken, setParentToken] = useState("");
  const [studentName, setStudentName] = useState("");
  const [records, setRecords] = useState<AttendanceRecord[]>([]);
  const [totalPresent, setTotalPresent] = useState(0);
  const [totalAbsent, setTotalAbsent] = useState(0);
  const [isLoadingAttendance, setIsLoadingAttendance] = useState(false);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isLogging) return;
    setIsLogging(true);
    try {
      const res = await axios.post(`${API_URL}/parents/login`, {
        username,
        password,
      });
      const { access_token, student_name } = res.data;
      setParentToken(access_token);
      setStudentName(student_name);
      setIsLoggedIn(true);
      toast.success(`Welcome! Viewing attendance for ${student_name}`);

      // Fetch attendance
      setIsLoadingAttendance(true);
      const attRes = await axios.get(`${API_URL}/parents/attendance`, {
        headers: { Authorization: `Bearer ${access_token}` },
      });
      setRecords(attRes.data.records);
      setTotalPresent(attRes.data.total_present);
      setTotalAbsent(attRes.data.total_absent);
      setIsLoadingAttendance(false);
    } catch (err: any) {
      toast.error(err.response?.data?.detail || "Invalid credentials.");
    } finally {
      setIsLogging(false);
    }
  };

  const handleLogout = () => {
    setIsLoggedIn(false);
    setParentToken("");
    setStudentName("");
    setRecords([]);
    setUsername("");
    setPassword("");
  };

  return (
    <div className="min-h-screen bg-[#0f172a] text-white flex items-center justify-center px-4 py-8">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="w-full max-w-lg"
      >
        <AnimatePresence mode="wait">
          {!isLoggedIn ? (
            <motion.div key="login" initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 20 }}>
              <Card className="bg-slate-900 border-teal-500/20 shadow-2xl">
                <CardHeader>
                  <div className="flex items-center gap-3 mb-1">
                    <ClipboardCheck className="w-6 h-6 text-teal-400" />
                    <CardTitle className="text-xl text-white">Parent Attendance Portal</CardTitle>
                  </div>
                  <CardDescription className="text-slate-400">
                    Log in with your credentials to view your child's attendance history.
                  </CardDescription>
                </CardHeader>
                <form onSubmit={handleLogin}>
                  <CardContent className="space-y-4">
                    <div className="space-y-2">
                      <Label className="text-slate-300">Username</Label>
                      <Input
                        value={username}
                        onChange={(e) => setUsername(e.target.value)}
                        className="bg-slate-800 border-slate-700 text-white"
                        placeholder="Enter your username"
                        required
                      />
                    </div>
                    <div className="space-y-2">
                      <Label className="text-slate-300">Password</Label>
                      <Input
                        type="password"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        className="bg-slate-800 border-slate-700 text-white"
                        placeholder="Enter your password"
                        required
                      />
                    </div>
                  </CardContent>
                  <CardFooter className="flex-col gap-4">
                    <Button
                      type="submit"
                      disabled={isLogging}
                      className="w-full bg-teal-600 hover:bg-teal-500 text-white"
                    >
                      <LogIn className="w-4 h-4 mr-2" />
                      {isLogging ? "Logging in..." : "View Attendance"}
                    </Button>
                    <ProgressBar isLoading={isLogging} color="bg-teal-500" />
                    <button
                      type="button"
                      onClick={() => navigate("/")}
                      className="flex items-center gap-1 text-xs text-slate-400 hover:text-white transition-colors"
                    >
                      <ArrowLeft className="w-3 h-3" /> Back to Home
                    </button>
                  </CardFooter>
                </form>
              </Card>
            </motion.div>
          ) : (
            <motion.div key="attendance" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }}>
              <Card className="bg-slate-900 border-teal-500/20 shadow-2xl">
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <ClipboardCheck className="w-6 h-6 text-teal-400" />
                      <div>
                        <CardTitle className="text-lg text-white">{studentName}'s Attendance</CardTitle>
                        <CardDescription className="text-slate-400">Past 30 days</CardDescription>
                      </div>
                    </div>
                    <button
                      onClick={handleLogout}
                      className="text-xs text-red-400 border border-red-500/30 px-3 py-1 rounded hover:text-red-300"
                    >
                      Logout
                    </button>
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">
                  {/* Summary */}
                  <div className="grid grid-cols-2 gap-3">
                    <div className="bg-green-500/10 border border-green-500/20 p-3 rounded-lg text-center">
                      <p className="text-xs text-slate-400">Present</p>
                      <p className="text-2xl font-bold font-mono text-green-400">{totalPresent}</p>
                    </div>
                    <div className="bg-red-500/10 border border-red-500/20 p-3 rounded-lg text-center">
                      <p className="text-xs text-slate-400">Absent</p>
                      <p className="text-2xl font-bold font-mono text-red-400">{totalAbsent}</p>
                    </div>
                  </div>

                  {/* Records */}
                  {isLoadingAttendance ? (
                    <div className="py-4">
                      <ProgressBar isLoading={true} color="bg-teal-500" />
                      <p className="text-center text-slate-500 mt-2">Loading records...</p>
                    </div>
                  ) : records.length === 0 ? (
                    <p className="text-center text-slate-500 py-4">No attendance records found.</p>
                  ) : (
                    <div className="max-h-80 overflow-y-auto space-y-1">
                      {records.map((r) => (
                        <div
                          key={r.date}
                          className="flex items-center justify-between px-3 py-2 rounded bg-white/5 hover:bg-white/10 transition-colors"
                        >
                          <span className="text-sm font-mono text-slate-300">{r.date}</span>
                          {r.status === "Present" ? (
                            <span className="inline-flex items-center gap-1 text-green-400 text-xs font-medium">
                              <CheckCircle2 className="w-3 h-3" /> Present
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 text-red-400 text-xs font-medium">
                              <XCircle className="w-3 h-3" /> Absent
                            </span>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>
    </div>
  );
}
