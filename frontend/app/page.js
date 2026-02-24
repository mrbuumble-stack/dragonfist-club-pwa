"use client";

import { useState } from "react";

export default function Home() {
  const [view, setView] = useState("login"); // login | dashboard
  const [email, setEmail] = useState("");
  const [member, setMember] = useState(null);
  const [leaderboard, setLeaderboard] = useState([]);
  const [activeTab, setActiveTab] = useState("profilo");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  // ── Login ────────────────────────────────────────
  async function handleLogin(e) {
    e.preventDefault();
    if (!email.trim()) return;

    setLoading(true);
    setError("");

    try {
      const res = await fetch(
        `/api/member?email=${encodeURIComponent(email.trim())}`
      );

      if (!res.ok) {
        const data = await res.json();
        setError(data.error || "Membro non trovato.");
        setLoading(false);
        return;
      }

      const memberData = await res.json();
      setMember(memberData);

      // Fetch leaderboard in parallelo
      const lbRes = await fetch("/api/leaderboard");
      if (lbRes.ok) {
        const lbData = await lbRes.json();
        setLeaderboard(lbData.leaderboard || []);
      }

      setView("dashboard");
    } catch {
      setError("Errore di connessione. Riprova.");
    } finally {
      setLoading(false);
    }
  }

  // ── Logout ───────────────────────────────────────
  function handleLogout() {
    setView("login");
    setMember(null);
    setLeaderboard([]);
    setActiveTab("profilo");
    setError("");
  }

  // ── Initials for avatar placeholder ──────────────
  function getInitials(nome, cognome) {
    return `${(nome || "?")[0]}${(cognome || "?")[0]}`.toUpperCase();
  }

  // ── Rank medal ───────────────────────────────────
  function getRankDisplay(index) {
    if (index === 0) return { symbol: "🥇", className: "gold" };
    if (index === 1) return { symbol: "🥈", className: "silver" };
    if (index === 2) return { symbol: "🥉", className: "bronze" };
    return { symbol: `${index + 1}`, className: "" };
  }

  // ═══════════════════════════════════════════════════
  //  LOGIN VIEW
  // ═══════════════════════════════════════════════════
  if (view === "login") {
    return (
      <>
        <div className="bg-pattern" />
        <div className="app-container">
          <div className="logo-section fade-in-up">
            <img
              src="/icon-512.png"
              alt="DragonFist Club"
              className="logo-img"
            />
            <h1 className="logo-title">DragonFist Club</h1>
            <p className="logo-subtitle">Area Membri</p>
          </div>

          <div className="login-card fade-in-up fade-in-up-delay-1">
            <h2>Accedi</h2>
            <p>Inserisci la tua email per vedere i tuoi punti</p>

            <form onSubmit={handleLogin}>
              <div className="input-group">
                <span className="input-icon">✉</span>
                <input
                  id="email-input"
                  type="email"
                  placeholder="la-tua@email.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  autoFocus
                  autoComplete="email"
                />
              </div>

              <button
                id="login-btn"
                type="submit"
                className="btn-primary"
                disabled={loading}
              >
                {loading ? (
                  <span className="spinner" style={{ margin: "0 auto" }} />
                ) : (
                  "Accedi 🐉"
                )}
              </button>

              {error && <p className="error-text">{error}</p>}
            </form>
          </div>
        </div>
      </>
    );
  }

  // ═══════════════════════════════════════════════════
  //  DASHBOARD VIEW
  // ═══════════════════════════════════════════════════
  const maxStorico =
    member?.storico && member.storico.length > 0
      ? Math.max(...member.storico)
      : 1;

  return (
    <>
      <div className="bg-pattern" />
      <div className="app-container">
        {/* Header */}
        <div className="logo-section fade-in-up">
          <img
            src="/icon-512.png"
            alt="DragonFist Club"
            className="logo-img"
            style={{ width: "64px", height: "64px", borderRadius: "16px" }}
          />
          <h1
            className="logo-title"
            style={{ fontSize: "1.3rem" }}
          >
            DragonFist Club
          </h1>
        </div>

        {/* Tabs */}
        <div className="tabs fade-in-up fade-in-up-delay-1">
          <button
            className={`tab ${activeTab === "profilo" ? "active" : ""}`}
            onClick={() => setActiveTab("profilo")}
          >
            👤 Profilo
          </button>
          <button
            className={`tab ${activeTab === "classifica" ? "active" : ""}`}
            onClick={() => setActiveTab("classifica")}
          >
            🏆 Classifica
          </button>
        </div>

        {/* ── Tab: Profilo ─────────────────────────── */}
        {activeTab === "profilo" && member && (
          <div className="profile-section fade-in-up fade-in-up-delay-2">
            <div className="profile-card">
              {/* Avatar */}
              <div className="profile-avatar">
                {member.foto ? (
                  <img src={member.foto} alt={member.nome} />
                ) : (
                  <div className="avatar-placeholder">
                    {getInitials(member.nome, member.cognome)}
                  </div>
                )}
              </div>

              {/* Name & Email */}
              <h2 className="profile-name">
                {member.nome} {member.cognome}
              </h2>
              <p className="profile-email">{member.email}</p>

              {/* Points */}
              <div className="points-display">
                <p className="points-label">Punti Totali</p>
                <p className="points-value count-up">
                  {member.punti}
                  <span className="points-suffix"> pts</span>
                </p>
              </div>

              {/* Points History */}
              {member.storico && member.storico.length > 1 && (
                <div className="history-section">
                  <p className="history-title">📊 Storico Punti</p>
                  <div className="history-bars">
                    {member.storico.map((pts, i) => (
                      <div
                        key={i}
                        className="history-bar"
                        style={{
                          height: `${Math.max((pts / maxStorico) * 100, 10)}%`,
                        }}
                      >
                        <span className="bar-tooltip">{pts} pts</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            <div style={{ textAlign: "center" }}>
              <button className="btn-logout" onClick={handleLogout}>
                Esci
              </button>
            </div>
          </div>
        )}

        {/* ── Tab: Classifica ──────────────────────── */}
        {activeTab === "classifica" && (
          <div className="leaderboard-section fade-in-up fade-in-up-delay-2">
            <div className="leaderboard-card">
              <h3 className="leaderboard-title">🏆 Classifica</h3>

              {leaderboard.length === 0 ? (
                <p style={{ color: "var(--text-secondary)", fontSize: "0.9rem" }}>
                  Nessun dato disponibile
                </p>
              ) : (
                <ul className="leaderboard-list">
                  {leaderboard.map((entry, index) => {
                    const rank = getRankDisplay(index);
                    const isCurrentUser = entry.email === member?.email;

                    return (
                      <li
                        key={entry.email}
                        className={`leaderboard-item ${isCurrentUser ? "current-user" : ""
                          }`}
                      >
                        <span className={`rank ${rank.className}`}>
                          {rank.symbol}
                        </span>

                        <div className="leaderboard-avatar">
                          {entry.foto ? (
                            <img src={entry.foto} alt={entry.nome} />
                          ) : (
                            getInitials(entry.nome, entry.cognome)
                          )}
                        </div>

                        <span className="leaderboard-name">
                          {entry.nome} {entry.cognome}
                          {isCurrentUser && " ⭐"}
                        </span>

                        <span className="leaderboard-points">
                          {entry.punti}
                        </span>
                      </li>
                    );
                  })}
                </ul>
              )}
            </div>

            <div style={{ textAlign: "center" }}>
              <button className="btn-logout" onClick={handleLogout}>
                Esci
              </button>
            </div>
          </div>
        )}
      </div>
    </>
  );
}
