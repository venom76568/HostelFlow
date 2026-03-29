import { useState, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { motion, AnimatePresence } from "framer-motion";
import axios from "axios";
import toast from "react-hot-toast";
import { ArrowLeft, Mail, ShieldCheck, KeyRound } from "lucide-react";
import { ProgressBar } from "@/components/ui/progress-bar";
import { setAuthToken, setCollegeSlug, setUserRole } from "@/lib/auth";

const API_URL = import.meta.env.VITE_API_URL || "http://localhost:8000/api";

type ForgotStep = "email" | "otp" | "newPassword";

export default function StudentLogin() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const navigate = useNavigate();

  // Forgot password state
  const [showForgot, setShowForgot] = useState(false);
  const [forgotStep, setForgotStep] = useState<ForgotStep>("email");
  const [forgotEmail, setForgotEmail] = useState("");
  const [otp, setOtp] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [isForgotLoading, setIsForgotLoading] = useState(false);

  // Resend OTP countdown (59 seconds)
  const [resendCountdown, setResendCountdown] = useState(0);
  const countdownRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const startCountdown = () => {
    setResendCountdown(59);
    if (countdownRef.current) clearInterval(countdownRef.current);
    countdownRef.current = setInterval(() => {
      setResendCountdown(prev => {
        if (prev <= 1) { clearInterval(countdownRef.current!); return 0; }
        return prev - 1;
      });
    }, 1000);
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isLoading) return;

    setIsLoading(true);
    try {
      const formData = new FormData();
      formData.append("username", email);
      formData.append("password", password);

      const res = await axios.post(`${API_URL}/auth/login`, formData);
      const { access_token, role, slug } = res.data;

      if (role !== "Student") {
        toast.error("Not authorized as Student.");
        return;
      }

      setAuthToken(access_token);
      setUserRole(role);
      setCollegeSlug(slug);
      navigate(`/${slug}/dashboard`);
    } catch (err: any) {
      toast.error(err.response?.data?.detail || "Invalid credentials");
    } finally {
      setIsLoading(false);
    }
  };

  // Step 1: Request OTP
  const handleRequestOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isForgotLoading) return;
    setIsForgotLoading(true);
    try {
      await axios.post(`${API_URL}/auth/request-password-reset`, { email: forgotEmail });
      toast.success("OTP sent! Check your email (or server console in dev mode).");
      setForgotStep("otp");
      startCountdown();
    } catch (err: any) {
      toast.error(err.response?.data?.detail || "Failed to send OTP.");
    } finally {
      setIsForgotLoading(false);
    }
  };

  // Step 2: Verify OTP
  const handleVerifyOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isForgotLoading) return;
    setIsForgotLoading(true);
    try {
      await axios.post(`${API_URL}/auth/verify-otp`, { email: forgotEmail, otp });
      toast.success("OTP verified! Set your new password.");
      setForgotStep("newPassword");
    } catch (err: any) {
      toast.error(err.response?.data?.detail || "Invalid or expired OTP.");
    } finally {
      setIsForgotLoading(false);
    }
  };

  // Step 3: Reset password
  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isForgotLoading) return;
    if (newPassword !== confirmPassword) {
      toast.error("Passwords do not match.");
      return;
    }
    setIsForgotLoading(true);
    try {
      await axios.post(`${API_URL}/auth/reset-password`, { email: forgotEmail, otp, new_password: newPassword });
      toast.success("Password reset successfully! Please log in.");
      setShowForgot(false);
      setForgotStep("email");
      setForgotEmail(""); setOtp(""); setNewPassword(""); setConfirmPassword("");
    } catch (err: any) {
      toast.error(err.response?.data?.detail || "Failed to reset password.");
    } finally {
      setIsForgotLoading(false);
    }
  };

  const resetForgotFlow = () => {
    setShowForgot(false);
    setForgotStep("email");
    setForgotEmail(""); setOtp(""); setNewPassword(""); setConfirmPassword("");
  };

  const stepConfig = {
    email:       { icon: <Mail className="w-5 h-5 text-purple-400" />,    title: "Forgot Password",  desc: "Enter your student email to receive a 6-digit OTP." },
    otp:         { icon: <ShieldCheck className="w-5 h-5 text-purple-400" />, title: "Enter OTP",    desc: `An OTP was sent to ${forgotEmail}. It expires in 10 minutes.` },
    newPassword: { icon: <KeyRound className="w-5 h-5 text-purple-400" />, title: "Set New Password", desc: "Choose a strong new password for your account." },
  };

  return (
    <div className="flex items-center justify-center min-h-screen px-4 bg-[#0f172a]">
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }}>
        <AnimatePresence mode="wait">
          {!showForgot ? (
            <motion.div key="login" initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 20 }}>
              <Card className="w-full max-w-md bg-slate-900 border-purple-500/20 shadow-2xl">
                <CardHeader>
                  <CardTitle className="text-2xl text-white">Student Login</CardTitle>
                  <CardDescription className="text-slate-400">
                    Access your personalized hostel dashboard.
                  </CardDescription>
                </CardHeader>
                <form onSubmit={handleLogin}>
                  <CardContent className="space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor="email" className="text-slate-300">Email Address</Label>
                      <Input
                        id="email"
                        type="email"
                        placeholder="student@college.edu"
                        value={email}
                        onChange={(e: React.ChangeEvent<HTMLInputElement>) => setEmail(e.target.value)}
                        className="bg-slate-800 border-slate-700 text-white focus:ring-purple-500"
                        required
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="password" className="text-slate-300">Password</Label>
                      <Input
                        id="password"
                        type="password"
                        value={password}
                        onChange={(e: React.ChangeEvent<HTMLInputElement>) => setPassword(e.target.value)}
                        className="bg-slate-800 border-slate-700 text-white focus:ring-purple-500"
                        required
                      />
                      <button
                        type="button"
                        onClick={() => setShowForgot(true)}
                        className="text-xs text-purple-400 hover:text-purple-300 transition-colors mt-1 float-right"
                      >
                        Forgot Password?
                      </button>
                    </div>
                  </CardContent>
                  <CardFooter className="flex-col gap-4 pt-6">
                    <Button type="submit" disabled={isLoading} className="w-full bg-purple-600 hover:bg-purple-500 text-white">
                      {isLoading ? "Authenticating..." : "Login"}
                    </Button>
                    <ProgressBar isLoading={isLoading} color="bg-purple-500" />
                    <div className="text-sm text-slate-500 text-center">
                      Don't have an account? <span className="text-purple-400 cursor-pointer hover:underline" onClick={() => navigate('/student-register')}>Register here</span>
                    </div>
                  </CardFooter>
                </form>
              </Card>
            </motion.div>
          ) : (
            <motion.div key="forgot" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }}>
              <Card className="w-full max-w-md bg-slate-900 border-purple-500/20 shadow-2xl">
                <CardHeader>
                  <div className="flex items-center gap-3 mb-1">
                    {stepConfig[forgotStep].icon}
                    <CardTitle className="text-xl text-white">{stepConfig[forgotStep].title}</CardTitle>
                  </div>
                  <CardDescription className="text-slate-400">{stepConfig[forgotStep].desc}</CardDescription>

                  {/* Step indicator */}
                  <div className="flex gap-2 mt-4">
                    {(["email", "otp", "newPassword"] as ForgotStep[]).map((s, i) => (
                      <div key={s} className={`h-1 flex-1 rounded-full transition-all ${forgotStep === s || (i < ["email","otp","newPassword"].indexOf(forgotStep)) ? "bg-purple-500" : "bg-slate-700"}`} />
                    ))}
                  </div>
                </CardHeader>

                <AnimatePresence mode="wait">
                  {forgotStep === "email" && (
                    <motion.form key="step-email" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onSubmit={handleRequestOtp}>
                      <CardContent className="space-y-4">
                        <div className="space-y-2">
                          <Label className="text-slate-300">Email Address</Label>
                          <Input
                            type="email"
                            placeholder="student@college.edu"
                            value={forgotEmail}
                            onChange={e => setForgotEmail(e.target.value)}
                            className="bg-slate-800 border-slate-700 text-white"
                            required
                          />
                        </div>
                      </CardContent>
                      <CardFooter className="flex-col gap-3">
                        <Button type="submit" disabled={isForgotLoading} className="w-full bg-purple-600 hover:bg-purple-500 text-white">
                          {isForgotLoading ? "Sending OTP..." : "Send OTP"}
                        </Button>
                        <ProgressBar isLoading={isForgotLoading} color="bg-purple-500" />
                        <button type="button" onClick={resetForgotFlow} className="flex items-center gap-1 text-xs text-slate-400 hover:text-white transition-colors">
                          <ArrowLeft className="w-3 h-3" /> Back to Login
                        </button>
                      </CardFooter>
                    </motion.form>
                  )}

                  {forgotStep === "otp" && (
                    <motion.form key="step-otp" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onSubmit={handleVerifyOtp}>
                      <CardContent className="space-y-4">
                        <div className="space-y-2">
                          <Label className="text-slate-300">6-Digit OTP</Label>
                          <Input
                            type="text"
                            placeholder="123456"
                            maxLength={6}
                            value={otp}
                            onChange={e => setOtp(e.target.value.replace(/\D/g, ""))}
                            className="bg-slate-800 border-slate-700 text-white text-center tracking-[0.5em] text-lg font-mono"
                            required
                          />
                        </div>
                      </CardContent>
                      <CardFooter className="flex-col gap-3">
                        <Button type="submit" disabled={isForgotLoading || otp.length !== 6} className="w-full bg-purple-600 hover:bg-purple-500 text-white">
                          {isForgotLoading ? "Verifying..." : "Verify OTP"}
                        </Button>
                        <ProgressBar isLoading={isForgotLoading} color="bg-purple-500" />

                        {/* Resend OTP countdown */}
                        <div className="flex items-center justify-between w-full text-xs">
                          <button type="button" onClick={() => setForgotStep("email")} className="flex items-center gap-1 text-slate-400 hover:text-white transition-colors">
                            <ArrowLeft className="w-3 h-3" /> Back
                          </button>
                          {resendCountdown > 0 ? (
                            <span className="text-slate-500">
                              Resend in <span className="text-purple-400 font-mono font-bold">{resendCountdown}s</span>
                            </span>
                          ) : (
                            <button
                              type="button"
                              disabled={isForgotLoading}
                              onClick={async () => {
                                setIsForgotLoading(true);
                                try {
                                  await axios.post(`${API_URL}/auth/request-password-reset`, { email: forgotEmail });
                                  toast.success("New OTP sent!");
                                  setOtp("");
                                  startCountdown();
                                } catch (err: any) {
                                  toast.error(err.response?.data?.detail || "Failed to resend OTP.");
                                } finally {
                                  setIsForgotLoading(false);
                                }
                              }}
                              className="text-purple-400 hover:text-purple-300 transition-colors font-medium disabled:opacity-50"
                            >
                              Resend OTP
                            </button>
                          )}
                        </div>
                      </CardFooter>
                    </motion.form>
                  )}

                  {forgotStep === "newPassword" && (
                    <motion.form key="step-newpw" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onSubmit={handleResetPassword}>
                      <CardContent className="space-y-4">
                        <div className="space-y-2">
                          <Label className="text-slate-300">New Password</Label>
                          <Input
                            type="password"
                            value={newPassword}
                            onChange={e => setNewPassword(e.target.value)}
                            className="bg-slate-800 border-slate-700 text-white"
                            required
                            minLength={6}
                          />
                        </div>
                        <div className="space-y-2">
                          <Label className="text-slate-300">Confirm New Password</Label>
                          <Input
                            type="password"
                            value={confirmPassword}
                            onChange={e => setConfirmPassword(e.target.value)}
                            className="bg-slate-800 border-slate-700 text-white"
                            required
                            minLength={6}
                          />
                        </div>
                      </CardContent>
                      <CardFooter className="flex-col gap-3">
                        <Button type="submit" disabled={isForgotLoading} className="w-full bg-green-600 hover:bg-green-500 text-white">
                          {isForgotLoading ? "Resetting..." : "Reset Password"}
                        </Button>
                        <ProgressBar isLoading={isForgotLoading} color="bg-green-500" />
                      </CardFooter>
                    </motion.form>
                  )}
                </AnimatePresence>
              </Card>
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>
    </div>
  );
}
