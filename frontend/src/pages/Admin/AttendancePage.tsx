import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { getAuthToken } from "@/lib/auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  ArrowLeft, ClipboardCheck, CheckCircle2, XCircle, Download,
  Users, UserPlus, Trash2, Eye, EyeOff
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import axios from "axios";
import toast from "react-hot-toast";
import { ProgressBar } from "@/components/ui/progress-bar";

const API_URL = import.meta.env.VITE_API_URL || "http://localhost:8000/api";

type StudentAttendance = {
  student_id: string;
  full_name: string;
  email: string;
  room_number: string;
  contact: string;
  status: string;
};

type ParentCred = {
  id: string;
  username: string;
  student_id: string;
  student_name: string;
  room_number: string;
};

export default function AttendancePage() {
  const { slug } = useParams();
  const navigate = useNavigate();
  const token = getAuthToken();

  const [date, setDate] = useState(() => new Date().toISOString().split("T")[0]);
  const [students, setStudents] = useState<StudentAttendance[]>([]);
  const [totalPresent, setTotalPresent] = useState(0);
  const [totalAbsent, setTotalAbsent] = useState(0);
  const [totalUnmarked, setTotalUnmarked] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [isMarking, setIsMarking] = useState<string | null>(null);
  const [isExporting, setIsExporting] = useState(false);

  // Parent credentials
  const [parentCreds, setParentCreds] = useState<ParentCred[]>([]);
  const [showParentSection, setShowParentSection] = useState(false);
  const [newParentStudentId, setNewParentStudentId] = useState("");
  const [newParentUsername, setNewParentUsername] = useState("");
  const [newParentPassword, setNewParentPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [isCreatingCred, setIsCreatingCred] = useState(false);

  const fetchAttendance = async () => {
    setIsLoading(true);
    try {
      const res = await axios.get(`${API_URL}/attendance/?date=${date}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      setStudents(res.data.students);
      setTotalPresent(res.data.total_present);
      setTotalAbsent(res.data.total_absent);
      setTotalUnmarked(res.data.total_unmarked);
    } catch {
      toast.error("Failed to load attendance.");
    } finally {
      setIsLoading(false);
    }
  };

  const fetchParentCreds = async () => {
    try {
      const res = await axios.get(`${API_URL}/parents/credentials`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      setParentCreds(res.data);
    } catch {
      // Non-fatal
    }
  };

  useEffect(() => { fetchAttendance(); fetchParentCreds(); }, [date]);

  const markAttendance = async (studentId: string, status: string) => {
    setIsMarking(studentId);
    try {
      await axios.post(
        `${API_URL}/attendance/mark`,
        { student_id: studentId, date, status },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      setStudents((prev) =>
        prev.map((s) =>
          s.student_id === studentId ? { ...s, status } : s
        )
      );
      // Update counts locally
      fetchAttendance();
    } catch {
      toast.error("Failed to mark attendance.");
    } finally {
      setIsMarking(null);
    }
  };

  const markAllPresent = async () => {
    setIsMarking("all");
    try {
      const records = students.map((s) => ({
        student_id: s.student_id,
        date,
        status: "Present",
      }));
      await axios.post(
        `${API_URL}/attendance/mark-bulk`,
        { date, records },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      toast.success("All marked present!");
      fetchAttendance();
    } catch {
      toast.error("Failed to mark all present.");
    } finally {
      setIsMarking(null);
    }
  };

  const exportCSV = async () => {
    setIsExporting(true);
    try {
      const res = await axios.get(`${API_URL}/attendance/export?date=${date}`, {
        headers: { Authorization: `Bearer ${token}` },
        responseType: "blob",
      });
      const url = window.URL.createObjectURL(new Blob([res.data]));
      const a = document.createElement("a");
      a.href = url;
      a.download = `attendance_${date}.csv`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      a.remove();
      toast.success("CSV downloaded!");
    } catch {
      toast.error("Export failed.");
    } finally {
      setIsExporting(false);
    }
  };

  const handleCreateParentCred = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isCreatingCred) return;
    setIsCreatingCred(true);
    try {
      await axios.post(
        `${API_URL}/parents/credentials`,
        {
          student_id: newParentStudentId,
          username: newParentUsername,
          password: newParentPassword,
        },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      toast.success("Parent credential created!");
      setNewParentStudentId("");
      setNewParentUsername("");
      setNewParentPassword("");
      fetchParentCreds();
    } catch (err: any) {
      toast.error(err.response?.data?.detail || "Failed to create credential.");
    } finally {
      setIsCreatingCred(false);
    }
  };

  const deleteParentCred = async (id: string) => {
    try {
      await axios.delete(`${API_URL}/parents/credentials/${id}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      toast.success("Credential deleted.");
      fetchParentCreds();
    } catch {
      toast.error("Failed to delete credential.");
    }
  };

  return (
    <div className="min-h-screen bg-[#0f172a] text-white">
      <div className="max-w-6xl mx-auto p-6 space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div className="flex items-center gap-3">
            <button
              onClick={() => navigate(`/${slug}/admin`)}
              className="text-slate-400 hover:text-white transition-colors"
            >
              <ArrowLeft className="w-5 h-5" />
            </button>
            <ClipboardCheck className="w-7 h-7 text-green-400" />
            <h1 className="text-2xl font-bold">Attendance Management</h1>
          </div>
          <div className="flex items-center gap-3 flex-wrap">
            <Input
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              className="bg-slate-800 border-slate-700 text-white w-44"
            />
            <Button
              onClick={markAllPresent}
              disabled={isMarking === "all"}
              className="bg-green-600 hover:bg-green-500 text-white text-sm"
            >
              <CheckCircle2 className="w-4 h-4 mr-1" />
              Mark All Present
            </Button>
            <Button
              onClick={exportCSV}
              disabled={isExporting}
              variant="outline"
              className="border-slate-600 text-slate-300 hover:text-white text-sm"
            >
              <Download className="w-4 h-4 mr-1" />
              Export CSV
            </Button>
          </div>
        </div>

        {/* Summary Cards */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          <div className="bg-[#1e293b]/50 backdrop-blur-xl border border-green-500/20 p-4 rounded-xl text-center">
            <p className="text-sm text-slate-400">Present</p>
            <p className="text-3xl font-bold font-mono text-green-400">{totalPresent}</p>
          </div>
          <div className="bg-[#1e293b]/50 backdrop-blur-xl border border-red-500/20 p-4 rounded-xl text-center">
            <p className="text-sm text-slate-400">Absent</p>
            <p className="text-3xl font-bold font-mono text-red-400">{totalAbsent}</p>
          </div>
          <div className="bg-[#1e293b]/50 backdrop-blur-xl border border-slate-500/20 p-4 rounded-xl text-center">
            <p className="text-sm text-slate-400">Unmarked</p>
            <p className="text-3xl font-bold font-mono text-slate-400">{totalUnmarked}</p>
          </div>
          <div className="bg-[#1e293b]/50 backdrop-blur-xl border border-blue-500/20 p-4 rounded-xl text-center">
            <p className="text-sm text-slate-400">Total</p>
            <p className="text-3xl font-bold font-mono text-blue-400">{students.length}</p>
          </div>
        </div>

        {/* Student List */}
        <div className="bg-[#1e293b]/40 backdrop-blur-xl border border-white/10 rounded-xl overflow-hidden shadow-2xl">
          <div className="p-4 border-b border-white/10 bg-white/5 flex items-center justify-between">
            <h2 className="font-bold flex items-center gap-2">
              <Users className="w-5 h-5 text-green-400" /> Students (sorted by Room No.)
            </h2>
            <span className="text-xs text-slate-400">{date}</span>
          </div>
          {isLoading ? (
            <div className="p-8 text-center text-slate-500">
              <ProgressBar isLoading={true} color="bg-green-500" />
              <p className="mt-4">Loading attendance...</p>
            </div>
          ) : students.length === 0 ? (
            <div className="p-8 text-center text-slate-500">No students found.</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-left text-slate-400 border-b border-white/10">
                    <th className="p-3">Room</th>
                    <th className="p-3">Name</th>
                    <th className="p-3 hidden md:table-cell">Email</th>
                    <th className="p-3 text-center">Status</th>
                    <th className="p-3 text-center">Action</th>
                  </tr>
                </thead>
                <tbody>
                  {students.map((s) => (
                    <motion.tr
                      key={s.student_id}
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      className="border-b border-white/5 hover:bg-white/5 transition-colors"
                    >
                      <td className="p-3 font-mono text-blue-300">{s.room_number}</td>
                      <td className="p-3 font-medium">{s.full_name}</td>
                      <td className="p-3 text-slate-400 hidden md:table-cell">{s.email}</td>
                      <td className="p-3 text-center">
                        {s.status === "Present" && (
                          <span className="inline-flex items-center gap-1 text-green-400 bg-green-500/10 px-2 py-1 rounded text-xs font-medium">
                            <CheckCircle2 className="w-3 h-3" /> Present
                          </span>
                        )}
                        {s.status === "Absent" && (
                          <span className="inline-flex items-center gap-1 text-red-400 bg-red-500/10 px-2 py-1 rounded text-xs font-medium">
                            <XCircle className="w-3 h-3" /> Absent
                          </span>
                        )}
                        {!s.status && (
                          <span className="text-slate-500 text-xs">—</span>
                        )}
                      </td>
                      <td className="p-3 text-center">
                        <div className="flex items-center justify-center gap-1">
                          <button
                            onClick={() => markAttendance(s.student_id, "Present")}
                            disabled={isMarking === s.student_id}
                            className={`px-2 py-1 rounded text-xs font-medium transition-all ${
                              s.status === "Present"
                                ? "bg-green-500 text-white"
                                : "bg-green-500/10 text-green-400 hover:bg-green-500/30"
                            }`}
                          >
                            P
                          </button>
                          <button
                            onClick={() => markAttendance(s.student_id, "Absent")}
                            disabled={isMarking === s.student_id}
                            className={`px-2 py-1 rounded text-xs font-medium transition-all ${
                              s.status === "Absent"
                                ? "bg-red-500 text-white"
                                : "bg-red-500/10 text-red-400 hover:bg-red-500/30"
                            }`}
                          >
                            A
                          </button>
                        </div>
                      </td>
                    </motion.tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Parent Credentials Section */}
        <div className="bg-[#1e293b]/40 backdrop-blur-xl border border-white/10 rounded-xl overflow-hidden shadow-2xl">
          <button
            onClick={() => setShowParentSection(!showParentSection)}
            className="w-full p-4 border-b border-white/10 bg-white/5 flex items-center justify-between hover:bg-white/10 transition-colors"
          >
            <h2 className="font-bold flex items-center gap-2">
              <UserPlus className="w-5 h-5 text-purple-400" /> Parent Credentials
            </h2>
            <span className="text-xs text-slate-400">
              {showParentSection ? "Hide" : "Show"} ({parentCreds.length})
            </span>
          </button>

          <AnimatePresence>
            {showParentSection && (
              <motion.div
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: "auto", opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                className="overflow-hidden"
              >
                <div className="p-4 space-y-4">
                  {/* Create Form */}
                  <form onSubmit={handleCreateParentCred} className="grid grid-cols-1 md:grid-cols-4 gap-3 items-end">
                    <div className="space-y-1">
                      <Label className="text-slate-300 text-xs">Student</Label>
                      <select
                        value={newParentStudentId}
                        onChange={(e) => setNewParentStudentId(e.target.value)}
                        className="w-full bg-slate-900 border border-white/10 text-sm p-2 rounded outline-none text-slate-300"
                        required
                      >
                        <option value="">Select student...</option>
                        {students.map((s) => (
                          <option key={s.student_id} value={s.student_id}>
                            {s.room_number} — {s.full_name}
                          </option>
                        ))}
                      </select>
                    </div>
                    <div className="space-y-1">
                      <Label className="text-slate-300 text-xs">Username</Label>
                      <Input
                        value={newParentUsername}
                        onChange={(e) => setNewParentUsername(e.target.value)}
                        className="bg-slate-900 border-white/10 text-white text-sm"
                        placeholder="parent_username"
                        required
                      />
                    </div>
                    <div className="space-y-1">
                      <Label className="text-slate-300 text-xs">Password</Label>
                      <div className="relative">
                        <Input
                          type={showPassword ? "text" : "password"}
                          value={newParentPassword}
                          onChange={(e) => setNewParentPassword(e.target.value)}
                          className="bg-slate-900 border-white/10 text-white text-sm pr-8"
                          placeholder="••••••"
                          required
                        />
                        <button
                          type="button"
                          onClick={() => setShowPassword(!showPassword)}
                          className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400"
                        >
                          {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                        </button>
                      </div>
                    </div>
                    <Button
                      type="submit"
                      disabled={isCreatingCred}
                      className="bg-purple-600 hover:bg-purple-500 text-white text-sm"
                    >
                      <UserPlus className="w-4 h-4 mr-1" />
                      {isCreatingCred ? "Creating..." : "Add"}
                    </Button>
                  </form>
                  <ProgressBar isLoading={isCreatingCred} color="bg-purple-500" />

                  {/* List */}
                  {parentCreds.length > 0 ? (
                    <div className="overflow-x-auto">
                      <table className="w-full text-sm">
                        <thead>
                          <tr className="text-left text-slate-400 border-b border-white/10">
                            <th className="p-2">Username</th>
                            <th className="p-2">Student</th>
                            <th className="p-2">Room</th>
                            <th className="p-2 text-center">Action</th>
                          </tr>
                        </thead>
                        <tbody>
                          {parentCreds.map((c) => (
                            <tr key={c.id} className="border-b border-white/5">
                              <td className="p-2 font-mono text-purple-300">{c.username}</td>
                              <td className="p-2">{c.student_name}</td>
                              <td className="p-2 text-slate-400">{c.room_number}</td>
                              <td className="p-2 text-center">
                                <button
                                  onClick={() => deleteParentCred(c.id)}
                                  className="text-red-400 hover:text-red-300 transition-colors"
                                  title="Delete"
                                >
                                  <Trash2 className="w-4 h-4" />
                                </button>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  ) : (
                    <p className="text-sm text-slate-500 text-center py-2">
                      No parent credentials yet. Add one above.
                    </p>
                  )}
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
    </div>
  );
}
