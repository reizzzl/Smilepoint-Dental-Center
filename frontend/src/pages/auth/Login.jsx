import { useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  Activity,
  Eye,
  EyeOff,
  Mail,
  LockKeyhole,
  ShieldCheck,
  AlertCircle,
  LoaderCircle,
} from "lucide-react";

import { supabase } from "../../lib/supabase";
import "./Login.css";

export default function Login() {
  const navigate = useNavigate();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function handleLogin(e) {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      const { error: loginError } =
        await supabase.auth.signInWithPassword({
          email: email.trim(),
          password,
        });

      if (loginError) {
        setError(
          loginError.message === "Invalid login credentials"
            ? "Invalid email address or password."
            : loginError.message
        );
        return;
      }

      navigate("/admin", { replace: true });
    } catch {
      setError("Unable to sign in. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="smile-login-page">

      {/* LEFT SIDE — CLINIC BRANDING */}
      <section className="smile-login-branding">
        <div className="smile-login-brand">
          <div className="smile-login-brand-icon">
            <Activity size={28} />
          </div>

          <div>
            <h1>Smilepoint</h1>
            <span>Dental Center</span>
          </div>
        </div>

        <div className="smile-login-hero">
          <img
            src="/images/clinic.jpg"
            alt="Smilepoint Dental Center clinic"
            onError={(e) => {
              e.currentTarget.style.display = "none";
            }}
          />
        </div>

        <div className="smile-login-tagline">
          <span className="smile-login-tagline-label">
            SMILEPOINT DENTAL CENTER
          </span>

          <h2>
            Quality dental care at the price the patient
            can afford.
          </h2>

          <p>Dental Center Management System</p>
        </div>
      </section>

      {/* RIGHT SIDE — LOGIN FORM */}
      <section className="smile-login-content">
        <div className="smile-login-form-wrapper">

          <div className="smile-login-heading">
            <h2>Log in</h2>
            <p>
              Staff and Admin accounts use the same form.
            </p>
          </div>

          {error && (
            <div className="smile-login-error" role="alert">
              <AlertCircle size={18} />
              <span>{error}</span>
            </div>
          )}

          <form
            className="smile-login-form"
            onSubmit={handleLogin}
          >
            <div className="smile-login-field">
              <label htmlFor="email">Email Address</label>

              <div className="smile-login-input">
                <Mail size={19} />

                <input
                  id="email"
                  type="email"
                  placeholder="Enter your email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  autoComplete="username"
                  disabled={loading}
                  required
                />
              </div>
            </div>

            <div className="smile-login-field">
              <label htmlFor="password">Password</label>

              <div className="smile-login-input">
                <LockKeyhole size={19} />

                <input
                  id="password"
                  type={showPassword ? "text" : "password"}
                  placeholder="Enter your password"
                  value={password}
                  onChange={(e) =>
                    setPassword(e.target.value)
                  }
                  autoComplete="current-password"
                  disabled={loading}
                  required
                />

                <button
                  type="button"
                  className="smile-password-toggle"
                  onClick={() =>
                    setShowPassword(!showPassword)
                  }
                  aria-label={
                    showPassword
                      ? "Hide password"
                      : "Show password"
                  }
                >
                  {showPassword ? (
                    <EyeOff size={19} />
                  ) : (
                    <Eye size={19} />
                  )}
                </button>
              </div>
            </div>

            <button
              type="submit"
              className="smile-login-button"
              disabled={loading}
            >
              {loading && (
                <LoaderCircle
                  size={19}
                  className="smile-login-spinner"
                />
              )}

              {loading ? "Logging in..." : "Log in"}
            </button>
          </form>

          <p className="smile-login-help">
            Trouble logging in? Ask the clinic Admin to
            reset your account.
          </p>

          <div className="smile-login-security">
            <ShieldCheck size={18} />
            <span>Authorized personnel only</span>
          </div>

        </div>
      </section>
    </div>
  );
}
