import { useEffect, useState } from "react";
import { useOutletContext } from "react-router-dom";

import {
  UserRound,
  Mail,
  ShieldCheck,
  LockKeyhole,
  CalendarDays,
  Eye,
  EyeOff,
  Save,
  RefreshCw,
} from "lucide-react";

import { supabase } from "../../lib/supabase";

import "../shared.css";
import "./AccountManagement.css";

export default function AccountManagement() {
  const { staff } = useOutletContext();

  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [error, setError] = useState("");
  const [passwordError, setPasswordError] = useState("");
  const [success, setSuccess] = useState("");

  const [showPassword, setShowPassword] = useState(false);

  const [passwords, setPasswords] = useState({
    current: "",
    newPassword: "",
    confirm: "",
  });

  async function loadProfile() {
    setLoading(true);
    setError("");

    try {
      const {
        data: { user },
        error: authError,
      } = await supabase.auth.getUser();

      if (authError) throw authError;

      if (!user) {
        throw new Error("Please sign in again.");
      }

      const { data, error } = await supabase
        .from("staff_account")
        .select(
          "staff_id,full_name,email,role,is_active,created_at"
        )
        .eq("staff_id", user.id)
        .single();

      if (error) throw error;

      setProfile(data);
    } catch (err) {
      setProfile(null);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadProfile();
  }, []);

  function handleChange(e) {
    const { name, value } = e.target;

    setPasswords((previous) => ({
      ...previous,
      [name]: value,
    }));
  }

  async function handlePasswordChange(e) {
    e.preventDefault();

    setPasswordError("");
    setSuccess("");

    if (!passwords.current) {
      setPasswordError("Enter your current password.");
      return;
    }

    if (passwords.newPassword.length < 8) {
      setPasswordError(
        "Your new password must contain at least 8 characters."
      );
      return;
    }

    if (passwords.newPassword !== passwords.confirm) {
      setPasswordError("New passwords do not match.");
      return;
    }

    if (passwords.current === passwords.newPassword) {
      setPasswordError(
        "Your new password must be different from your current password."
      );
      return;
    }

    setSaving(true);

    try {
      const {
        data: { user },
        error: userError,
      } = await supabase.auth.getUser();

      if (userError) throw userError;

      if (!user?.email) {
        throw new Error("Please sign in again.");
      }

      const { data: verified, error: verifyError } =
        await supabase.auth.signInWithPassword({
          email: user.email,
          password: passwords.current,
        });

      if (verifyError) {
        throw new Error(
          "Unable to verify your current password."
        );
      }

      if (verified.user?.id !== user.id) {
        await supabase.auth.signOut();
        throw new Error("Account verification failed.");
      }

      const { error: updateError } =
        await supabase.auth.updateUser({
          password: passwords.newPassword,
        });

      if (updateError) throw updateError;

      setSuccess("Your password has been changed successfully.");

      setPasswords({
        current: "",
        newPassword: "",
        confirm: "",
      });
    } catch (err) {
      setPasswordError(err.message);
    } finally {
      setSaving(false);
    }
  }

  const roleLabels = {
    admin: "Administrator",
    dentist: "Dentist",
    receptionist: "Receptionist",
  };

  const role = profile?.role || staff?.role;

  const roleLabel = roleLabels[role] || "Staff";

  const initials = (profile?.full_name || staff?.full_name || "")
    .trim()
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((name) => name[0].toUpperCase())
    .join("");

  return (
    <div className="sp-page account-page">
      <div className="sp-page-header">
        <div>
          <h1>Account Management</h1>
          <p>
            View your personal information and manage
            your account security.
          </p>
        </div>

        <button
          className="sp-secondary-btn"
          onClick={loadProfile}
          disabled={loading || saving}
        >
          <RefreshCw size={17} />
          Refresh
        </button>
      </div>

      {error && <div className="sp-error">{error}</div>}

      {loading ? (
        <div className="sp-panel">
          <p className="sp-empty">
            Loading your account...
          </p>
        </div>
      ) : profile ? (
        <>
          <section className="am-profile-banner">
            <div className="am-avatar">
              {initials || <UserRound size={32} />}
            </div>

            <div className="am-profile-heading">
              <h2>{profile.full_name}</h2>
              <p>{profile.email}</p>

              <div className="am-profile-badges">
                <span className="am-role-badge">
                  {roleLabel}
                </span>

                <span
                  className={
                    profile.is_active
                      ? "am-active-badge"
                      : "am-inactive-badge"
                  }
                >
                  {profile.is_active
                    ? "Active Account"
                    : "Inactive Account"}
                </span>
              </div>
            </div>
          </section>

          <div className="am-layout">
            <section className="am-card">
              <div className="am-card-header">
                <UserRound size={20} />

                <div>
                  <h2>Personal Information</h2>
                  <p>Your registered account details.</p>
                </div>
              </div>

              <div className="am-card-body">
                <div className="am-info-field">
                  <UserRound size={19} />

                  <div>
                    <label>Full Name</label>
                    <strong>{profile.full_name}</strong>
                  </div>
                </div>

                <div className="am-info-field">
                  <Mail size={19} />

                  <div>
                    <label>Email Address</label>
                    <strong>{profile.email}</strong>
                  </div>
                </div>

                <div className="am-info-field">
                  <ShieldCheck size={19} />

                  <div>
                    <label>Account Role</label>
                    <strong>{roleLabel}</strong>
                  </div>
                </div>

                <div className="am-info-field">
                  <CalendarDays size={19} />

                  <div>
                    <label>Date Registered</label>

                    <strong>
                      {profile.created_at
                        ? new Date(
                            profile.created_at
                          ).toLocaleDateString("en-PH", {
                            year: "numeric",
                            month: "long",
                            day: "numeric",
                          })
                        : "—"}
                    </strong>
                  </div>
                </div>

                <div className="am-info-field">
                  <ShieldCheck size={19} />

                  <div>
                    <label>Staff ID</label>
                    <strong>{profile.staff_id}</strong>
                  </div>
                </div>

                <div className="am-notice">
                  Contact your administrator if you need
                  to update your name, email address,
                  or account role.
                </div>
              </div>
            </section>

            <section className="am-card">
              <div className="am-card-header">
                <LockKeyhole size={20} />

                <div>
                  <h2>Change Password</h2>
                  <p>Keep your account secure.</p>
                </div>
              </div>

              <div className="am-card-body">
                {passwordError && (
                  <div className="sp-error">
                    {passwordError}
                  </div>
                )}

                {success && (
                  <div className="sp-success">
                    {success}
                  </div>
                )}

                <form
                  className="am-password-form"
                  onSubmit={handlePasswordChange}
                >
                  <div className="am-form-group">
                    <label htmlFor="current">
                      Current Password
                    </label>

                    <div className="am-password-input">
                      <input
                        id="current"
                        type={showPassword ? "text" : "password"}
                        name="current"
                        value={passwords.current}
                        onChange={handleChange}
                        placeholder="Enter current password"
                        autoComplete="current-password"
                        required
                      />

                      <button
                        type="button"
                        onClick={() =>
                          setShowPassword(!showPassword)
                        }
                        aria-label={
                          showPassword
                            ? "Hide passwords"
                            : "Show passwords"
                        }
                      >
                        {showPassword ? (
                          <EyeOff size={18} />
                        ) : (
                          <Eye size={18} />
                        )}
                      </button>
                    </div>
                  </div>

                  <div className="am-form-group">
                    <label htmlFor="newPassword">
                      New Password
                    </label>

                    <input
                      id="newPassword"
                      type={showPassword ? "text" : "password"}
                      name="newPassword"
                      value={passwords.newPassword}
                      onChange={handleChange}
                      placeholder="Enter new password"
                      autoComplete="new-password"
                      minLength={8}
                      required
                    />

                    <small>
                      Must contain at least 8 characters.
                    </small>
                  </div>

                  <div className="am-form-group">
                    <label htmlFor="confirm">
                      Confirm New Password
                    </label>

                    <input
                      id="confirm"
                      type={showPassword ? "text" : "password"}
                      name="confirm"
                      value={passwords.confirm}
                      onChange={handleChange}
                      placeholder="Confirm new password"
                      autoComplete="new-password"
                      required
                    />
                  </div>

                  <button
                    type="submit"
                    className="sp-primary-btn"
                    disabled={saving || !profile.is_active}
                  >
                    <Save size={17} />

                    {saving
                      ? "Updating Password..."
                      : "Update Password"}
                  </button>
                </form>
              </div>
            </section>
          </div>
        </>
      ) : (
        <div className="sp-panel">
          <p className="sp-empty">
            Unable to display your account information.
          </p>
        </div>
      )}
    </div>
  );
}