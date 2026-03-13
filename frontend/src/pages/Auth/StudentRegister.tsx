import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { motion } from "framer-motion";
import axios from "axios";
import toast from "react-hot-toast";

const API_URL = import.meta.env.VITE_API_URL || "http://localhost:8000/api";

export default function StudentRegister() {
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [collegeCode, setCollegeCode] = useState("");
  const [roomNumber, setRoomNumber] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const navigate = useNavigate();

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isLoading) return;

    setIsLoading(true);
    try {
        await axios.post(`${API_URL}/auth/register/student`, {
            full_name: fullName,
            email,
            password,
            college_code: collegeCode,
            room_number: roomNumber
        });
        toast.success("Registration successful! Please login.");
        navigate('/student-login');
    } catch (err: any) {
        toast.error(err.response?.data?.detail || "Registration failed. Check your College Code.");
    } finally {
        setIsLoading(false);
    }
  };

  return (
    <div className="flex items-center justify-center min-h-screen px-4 bg-[#0f172a] py-12">
      <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} transition={{ duration: 0.5 }}>
        <Card className="w-full max-w-md bg-slate-900 border-purple-500/20 shadow-2xl">
          <CardHeader>
            <CardTitle className="text-2xl text-white">Student Registration</CardTitle>
            <CardDescription className="text-slate-400">
              Create an account using your 6-digit College Code.
            </CardDescription>
          </CardHeader>
          <form onSubmit={handleRegister}>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label className="text-slate-300">College Code</Label>
                <Input
                  value={collegeCode}
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) => setCollegeCode(e.target.value.toUpperCase())}
                  placeholder="e.g. A1B2C3"
                  className="bg-slate-800 border-slate-700 text-white font-mono tracking-widest uppercase focus:ring-purple-500 text-center"
                  maxLength={6}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label className="text-slate-300">Full Name</Label>
                <Input
                  value={fullName}
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) => setFullName(e.target.value)}
                  className="bg-slate-800 border-slate-700 text-white focus:ring-purple-500"
                  required
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                 <div className="space-y-2">
                    <Label className="text-slate-300">Email Address</Label>
                    <Input
                    type="email"
                    value={email}
                    onChange={(e: React.ChangeEvent<HTMLInputElement>) => setEmail(e.target.value)}
                    className="bg-slate-800 border-slate-700 text-white focus:ring-purple-500"
                    required
                    />
                </div>
                <div className="space-y-2">
                    <Label className="text-slate-300">Room No. (Optional)</Label>
                    <Input
                    value={roomNumber}
                    onChange={(e: React.ChangeEvent<HTMLInputElement>) => setRoomNumber(e.target.value)}
                    className="bg-slate-800 border-slate-700 text-white focus:ring-purple-500"
                    />
                </div>
              </div>
              <div className="space-y-2">
                <Label className="text-slate-300">Password</Label>
                <Input
                  type="password"
                  value={password}
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) => setPassword(e.target.value)}
                  className="bg-slate-800 border-slate-700 text-white focus:ring-purple-500"
                  required
                />
              </div>
            </CardContent>
            <CardFooter className="flex-col gap-4">
              <Button type="submit" disabled={isLoading} className="w-full bg-purple-600 hover:bg-purple-500 text-white">
                {isLoading ? "Registering..." : "Register"}
              </Button>
              <div className="text-sm text-slate-500 text-center">
                  Already have an account? <span className="text-purple-400 cursor-pointer hover:underline" onClick={() => navigate('/student-login')}>Login instead</span>
              </div>
            </CardFooter>
          </form>
        </Card>
      </motion.div>
    </div>
  );
}
