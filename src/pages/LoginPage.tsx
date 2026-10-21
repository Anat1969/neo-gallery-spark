import { useState } from "react";
import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import { supabase } from "@/integrations/supabase/client";
import { Input } from "@/components/ui/input";
import AnatLogo from "@/components/AnatLogo";

type Status = "idle" | "sending" | "sent" | "error";

/**
 * Google sign-in is disabled in the shared CULTURA-GH project, so sign-in is by a one-time
 * email link. Only existing accounts can sign in (no open sign-up into the shared project).
 */
const LoginPage = () => {
  const [email, setEmail] = useState("");
  const [status, setStatus] = useState<Status>("idle");
  const [message, setMessage] = useState("");

  const send = async (e: React.FormEvent) => {
    e.preventDefault();
    setStatus("sending");
    const { error } = await supabase.auth.signInWithOtp({
      email: email.trim(),
      options: { emailRedirectTo: window.location.origin, shouldCreateUser: false },
    });
    if (error) {
      setStatus("error");
      setMessage(
        /signups? not allowed|not found/i.test(error.message)
          ? "הכתובת הזו אינה רשומה במערכת."
          : "השליחה נכשלה. נסי שוב בעוד דקה.",
      );
    } else {
      setStatus("sent");
      setMessage("נשלח קישור כניסה למייל. פתחי אותו מאותו דפדפן.");
    }
  };

  return (
    <div className="relative flex min-h-[calc(100dvh-4rem)] items-center justify-center overflow-hidden px-4" dir="rtl">
      <div className="login-planes" aria-hidden />
      <motion.div
        initial={{ opacity: 0, y: 24, rotateX: 8 }}
        animate={{ opacity: 1, y: 0, rotateX: 0 }}
        transition={{ duration: 0.7, ease: [0.2, 0.8, 0.2, 1] }}
        className="relative w-full max-w-sm space-y-6 rounded-xl border border-border/70 bg-card/80 p-8 shadow-[0_30px_80px_-30px_rgba(0,0,0,0.9)] backdrop-blur"
      >
        <div className="flex flex-col items-center gap-4 text-center">
          <AnatLogo size={48} />
          <h1 className="text-3xl font-extralight tracking-tight">כניסה</h1>
          <p className="font-mono text-xs text-muted-foreground">קישור כניסה חד־פעמי למייל</p>
        </div>

        <p className="rounded-md border border-border/60 bg-secondary/40 p-3 text-sm leading-relaxed text-muted-foreground">
          כניסה עם Google אינה פעילה כרגע בפרויקט. הכניסה נעשית בקישור שנשלח למייל, לחשבונות קיימים בלבד.
        </p>

        <form onSubmit={send} className="space-y-3">
          <label className="block font-mono text-xs text-muted-foreground" htmlFor="email">אימייל</label>
          <Input id="email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} required dir="ltr" />
          <button
            type="submit"
            disabled={status === "sending"}
            className="h-11 w-full rounded-md bg-foreground text-sm font-medium text-background transition-opacity hover:opacity-90 disabled:opacity-50"
          >
            {status === "sending" ? "שולחת..." : "שליחת קישור כניסה"}
          </button>
        </form>

        {message && (
          <p role="status" className={status === "error" ? "text-sm text-destructive" : "text-sm text-foreground"}>
            {message}
          </p>
        )}

        <Link to="/" className="block text-center text-sm text-muted-foreground hover:text-foreground">
          חזרה לגלריות
        </Link>
      </motion.div>
    </div>
  );
};

export default LoginPage;
