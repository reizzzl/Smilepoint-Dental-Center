
import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "../../lib/supabase";
import "../shared.css";

export default function Login() {
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function handleLogin(e) {
    e.preventDefault();
    setError("");
    setLoading(true);

    const { error: loginError } =
      await supabase.auth.signInWithPassword({
        email,
        password,
      });

    setLoading(false);

    if (loginError) {
      setError(loginError.message);
      return;
    }

    navigate("/admin", { replace: true });
  }

  return (
    <div className="sp-login-page">
      <form className="sp-login-card" onSubmit={handleLogin}>
        <div className="sp-login-logo">✦</div>
        <h1>Smilepoint</h1>
        <p>Dental Center Management System</p>

        <h2>Welcome Back</h2>

        {error && <p className="sp-error">{error}</p>}

        <label>Email Address</label>
        <input
          type="email"
          placeholder="Enter your email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
        />

        <label>Password</label>
        <input
          type="password"
          placeholder="Enter your password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
        />

        <button
          type="submit"
          className="sp-primary-btn sp-full-btn"
          disabled={loading}
        >
          {loading ? "Signing in..." : "Sign In"}
        </button>

        <small>Authorized personnel only</small>
      </form>
    </div>
  );
}
