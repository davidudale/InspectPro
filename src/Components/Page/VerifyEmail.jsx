import React, { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { sendEmailVerification } from "firebase/auth";
import { MailCheck, RefreshCcw, LogOut } from "lucide-react";
import { toast } from "react-toastify";
import { auth } from "../Auth/firebase";
import { useAuth } from "../Auth/AuthContext";
import { getToastErrorMessage } from "../../utils/toast";

const verificationActionCodeSettings = {
  url: `${window.location.origin}/login`,
  handleCodeInApp: false,
};

const VerifyEmail = () => {
  const navigate = useNavigate();
  const { user, logout, refreshEmailVerification } = useAuth();
  const [isSending, setIsSending] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);

  const emailAddress = useMemo(
    () => auth.currentUser?.email || user?.email || "your email address",
    [user?.email],
  );

  const handleResend = async () => {
    if (!auth.currentUser) {
      toast.error("No active user session found.");
      return;
    }

    setIsSending(true);
    try {
      await sendEmailVerification(auth.currentUser, verificationActionCodeSettings);
      toast.success("Verification email sent again.");
    } catch (error) {
      toast.error(getToastErrorMessage(error, "Unable to resend verification email."));
    } finally {
      setIsSending(false);
    }
  };

  const handleRefreshStatus = async () => {
    setIsRefreshing(true);
    try {
      const verified = await refreshEmailVerification();
      if (verified) {
        toast.success("Email verified successfully.");
        navigate("/login", { replace: true });
      } else {
        toast.info("Your email is not verified yet. Please check your inbox.");
      }
    } catch (error) {
      toast.error(getToastErrorMessage(error, "Unable to refresh verification status."));
    } finally {
      setIsRefreshing(false);
    }
  };

  const handleLogout = async () => {
    await logout();
    navigate("/login", { replace: true });
  };

  return (
    <div className="min-h-screen bg-slate-950 px-4 py-10 text-slate-100">
      <div className="mx-auto flex min-h-[calc(100vh-5rem)] max-w-2xl items-center justify-center">
        <div className="w-full rounded-[2rem] border border-slate-800 bg-slate-900/70 p-8 shadow-2xl backdrop-blur-md">
          <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl border border-orange-500/30 bg-orange-500/10 text-orange-400">
            <MailCheck size={28} />
          </div>

          <div className="mt-6 text-center">
            <p className="text-[10px] font-black uppercase tracking-[0.24em] text-orange-400">
              Email Verification
            </p>
            <h1 className="mt-3 text-3xl font-black tracking-tight text-white">
              Verify your email to continue
            </h1>
            <p className="mt-4 text-sm leading-7 text-slate-300">
              We sent a verification link to <span className="font-semibold text-white">{emailAddress}</span>.
              Open your inbox, click the verification link, then come back here and refresh your status.
            </p>
          </div>

          <div className="mt-8 grid gap-3 sm:grid-cols-2">
            <button
              type="button"
              onClick={handleResend}
              disabled={isSending}
              className="rounded-2xl border border-orange-500/30 bg-orange-500/10 px-5 py-3 text-sm font-black uppercase tracking-[0.16em] text-orange-200 transition-colors hover:bg-orange-500/20 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {isSending ? "Sending..." : "Resend Email"}
            </button>
            <button
              type="button"
              onClick={handleRefreshStatus}
              disabled={isRefreshing}
              className="inline-flex items-center justify-center gap-2 rounded-2xl bg-orange-500 px-5 py-3 text-sm font-black uppercase tracking-[0.16em] text-white transition-colors hover:bg-orange-600 disabled:cursor-not-allowed disabled:opacity-60"
            >
              <RefreshCcw size={16} className={isRefreshing ? "animate-spin" : ""} />
              {isRefreshing ? "Checking..." : "I Have Verified"}
            </button>
          </div>

          <button
            type="button"
            onClick={handleLogout}
            className="mt-4 inline-flex w-full items-center justify-center gap-2 rounded-2xl border border-slate-700 bg-slate-950 px-5 py-3 text-sm font-bold text-slate-200 transition-colors hover:text-white"
          >
            <LogOut size={16} />
            Sign Out
          </button>
        </div>
      </div>
    </div>
  );
};

export default VerifyEmail;
