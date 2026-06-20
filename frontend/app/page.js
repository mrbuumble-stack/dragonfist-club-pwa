"use client";

import { useState, useEffect, useRef } from "react";

// Contatore animato per i punti del profilo
function CountUp({ end, duration = 1000 }) {
  const [count, setCount] = useState(0);

  useEffect(() => {
    let startTimestamp = null;
    const step = (timestamp) => {
      if (!startTimestamp) startTimestamp = timestamp;
      const progress = Math.min((timestamp - startTimestamp) / duration, 1);
      const easedProgress = 1 - Math.pow(1 - progress, 3); // Ease out cubic
      setCount(Math.floor(easedProgress * end));
      if (progress < 1) {
        window.requestAnimationFrame(step);
      }
    };
    window.requestAnimationFrame(step);
  }, [end, duration]);

  return <span className="animate-number">{count}</span>;
}

export default function Home() {
  // ── State variables ─────────────────────────────────
  const [view, setView] = useState("login"); // login | dashboard | game_setup | game_mode
  const [email, setEmail] = useState("");
  const [member, setMember] = useState(null);
  const [leaderboard, setLeaderboard] = useState([]);
  const [activeTab, setActiveTab] = useState("profilo"); // profilo | classifica | admin
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [successBanner, setSuccessBanner] = useState("");

  // Game catalog & Setup states
  const [games, setGames] = useState([]);
  const [gameSearch, setGameSearch] = useState("");
  const [selectedGame, setSelectedGame] = useState(null);
  const [isGameDropdownOpen, setIsGameDropdownOpen] = useState(false);
  const [selectedSoci, setSelectedSoci] = useState([]); // Array of emails
  const [guestName, setGuestName] = useState("");
  const [guestsList, setGuestsList] = useState([]); // Array of strings (names)
  const [setupSocioSearch, setSetupSocioSearch] = useState("");
  
  // Game session active states (Phase 2)
  const [sessionPlayers, setSessionPlayers] = useState([]); // Combined list of { nome, email, type: 'socio'|'ospite' }
  const [activeGameTool, setActiveGameTool] = useState("sorteggio"); // sorteggio | dadi | timer | rng | segnapunti
  
  // Tool 1: Random Selector state
  const [drawnPlayer, setDrawnPlayer] = useState("");
  const [isDrawing, setIsDrawing] = useState(false);
  const [drawHistory, setDrawHistory] = useState([]);

  // Tool 2: Dice Roller state
  const [dicePool, setDicePool] = useState({ d4: 0, d6: 0, d8: 0, d10: 0, d12: 0, d20: 0, d100: 0 });
  const [diceResultSum, setDiceResultSum] = useState(0);
  const [diceResultBreakdown, setDiceResultBreakdown] = useState("");
  const [diceHistory, setDiceHistory] = useState([]);

  // Tool 3: Timer state
  const [timerDuration, setTimerDuration] = useState(60);
  const [timerSecondsLeft, setTimerSecondsLeft] = useState(60);
  const [timerActive, setTimerActive] = useState(false);
  const [timerPaused, setTimerPaused] = useState(false);
  const [customTimerInput, setCustomTimerInput] = useState("");

  // Tool 4: RNG state
  const [rngMin, setRngMin] = useState(1);
  const [rngMax, setRngMax] = useState(100);
  const [rngQuantity, setRngQuantity] = useState(1);
  const [rngNoRepeat, setRngNoRepeat] = useState(false);
  const [rngResults, setRngResults] = useState([]);

  // Tool 5: Dynamic Turn Scorekeeper state
  const [scorekeeperScores, setScorekeeperScores] = useState({}); // key: email or name -> val: points

  // Phase 3: Chiusura Partita states
  const [showEndGameModal, setShowEndGameModal] = useState(false);
  const [selectedWinners, setSelectedWinners] = useState([]); // List of player keys (email or guest name)
  const [showGamesModal, setShowGamesModal] = useState(false);

  // Admin Panel states
  const [adminSearchQuery, setAdminSearchQuery] = useState("");
  const [adminDeltas, setAdminDeltas] = useState({}); // key: email -> points delta

  const cardRef = useRef(null);

  // ── Service Worker & Initial Mount ──────────────────
  useEffect(() => {
    if ("serviceWorker" in navigator) {
      navigator.serviceWorker
        .register("/sw.js")
        .then((reg) => console.log("SW Registered", reg))
        .catch((err) => console.log("SW Error", err));
    }
    
    // Auto login se l'email è salvata nel localStorage
    const savedEmail = localStorage.getItem("dragonfist_logged_email");
    if (savedEmail) {
      async function autoLogin() {
        setLoading(true);
        try {
          const res = await fetch(`/api/member?email=${encodeURIComponent(savedEmail.trim())}`);
          if (res.ok) {
            const memberData = await res.json();
            setMember(memberData);
            
            // Fetch leaderboard
            const lbRes = await fetch("/api/leaderboard");
            if (lbRes.ok) {
              const lbData = await lbRes.json();
              setLeaderboard(lbData.leaderboard || []);
            }
            setView("dashboard");
          } else {
            localStorage.removeItem("dragonfist_logged_email");
          }
        } catch (err) {
          console.error("Auto login error:", err);
        } finally {
          setLoading(false);
        }
      }
      autoLogin();
    }

    // Carica il catalogo giochi all'avvio
    async function loadGames() {
      try {
        const res = await fetch("/api/games");
        if (res.ok) {
          const data = await res.json();
          setGames(data.games || []);
        }
      } catch (err) {
        console.error("Error loading games:", err);
      }
    }
    loadGames();
  }, []);

  // ── Beep synthesizer using Web Audio API ────────────
  const playAlarmSound = () => {
    try {
      const ctx = new (window.AudioContext || window.webkitAudioContext)();
      const osc1 = ctx.createOscillator();
      const osc2 = ctx.createOscillator();
      const gainNode = ctx.createGain();
      
      osc1.type = "sine";
      osc1.frequency.setValueAtTime(880, ctx.currentTime); // A5
      osc2.type = "sine";
      osc2.frequency.setValueAtTime(440, ctx.currentTime); // A4
      
      gainNode.gain.setValueAtTime(0.5, ctx.currentTime);
      gainNode.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 1.5);
      
      osc1.connect(gainNode);
      osc2.connect(gainNode);
      gainNode.connect(ctx.destination);
      
      osc1.start();
      osc2.start();
      osc1.stop(ctx.currentTime + 1.5);
      osc2.stop(ctx.currentTime + 1.5);
      
      if (navigator.vibrate) {
        navigator.vibrate([200, 100, 200]);
      }
    } catch (e) {
      console.warn("Failed to play Web Audio sound:", e);
    }
  };

  // Timer Effect loop
  useEffect(() => {
    let interval = null;
    if (timerActive && !timerPaused && timerSecondsLeft > 0) {
      interval = setInterval(() => {
        setTimerSecondsLeft((prev) => {
          if (prev <= 1) {
            clearInterval(interval);
            setTimerActive(false);
            playAlarmSound();
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    } else {
      clearInterval(interval);
    }
    return () => clearInterval(interval);
  }, [timerActive, timerPaused, timerSecondsLeft]);

  // Holographic Card mouse hover effect
  const handleMouseMove = (e) => {
    if (!cardRef.current) return;
    const rect = cardRef.current.getBoundingClientRect();
    const x = ((e.clientX - rect.left) / rect.width) * 100;
    const y = ((e.clientY - rect.top) / rect.height) * 100;
    cardRef.current.style.setProperty("--mouse-x", `${x}%`);
    cardRef.current.style.setProperty("--mouse-y", `${y}%`);
  };

  // ── Actions: Authentication ────────────────────────
  async function handleLogin(e) {
    e.preventDefault();
    if (!email.trim()) return;

    setLoading(true);
    setError("");
    setSuccessBanner("");

    try {
      const res = await fetch(`/api/member?email=${encodeURIComponent(email.trim())}`);

      if (!res.ok) {
        const data = await res.json();
        setError(data.error || "Membro non trovato.");
        setLoading(false);
        return;
      }

      const memberData = await res.json();
      setMember(memberData);
      
      // Salva l'email nel localStorage per rimanere loggato
      localStorage.setItem("dragonfist_logged_email", memberData.email);

      // Fetch leaderboard
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

  function handleLogout() {
    // Rimuove l'email dal localStorage per uscire esplicitamente
    localStorage.removeItem("dragonfist_logged_email");
    setView("login");
    setMember(null);
    setLeaderboard([]);
    setActiveTab("profilo");
    setError("");
    setSuccessBanner("");
  }

  // Helper per avatar initials
  function getInitials(nome, cognome) {
    return `${(nome || "?")[0]}${(cognome || "?")[0]}`.toUpperCase();
  }

  // Helper per rank medals
  function getRankDisplay(index) {
    if (index === 0) return { symbol: "🥇", className: "gold" };
    if (index === 1) return { symbol: "🥈", className: "silver" };
    if (index === 2) return { symbol: "🥉", className: "bronze" };
    return { symbol: `${index + 1}`, className: "" };
  }

  // ── Actions: Admin operations ────────────────────────
  async function handleAdminUpdate(targetEmail, deltaVal) {
    if (deltaVal === 0 || isNaN(deltaVal)) return;
    setLoading(true);
    setError("");
    setSuccessBanner("");

    try {
      const res = await fetch("/api/admin/update", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: targetEmail, points: deltaVal, reason: "Admin" })
      });

      if (res.ok) {
        const resData = await res.json();
        
        // Refresh leaderboard
        const lbRes = await fetch("/api/leaderboard");
        if (lbRes.ok) {
          const lbData = await lbRes.json();
          setLeaderboard(lbData.leaderboard || []);
        }

        // Refresh our own profile if we edited ourselves
        if (member && member.email === targetEmail) {
          const myProfileRes = await fetch(`/api/member?email=${encodeURIComponent(member.email)}`);
          if (myProfileRes.ok) {
            const myProfileData = await myProfileRes.json();
            setMember(myProfileData);
          }
        }

        setSuccessBanner(`Punti modificati di ${deltaVal > 0 ? "+" : ""}${deltaVal} per ${targetEmail}`);
        if (resData.warning) {
          console.warn("API warning:", resData.warning);
        }
        
        // Reset local state delta for this user
        setAdminDeltas((prev) => ({ ...prev, [targetEmail]: "" }));
      } else {
        const data = await res.json();
        setError(data.error || "Impossibile aggiornare i punti.");
      }
    } catch {
      setError("Errore durante l'aggiornamento dei punti.");
    } finally {
      setLoading(false);
    }
  }

  // ── Actions: Game Session Setup (Phase 1) ───────────
  function handleStartSetup() {
    setSelectedGame(null);
    setGameSearch("");
    setSetupSocioSearch("");
    setSelectedSoci([member?.email].filter(Boolean)); // Inserisce di default il socio loggato
    setGuestsList([]);
    setGuestName("");
    setShowGamesModal(false);
    setView("game_setup");
  }

  function handleAddGuest() {
    const name = guestName.trim();
    if (!name) return;
    if (guestsList.includes(name)) {
      setError("Ospite già aggiunto.");
      return;
    }
    // Verifica che l'ospite non abbia lo stesso nome di un socio
    const socioDuplicate = leaderboard.some(s => `${s.nome} ${s.cognome}`.toLowerCase() === name.toLowerCase());
    if (socioDuplicate) {
      setError("Questo nome appartiene già ad un socio dell'associazione.");
      return;
    }

    setGuestsList([...guestsList, name]);
    setGuestName("");
    setError("");
  }

  function handleRemoveGuest(name) {
    setGuestsList(guestsList.filter(g => g !== name));
  }

  function toggleSocioSelect(emailVal) {
    if (selectedSoci.includes(emailVal)) {
      setSelectedSoci(selectedSoci.filter(e => e !== emailVal));
    } else {
      setSelectedSoci([...selectedSoci, emailVal]);
    }
  }

  function handleLaunchGame() {
    if (!selectedGame) {
      setError("Seleziona a quale gioco giocare.");
      return;
    }
    if (selectedSoci.length + guestsList.length === 0) {
      setError("Devi aggiungere almeno un giocatore al tavolo.");
      return;
    }

    // Costruisci l'array finale dei giocatori al tavolo
    const players = [];
    selectedSoci.forEach((emailVal) => {
      const socioObj = leaderboard.find(s => s.email === emailVal);
      if (socioObj) {
        players.push({
          nome: `${socioObj.nome} ${socioObj.cognome}`,
          email: socioObj.email,
          type: "socio"
        });
      }
    });

    guestsList.forEach((gName) => {
      players.push({
        nome: gName,
        email: null,
        type: "ospite"
      });
    });

    setSessionPlayers(players);
    
    // Inizializza i punteggi a 0
    const initialScores = {};
    players.forEach(p => {
      const key = p.type === "socio" ? p.email : p.nome;
      initialScores[key] = 0;
    });
    setScorekeeperScores(initialScores);
    
    // Reset tools states
    setDrawnPlayer("");
    setDrawHistory([]);
    setDicePool({ d4: 0, d6: 0, d8: 0, d10: 0, d12: 0, d20: 0, d100: 0 });
    setDiceResultSum(0);
    setDiceResultBreakdown("");
    setDiceHistory([]);
    setTimerSecondsLeft(60);
    setTimerActive(false);
    setRngResults([]);
    setActiveGameTool("sorteggio");
    setError("");
    setSuccessBanner("");
    setShowGamesModal(false);
    
    setView("game_mode");
  }

  // ── Actions: Game Playing (Phase 2) ─────────────────
  
  // Tool 1: Sorteggio Giocatore Casuale
  function drawRandomPlayer() {
    if (sessionPlayers.length === 0) return;
    setIsDrawing(true);
    setDrawnPlayer("");

    let count = 0;
    const interval = setInterval(() => {
      const idx = Math.floor(Math.random() * sessionPlayers.length);
      setDrawnPlayer(sessionPlayers[idx].nome);
      count++;

      if (count > 15) {
        clearInterval(interval);
        const finalIdx = Math.floor(Math.random() * sessionPlayers.length);
        const selected = sessionPlayers[finalIdx];
        setDrawnPlayer(selected.nome);
        setIsDrawing(false);

        if (navigator.vibrate) {
          navigator.vibrate(150);
        }
        setDrawHistory((prev) => [selected.nome, ...prev.slice(0, 4)]);
      }
    }, 85);
  }

  // Tool 2: Dice Roller
  function adjustDiceCount(type, val) {
    const newCount = Math.max(0, (dicePool[type] || 0) + val);
    setDicePool({ ...dicePool, [type]: newCount });
    if (navigator.vibrate) {
      navigator.vibrate(25);
    }
  }

  function rollDice() {
    let rolls = [];
    let sum = 0;

    Object.entries(dicePool).forEach(([type, count]) => {
      const sides = parseInt(type.substring(1), 10);
      for (let i = 0; i < count; i++) {
        const roll = Math.floor(Math.random() * sides) + 1;
        rolls.push({ type, val: roll });
        sum += roll;
      }
    });

    if (rolls.length === 0) return;

    setDiceResultSum(sum);
    const breakdownStr = rolls.map((r) => `${r.type.toUpperCase()}(${r.val})`).join(" + ");
    setDiceResultBreakdown(breakdownStr);

    const poolStr = Object.entries(dicePool)
      .filter(([_, q]) => q > 0)
      .map(([t, q]) => `${q}${t.toUpperCase()}`)
      .join(" + ");

    const historyStr = `${poolStr} = ${sum} [${rolls.map((r) => r.val).join(", ")}]`;
    setDiceHistory((prev) => [historyStr, ...prev.slice(0, 9)]);

    if (navigator.vibrate) {
      navigator.vibrate(100);
    }
  }

  function clearDicePool() {
    setDicePool({ d4: 0, d6: 0, d8: 0, d10: 0, d12: 0, d20: 0, d100: 0 });
    setDiceResultSum(0);
    setDiceResultBreakdown("");
    if (navigator.vibrate) {
      navigator.vibrate(50);
    }
  }

  // Tool 3: Timer presets
  function applyTimerPreset(secs) {
    setTimerDuration(secs);
    setTimerSecondsLeft(secs);
    setTimerActive(false);
    setTimerPaused(false);
  }

  // Tool 4: RNG Generator
  function generateRNG() {
    const min = parseInt(rngMin, 10);
    const max = parseInt(rngMax, 10);
    const qty = Math.min(Math.max(parseInt(rngQuantity, 10) || 1, 1), 50);

    if (isNaN(min) || isNaN(max) || min >= max) {
      setError("Range non valido (Min deve essere minore di Max).");
      return;
    }

    setError("");
    let results = [];
    if (rngNoRepeat) {
      const rangeSize = max - min + 1;
      const count = Math.min(qty, rangeSize);
      let pool = Array.from({ length: rangeSize }, (_, i) => min + i);
      for (let i = 0; i < count; i++) {
        const idx = Math.floor(Math.random() * pool.length);
        results.push(pool[idx]);
        pool.splice(idx, 1);
      }
    } else {
      for (let i = 0; i < qty; i++) {
        results.push(Math.floor(Math.random() * (max - min + 1)) + min);
      }
    }

    setRngResults(results);
    if (navigator.vibrate) {
      navigator.vibrate(75);
    }
  }

  // Tool 5: Scorekeeper Points Modify
  function modifyPlayerScore(playerKey, delta) {
    setScorekeeperScores((prev) => ({
      ...prev,
      [playerKey]: (prev[playerKey] || 0) + delta
    }));
    if (navigator.vibrate) {
      navigator.vibrate(40);
    }
  }

  // ── Actions: Game Closure (Phase 3) ─────────────────
  function handleOpenEndGame() {
    setSelectedWinners([]);
    // Ferma timer se attivo
    setTimerActive(false);
    setShowEndGameModal(true);
  }

  function toggleWinnerSelect(playerKey) {
    if (selectedWinners.includes(playerKey)) {
      setSelectedWinners(selectedWinners.filter(k => k !== playerKey));
    } else {
      setSelectedWinners([...selectedWinners, playerKey]);
    }
  }

  async function handleConfirmEndGame() {
    setLoading(true);
    setError("");
    setSuccessBanner("");

    let socioWinnersCount = 0;
    let errorsList = [];
    const winPoints = selectedGame.puntiVittoria || 0;

    // Esegui la chiamata per ogni vincitore socio
    for (const key of selectedWinners) {
      const playerObj = sessionPlayers.find(p => (p.type === "socio" ? p.email : p.nome) === key);
      
      if (playerObj && playerObj.type === "socio") {
        try {
          const res = await fetch("/api/admin/update", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ 
              email: playerObj.email, 
              points: winPoints, 
              reason: selectedGame ? selectedGame.nome : "Gioco" 
            })
          });

          if (res.ok) {
            socioWinnersCount++;
          } else {
            const data = await res.json();
            errorsList.push(`${playerObj.nome}: ${data.error || "errore api"}`);
          }
        } catch (err) {
          errorsList.push(`${playerObj.nome}: errore di rete`);
        }
      }
    }

    // Refresh general leaderboard and member points
    try {
      const lbRes = await fetch("/api/leaderboard");
      if (lbRes.ok) {
        const lbData = await lbRes.json();
        setLeaderboard(lbData.leaderboard || []);
      }

      if (member) {
        const myProfileRes = await fetch(`/api/member?email=${encodeURIComponent(member.email)}`);
        if (myProfileRes.ok) {
          const myProfileData = await myProfileRes.json();
          setMember(myProfileData);
        }
      }
    } catch (err) {
      console.error("Leaderboard refresh error:", err);
    }

    setLoading(false);
    setShowEndGameModal(false);

    if (errorsList.length > 0) {
      setError(`Vittorie assegnate ma con errori: ${errorsList.join(", ")}`);
    }

    // Costruisci il banner di successo
    const socioWinners = sessionPlayers.filter(p => p.type === "socio" && selectedWinners.includes(p.email));
    if (selectedWinners.length === 0) {
      setSuccessBanner("Partita terminata senza alcun vincitore. La classifica resta invariata.");
    } else if (socioWinners.length > 0) {
      setSuccessBanner(`Partita terminata! Assegnati +${winPoints} punti ai soci vincitori: ${socioWinners.map(w => w.nome).join(", ")}`);
    } else {
      setSuccessBanner("Partita terminata. Nessun socio registrato era tra i vincitori, la classifica resta invariata.");
    }

    setView("dashboard");
    setActiveTab("classifica");
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
            <img src="/icon-512.png" alt="DragonFist Club" className="logo-img" />
            <h1 className="logo-title">DragonFist Club</h1>
            <p className="logo-subtitle">Area Membri</p>
          </div>

          <div className="login-card fade-in-up fade-in-up-delay-1">
            <h2>Accedi</h2>
            <p>Inserisci la tua email per accedere all'app</p>

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

              <button id="login-btn" type="submit" className="btn-primary" disabled={loading}>
                {loading ? <div className="spinner" style={{ margin: "0 auto" }} /> : "Accedi 🐉"}
              </button>

              {error && <p className="error-text">{error}</p>}
            </form>
          </div>
        </div>
      </>
    );
  }

  // ═══════════════════════════════════════════════════
  //  GAME SETUP VIEW (Phase 1)
  // ═══════════════════════════════════════════════════
  if (view === "game_setup") {
    // Filtro per autocomplete giochi
    const filteredGames = gameSearch.trim() === "" 
      ? games 
      : games.filter(g => g.nome.toLowerCase().includes(gameSearch.toLowerCase()));

    return (
      <>
        <div className="bg-pattern" />
        <div className="app-container">
          <div className="setup-card fade-in-up">
            <h2 className="setup-title">Inizia Partita 🐉</h2>
            <p className="setup-subtitle">Configura il tavolo di gioco</p>

            {/* Selezione Gioco */}
            <div className="setup-group">
              <label className="setup-label">1. Seleziona Gioco</label>
              <div className="autocomplete-input-wrapper">
                <input
                  type="text"
                  placeholder="Cerca gioco..."
                  className="admin-search"
                  style={{ marginBottom: "0" }}
                  value={selectedGame ? selectedGame.nome : gameSearch}
                  onChange={(e) => {
                    setGameSearch(e.target.value);
                    setSelectedGame(null);
                    setIsGameDropdownOpen(true);
                  }}
                  onFocus={() => setIsGameDropdownOpen(true)}
                />
                
                {selectedGame && (
                  <span 
                    style={{ position: "absolute", right: "1rem", top: "50%", transform: "translateY(-50%)", color: "var(--gold)", fontWeight: "bold", fontSize: "0.85rem" }}
                  >
                    🏆 +{selectedGame.puntiVittoria} pts
                  </span>
                )}

                {isGameDropdownOpen && filteredGames.length > 0 && (
                  <div className="autocomplete-dropdown">
                    {filteredGames.map((g) => (
                      <div
                        key={g.id}
                        className="autocomplete-item"
                        onClick={() => {
                          setSelectedGame(g);
                          setIsGameDropdownOpen(false);
                        }}
                      >
                        <span>{g.nome}</span>
                        <span style={{ color: "var(--gold)" }}>+{g.puntiVittoria} pts</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* Selezione Associati */}
            <div className="setup-group">
              <label className="setup-label">2. Seleziona Associati Presenti</label>
              <input
                type="text"
                placeholder="Filtra soci per nome o email..."
                className="admin-search"
                style={{ marginBottom: "0.75rem" }}
                value={setupSocioSearch}
                onChange={(e) => setSetupSocioSearch(e.target.value)}
              />
              <div className="players-selection">
                {leaderboard
                  .filter((socio) =>
                    `${socio.nome} ${socio.cognome}`.toLowerCase().includes(setupSocioSearch.toLowerCase()) ||
                    socio.email.toLowerCase().includes(setupSocioSearch.toLowerCase())
                  )
                  .map((socio) => {
                    const isChecked = selectedSoci.includes(socio.email);
                    return (
                      <label key={socio.email} className="player-checkbox-row">
                        <input
                          type="checkbox"
                          checked={isChecked}
                          onChange={() => toggleSocioSelect(socio.email)}
                        />
                        <span>{socio.nome} {socio.cognome}</span>
                      </label>
                    );
                  })}
              </div>
            </div>

            {/* Inserimento Ospiti */}
            <div className="setup-group">
              <label className="setup-label">3. Aggiungi Ospiti Occasionali</label>
              <div className="guest-input-row">
                <input
                  type="text"
                  placeholder="Nome Ospite (es. Ospite 1)"
                  value={guestName}
                  onChange={(e) => setGuestName(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && handleAddGuest()}
                />
                <button type="button" className="btn-add-guest" onClick={handleAddGuest}>
                  Aggiungi
                </button>
              </div>

              {guestsList.length > 0 && (
                <div className="guest-chips-container">
                  {guestsList.map((g) => (
                    <div key={g} className="guest-chip">
                      <span>👤 {g}</span>
                      <button type="button" className="guest-chip-remove" onClick={() => handleRemoveGuest(g)}>
                        ✕
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Error feedback */}
            {error && <p className="error-text" style={{ marginTop: "1rem", marginBottom: "1rem" }}>{error}</p>}

            {/* Conferma Setup */}
            <div className="modal-actions" style={{ marginTop: "2rem" }}>
              <button className="btn-modal-primary" onClick={handleLaunchGame}>
                Avvia Partita ⚔️
              </button>
              <button 
                className="btn-modal-secondary" 
                onClick={() => {
                  setError("");
                  setView("dashboard");
                }}
              >
                Annulla
              </button>
            </div>

          </div>
        </div>
      </>
    );
  }

  // ═══════════════════════════════════════════════════
  //  GAME MODE VIEW (Phase 2)
  // ═══════════════════════════════════════════════════
  if (view === "game_mode") {
    // Calcola percentuale per anello timer
    const circumference = 2 * Math.PI * 65; // raggio 65
    const strokeDashoffset = circumference - (timerSecondsLeft / timerDuration) * circumference;
    const isTimerLow = timerSecondsLeft <= 10;

    return (
      <>
        <div className="bg-pattern" />
        <div className="app-container" style={{ paddingBottom: "5rem" }}>
          
          <div className="game-container fade-in-up">
            {/* Header di gioco */}
            <div className="game-card-header">
              <div className="game-title-info">
                <h2>{selectedGame?.nome}</h2>
                <p>🏆 Vittoria: +{selectedGame?.puntiVittoria} punti classifica</p>
              </div>
              <button className="btn-end-session" onClick={handleOpenEndGame}>
                Termina Partita 🛑
              </button>
            </div>

            {/* Toolbar di navigazione strumenti */}
            <div className="tools-nav-bar">
              <button
                className={`tool-nav-btn ${activeGameTool === "sorteggio" ? "active" : ""}`}
                onClick={() => setActiveGameTool("sorteggio")}
              >
                <span>👑</span>
                <span>Sorteggio</span>
              </button>
              <button
                className={`tool-nav-btn ${activeGameTool === "dadi" ? "active" : ""}`}
                onClick={() => setActiveGameTool("dadi")}
              >
                <span>🎲</span>
                <span>Dadi</span>
              </button>
              <button
                className={`tool-nav-btn ${activeGameTool === "timer" ? "active" : ""}`}
                onClick={() => setActiveGameTool("timer")}
              >
                <span>⏱️</span>
                <span>Timer</span>
              </button>
              <button
                className={`tool-nav-btn ${activeGameTool === "rng" ? "active" : ""}`}
                onClick={() => setActiveGameTool("rng")}
              >
                <span>🔢</span>
                <span>RNG</span>
              </button>
              <button
                className={`tool-nav-btn ${activeGameTool === "segnapunti" ? "active" : ""}`}
                onClick={() => setActiveGameTool("segnapunti")}
              >
                <span>📝</span>
                <span>Tabellone</span>
              </button>
            </div>

            {/* Workspace Strumento Attivo */}
            <div className="tool-workspace">
              
              {/* STRUMENTO 1: SORTEGGIO GIOCATORE */}
              {activeGameTool === "sorteggio" && (
                <div>
                  <h3 className="tool-title">👑 Sorteggio Giocatore</h3>
                  <div className="sorteggio-box">
                    <div className={`drawn-display-card ${drawnPlayer && !isDrawing ? "drawn-glow" : ""}`}>
                      {isDrawing ? (
                        <span style={{ color: "var(--text-secondary)", fontSize: "1.25rem" }}>Estrazione...</span>
                      ) : (
                        drawnPlayer || <span style={{ color: "var(--text-muted)", fontSize: "1.25rem" }}>Nessun sorteggio</span>
                      )}
                    </div>
                    <button className="btn-primary" onClick={drawRandomPlayer} disabled={isDrawing}>
                      Estrai Casuale ⚡
                    </button>
                    
                    {drawHistory.length > 0 && (
                      <div style={{ marginTop: "1.5rem", width: "100%" }}>
                        <p style={{ fontSize: "0.75rem", color: "var(--text-secondary)", marginBottom: "0.25rem", textAlign: "left" }}>
                          Cronologia Estrazioni:
                        </p>
                        <div style={{ display: "flex", gap: "0.5rem", flexWrap: "wrap" }}>
                          {drawHistory.map((name, i) => (
                            <span key={i} style={{ fontSize: "0.75rem", background: "rgba(255,255,255,0.05)", padding: "2px 8px", borderRadius: "8px" }}>
                              {name}
                            </span>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* STRUMENTO 2: LANCIO DADI */}
              {activeGameTool === "dadi" && (
                <div className="dice-roller-layout">
                  <h3 className="tool-title">🎲 Lancia Dadi</h3>
                  
                  {/* Griglia Dadi D4-D100 */}
                  <div className="dice-rack-grid">
                    {["d4", "d6", "d8", "d10", "d12", "d20", "d100"].map((dType) => (
                      <button key={dType} className="btn-die" onClick={() => adjustDiceCount(dType, 1)}>
                        <span>{dType.toUpperCase()}</span>
                        {dicePool[dType] > 0 && (
                          <span className="die-count-badge">{dicePool[dType]}</span>
                        )}
                      </button>
                    ))}
                  </div>

                  {/* Anteprima dadi selezionati */}
                  <div className="dice-pool-preview">
                    {Object.values(dicePool).some((q) => q > 0) ? (
                      <div style={{ display: "flex", flexWrap: "wrap", gap: "0.4rem" }}>
                        {Object.entries(dicePool).map(([type, count]) => {
                          if (count === 0) return null;
                          return (
                            <span key={type} className="pool-die-chip" onClick={() => adjustDiceCount(type, -1)}>
                              {count}{type.toUpperCase()} ✕
                            </span>
                          );
                        })}
                      </div>
                    ) : (
                      <span className="dice-pool-placeholder">Tocca i pulsanti sopra per aggiungere dadi</span>
                    )}
                  </div>

                  {/* Pulsanti Lancia / Pulisci */}
                  <div className="dice-roll-actions">
                    <button className="btn-roll-dice" onClick={rollDice} disabled={!Object.values(dicePool).some(q => q > 0)}>
                      Lancia 🎲
                    </button>
                    <button className="btn-clear-pool" onClick={clearDicePool}>
                      Pulisci
                    </button>
                  </div>

                  {/* Risultato corrente */}
                  {diceResultSum > 0 && (
                    <div className="dice-results-card">
                      <div className="dice-sum-display">{diceResultSum}</div>
                      <div className="dice-breakdown">{diceResultBreakdown}</div>
                    </div>
                  )}

                  {/* Cronologia ultimi lanci */}
                  {diceHistory.length > 0 && (
                    <div>
                      <p style={{ fontSize: "0.75rem", color: "var(--text-secondary)", marginBottom: "0.4rem" }}>Ultimi Lanci:</p>
                      <div className="roll-history-list">
                        {diceHistory.map((hist, i) => (
                          <div key={i} style={{ borderBottom: "1px solid rgba(255,255,255,0.03)", paddingBottom: "2px" }}>
                            {hist}
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* STRUMENTO 3: TIMER DI GIOCO */}
              {activeGameTool === "timer" && (
                <div className="timer-container">
                  <h3 className="tool-title">⏱️ Timer di Gioco</h3>
                  
                  {/* Anello grafico e contatore */}
                  <div className="timer-ring-wrapper">
                    <svg className="timer-svg">
                      <circle cx="75" cy="75" r="65" className="timer-circle-bg" />
                      <circle
                        cx="75"
                        cy="75"
                        r="65"
                        className="timer-circle-fg"
                        stroke={isTimerLow ? "var(--red)" : "var(--gold)"}
                        strokeDasharray={circumference}
                        strokeDashoffset={strokeDashoffset}
                      />
                    </svg>
                    <div className="timer-text-overlay">
                      <span className="timer-seconds-left" style={{ color: isTimerLow ? "var(--red)" : "var(--text-primary)" }}>
                        {timerSecondsLeft}
                      </span>
                      <span style={{ fontSize: "0.65rem", color: "var(--text-secondary)", marginTop: "2px" }}>secondi</span>
                    </div>
                  </div>

                  {/* Preset rapidi */}
                  <div className="timer-presets">
                    {[30, 60, 90, 120].map((secs) => (
                      <button key={secs} className="btn-timer-preset" onClick={() => applyTimerPreset(secs)}>
                        {secs}s
                      </button>
                    ))}
                  </div>

                  {/* Timer personalizzato */}
                  <div className="timer-custom-container" style={{ display: "flex", gap: "0.5rem", justifyContent: "center", alignItems: "center", margin: "1rem 0" }}>
                    <span style={{ fontSize: "0.85rem", color: "var(--text-secondary)" }}>Personalizzato:</span>
                    <input
                      type="number"
                      placeholder="Secondi"
                      min="1"
                      className="rng-input"
                      style={{ width: "85px", textAlign: "center", padding: "0.3rem" }}
                      value={customTimerInput}
                      onChange={(e) => setCustomTimerInput(e.target.value)}
                    />
                    <button
                      className="btn-timer-preset"
                      style={{ padding: "0.3rem 0.65rem", minWidth: "auto", background: "rgba(255, 204, 51, 0.15)", border: "1px solid var(--border-gold)" }}
                      onClick={() => {
                        const val = parseInt(customTimerInput, 10);
                        if (!isNaN(val) && val > 0) {
                          applyTimerPreset(val);
                        }
                      }}
                    >
                      Imposta
                    </button>
                  </div>

                  {/* Controlli Start/Pausa/Reset */}
                  <div className="timer-controls">
                    {!timerActive ? (
                      <button className="btn-timer-action start" onClick={() => { setTimerActive(true); setTimerPaused(false); }}>
                        Avvia
                      </button>
                    ) : (
                      <button className="btn-timer-action pause" onClick={() => setTimerPaused(!timerPaused)}>
                        {timerPaused ? "Riprendi" : "Pausa"}
                      </button>
                    )}
                    <button className="btn-timer-action reset" onClick={() => applyTimerPreset(timerDuration)}>
                      Reset
                    </button>
                  </div>
                </div>
              )}

              {/* STRUMENTO 4: GENERATORE NUMERI CASUALI (RNG) */}
              {activeGameTool === "rng" && (
                <div className="rng-layout">
                  <h3 className="tool-title">🔢 Generatore RNG</h3>
                  
                  {/* Input Min e Max */}
                  <div className="rng-row">
                    <div className="rng-field">
                      <span className="setup-label">Min</span>
                      <input
                        type="number"
                        className="rng-input"
                        value={rngMin}
                        onChange={(e) => setRngMin(parseInt(e.target.value, 10))}
                      />
                    </div>
                    <div className="rng-field">
                      <span className="setup-label">Max</span>
                      <input
                        type="number"
                        className="rng-input"
                        value={rngMax}
                        onChange={(e) => setRngMax(parseInt(e.target.value, 10))}
                      />
                    </div>
                  </div>

                  {/* Quantità numeri */}
                  <div className="rng-row" style={{ alignItems: "center" }}>
                    <div className="rng-field" style={{ flex: 2 }}>
                      <span className="setup-label">Quantità Estratta</span>
                      <input
                        type="number"
                        className="rng-input"
                        value={rngQuantity}
                        onChange={(e) => setRngQuantity(parseInt(e.target.value, 10))}
                      />
                    </div>
                    
                    {/* Toggle Senza Ripetizione */}
                    <div className="rng-field" style={{ flex: 3 }}>
                      <span className="setup-label">&nbsp;</span>
                      <label className="rng-toggle-row">
                        <span>Senza Ripetizione</span>
                        <input
                          type="checkbox"
                          checked={rngNoRepeat}
                          onChange={(e) => setRngNoRepeat(e.target.checked)}
                        />
                      </label>
                    </div>
                  </div>

                  <button className="btn-primary" onClick={generateRNG} style={{ marginTop: "0.5rem" }}>
                    Genera Numeri 🔢
                  </button>

                  {/* Risultato estrazione RNG */}
                  {rngResults.length > 0 && (
                    <div className="rng-results-box">
                      {rngResults.map((num, i) => (
                        <div key={i} className="rng-num-badge">
                          {num}
                        </div>
                      ))}
                    </div>
                  )}

                  {error && <p className="error-text">{error}</p>}
                </div>
              )}

              {/* STRUMENTO 5: SEGNAPUNTI DINAMICO */}
              {activeGameTool === "segnapunti" && (
                <div>
                  <h3 className="tool-title">📝 Punteggi Turno</h3>
                  <table className="scorekeeper-table">
                    <thead>
                      <tr style={{ borderBottom: "2px solid var(--border-subtle)" }}>
                        <th style={{ textAlign: "left", paddingBottom: "0.5rem" }}>Giocatore</th>
                        <th style={{ paddingBottom: "0.5rem" }}>Punti</th>
                        <th style={{ textAlign: "right", paddingBottom: "0.5rem" }}>Modifica</th>
                      </tr>
                    </thead>
                    <tbody>
                      {sessionPlayers.map((player) => {
                        const key = player.type === "socio" ? player.email : player.nome;
                        const score = scorekeeperScores[key] || 0;
                        return (
                          <tr key={key} className="scorekeeper-row">
                            <td className="scorekeeper-cell">
                              <div className="scorekeeper-player-name">{player.nome}</div>
                              <span className={`scorekeeper-player-badge ${player.type === "socio" ? "is-socio" : ""}`}>
                                {player.type === "socio" ? "Socio" : "Ospite"}
                              </span>
                            </td>
                            <td className="scorekeeper-cell scorekeeper-val">{score}</td>
                            <td className="scorekeeper-cell">
                              <div className="scorekeeper-controls">
                                <button className="btn-score-adjust" onClick={() => modifyPlayerScore(key, -5)}>-5</button>
                                <button className="btn-score-adjust" onClick={() => modifyPlayerScore(key, -1)}>-1</button>
                                <button className="btn-score-adjust" onClick={() => modifyPlayerScore(key, 1)}>+1</button>
                                <button className="btn-score-adjust" onClick={() => modifyPlayerScore(key, 5)}>+5</button>
                              </div>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}

            </div>
          </div>

          {/* MODAL FINE PARTITA: SELEZIONE VINCITORI (Phase 3) */}
          {showEndGameModal && (
            <div className="modal-overlay">
              <div className="modal-card">
                <h3 className="modal-title">🏆 Fine Partita</h3>
                <p className="modal-desc">Seleziona chi ha vinto. I soci otterranno +{selectedGame?.puntiVittoria} punti classifica.</p>
                
                <div className="winners-list">
                  {sessionPlayers.map((player) => {
                    const key = player.type === "socio" ? player.email : player.nome;
                    const isSelected = selectedWinners.includes(key);
                    return (
                      <label 
                        key={key} 
                        className={`winner-checkbox-row ${isSelected ? "selected" : ""}`}
                      >
                        <input
                          type="checkbox"
                          checked={isSelected}
                          onChange={() => toggleWinnerSelect(key)}
                        />
                        <div style={{ display: "flex", flexDirection: "column" }}>
                          <span style={{ fontWeight: "bold" }}>{player.nome}</span>
                          <span style={{ fontSize: "0.75rem", color: "var(--text-secondary)" }}>
                            {player.type === "socio" ? `Socio (${player.email})` : "Ospite"}
                          </span>
                        </div>
                      </label>
                    );
                  })}
                </div>

                {error && <p className="error-text" style={{ marginBottom: "1rem" }}>{error}</p>}

                <div className="modal-actions" style={{ display: "flex", flexDirection: "column", gap: "0.5rem" }}>
                  <button className="btn-modal-primary" onClick={handleConfirmEndGame} disabled={loading}>
                    {loading ? (
                      <div className="spinner" style={{ margin: "0 auto" }} />
                    ) : selectedWinners.length > 0 ? (
                      "Assegna Vittoria 👑"
                    ) : (
                      "Termina senza Vincitori ❌"
                    )}
                  </button>
                  <button className="btn-modal-secondary" onClick={() => setShowEndGameModal(false)} disabled={loading}>
                    Annulla
                  </button>
                </div>
              </div>
            </div>
          )}

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

  // Filtra la classifica per la ricerca admin
  const filteredLeaderboardForAdmin = leaderboard.filter(m => 
    `${m.nome} ${m.cognome}`.toLowerCase().includes(adminSearchQuery.toLowerCase()) ||
    m.email.toLowerCase().includes(adminSearchQuery.toLowerCase())
  );

  return (
    <>
      <div className="bg-pattern" />
      <div className="app-container" style={{ paddingBottom: "3rem" }}>
        
        {/* Header */}
        <div className="logo-section fade-in-up">
          <img
            src="/icon-512.png"
            alt="DragonFist Club"
            className="logo-img"
            style={{ width: "64px", height: "64px", borderRadius: "50%", objectFit: "contain" }}
          />
          <h1 className="logo-title" style={{ fontSize: "1.3rem" }}>
            DragonFist Club
          </h1>
        </div>

        {/* Banner di Successo */}
        {successBanner && (
          <div className="success-banner fade-in-up" style={{ width: "100%", maxWidth: "480px", marginBottom: "1.5rem" }}>
            {successBanner}
          </div>
        )}

        {/* Pulsanti Inizia Partita e Catalogo Giochi */}
        <div className="fade-in-up fade-in-up-delay-1" style={{ width: "100%", maxWidth: "480px", marginBottom: "1.5rem", display: "flex", gap: "0.75rem" }}>
          <button 
            className="btn-primary" 
            style={{ flex: 3, background: "linear-gradient(135deg, var(--gold), var(--gold-dark))", color: "var(--bg-primary)", fontSize: "1.05rem", padding: "1rem" }}
            onClick={handleStartSetup}
          >
            Inizia Partita 🐉⚔️
          </button>
          <button 
            style={{ 
              flex: 1.1, 
              display: "flex", 
              flexDirection: "column", 
              justifyContent: "center", 
              alignItems: "center", 
              fontSize: "0.82rem", 
              padding: "0.6rem 0.5rem", 
              border: "1px solid var(--border-gold)", 
              borderRadius: "14px", 
              background: "rgba(255, 204, 51, 0.05)", 
              color: "var(--gold)",
              outline: "none",
              cursor: "pointer"
            }}
            onClick={() => setShowGamesModal(true)}
          >
            <span style={{ fontSize: "1.3rem", lineHeight: "1" }}>🎲</span>
            <span style={{ fontWeight: "700", marginTop: "4px" }}>Giochi</span>
          </button>
        </div>

        {/* Tabs di Navigazione Dashboard */}
        <div className="tabs fade-in-up fade-in-up-delay-1">
          <button
            className={`tab ${activeTab === "profilo" ? "active" : ""}`}
            onClick={() => { setActiveTab("profilo"); setError(""); }}
          >
            👤 Profilo
          </button>
          <button
            className={`tab ${activeTab === "classifica" ? "active" : ""}`}
            onClick={() => { setActiveTab("classifica"); setError(""); }}
          >
            🏆 Classifica
          </button>
          {member?.amministratore && (
            <button
              className={`tab ${activeTab === "admin" ? "active" : ""}`}
              onClick={() => { setActiveTab("admin"); setError(""); }}
            >
              🛠️ Admin
            </button>
          )}
        </div>

        {/* Tab contents (Con scorrimento laterale o transizioni) */}
        <div className="tabs-container fade-in-up fade-in-up-delay-2">
          
          {/* TAB 1: PROFILO */}
          {activeTab === "profilo" && member && (
            <div className="profile-section" style={{ margin: "0 auto" }}>
              <div ref={cardRef} className="profile-card" onMouseMove={handleMouseMove}>
                <div className="card-hologram" />
                <div className="profile-avatar">
                  {member.foto ? (
                    <img src={member.foto} alt={member.nome} />
                  ) : (
                    <div className="avatar-placeholder">
                      {getInitials(member.nome, member.cognome)}
                    </div>
                  )}
                </div>

                <h2 className="profile-name">
                  {member.nome} {member.cognome}
                </h2>
                <p className="profile-email">
                  {member.email} {member.amministratore && <span style={{ color: "var(--gold)", fontSize: "0.85rem", fontWeight: "800" }}>(ADMIN)</span>}
                </p>

                <div className="points-display">
                  <p className="points-label">Punti Totali</p>
                  <div className="points-value">
                    <CountUp end={member.punti} />
                    <span className="points-suffix"> pts</span>
                  </div>
                </div>

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

          {/* TAB 2: CLASSIFICA */}
          {activeTab === "classifica" && (
            <div className="leaderboard-section" style={{ margin: "0 auto" }}>
              <div className="leaderboard-card">
                <h3 className="leaderboard-title">🏆 Classifica DragonFist</h3>

                {leaderboard.length === 0 ? (
                  <p style={{ color: "var(--text-secondary)", fontSize: "0.9rem" }}>Caricamento...</p>
                ) : (
                  <ul className="leaderboard-list">
                    {leaderboard.map((entry, index) => {
                      const rank = getRankDisplay(index);
                      const isCurrentUser = entry.email === member?.email;

                      return (
                        <li
                          key={entry.email}
                          className={`leaderboard-item ${isCurrentUser ? "current-user" : ""}`}
                        >
                          <span className={`rank ${rank.className}`}>{rank.symbol}</span>

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
                            {entry.amministratore && <span style={{ color: "var(--gold)", fontSize: "0.75rem" }}> (Admin)</span>}
                          </span>

                          <span className="leaderboard-points">{entry.punti}</span>
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

          {/* TAB 3: ADMIN (Disponibile solo agli amministratori) */}
          {activeTab === "admin" && member?.amministratore && (
            <div className="admin-section">
              <div className="admin-card">
                <div className="admin-header">
                  <h3 className="leaderboard-title" style={{ marginBottom: "0.5rem" }}>🛠️ Gestione Punti Soci</h3>
                  <p style={{ fontSize: "0.85rem", color: "var(--text-secondary)", marginBottom: "1rem" }}>
                    Modifica manualmente il punteggio dei membri. Le modifiche verranno salvate sul Google Sheet.
                  </p>
                  <input
                    type="text"
                    placeholder="Filtra soci per nome o email..."
                    className="admin-search"
                    value={adminSearchQuery}
                    onChange={(e) => setAdminSearchQuery(e.target.value)}
                  />
                </div>

                {error && <p className="error-text" style={{ marginBottom: "1rem" }}>{error}</p>}

                <div className="admin-list">
                  {filteredLeaderboardForAdmin.map((socio) => {
                    const currentDelta = adminDeltas[socio.email] ?? "";
                    return (
                      <div key={socio.email} className="admin-item">
                        <div className="admin-info">
                          <span className="admin-name">{socio.nome} {socio.cognome}</span>
                          <span className="admin-points">{socio.punti} pts • {socio.email}</span>
                        </div>
                        
                        <div className="admin-actions">
                          <button className="btn-adjust" onClick={() => {
                            const val = parseInt(currentDelta, 10) || 0;
                            setAdminDeltas({ ...adminDeltas, [socio.email]: val - 5 });
                          }}>-5</button>
                          <button className="btn-adjust" onClick={() => {
                            const val = parseInt(currentDelta, 10) || 0;
                            setAdminDeltas({ ...adminDeltas, [socio.email]: val - 1 });
                          }}>-1</button>
                          
                          <input
                            type="number"
                            placeholder="±0"
                            className="admin-input"
                            value={currentDelta}
                            onChange={(e) => setAdminDeltas({ ...adminDeltas, [socio.email]: e.target.value })}
                          />
                          
                          <button className="btn-adjust" onClick={() => {
                            const val = parseInt(currentDelta, 10) || 0;
                            setAdminDeltas({ ...adminDeltas, [socio.email]: val + 1 });
                          }}>+1</button>
                          <button className="btn-adjust" onClick={() => {
                            const val = parseInt(currentDelta, 10) || 0;
                            setAdminDeltas({ ...adminDeltas, [socio.email]: val + 5 });
                          }}>+5</button>
                          
                          <button 
                            className="btn-confirm-adjust" 
                            disabled={loading || currentDelta === "" || parseInt(currentDelta, 10) === 0}
                            onClick={() => handleAdminUpdate(socio.email, parseInt(currentDelta, 10))}
                          >
                            Salva
                          </button>
                        </div>
                      </div>
                    );
                  })}

                  {filteredLeaderboardForAdmin.length === 0 && (
                    <p style={{ color: "var(--text-secondary)", fontSize: "0.9rem", textAlign: "center", padding: "1rem" }}>
                      Nessun socio corrisponde alla ricerca.
                    </p>
                  )}
                </div>
              </div>

              <div style={{ textAlign: "center" }}>
                <button className="btn-logout" onClick={handleLogout}>
                  Esci
                </button>
              </div>
            </div>
          )}          {showGamesModal && (
            <div className="modal-overlay">
              <div className="modal-card" style={{ maxWidth: "420px" }}>
                <h3 className="modal-title" style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: "0.5rem" }}>
                  <span>🎲</span> Ludoteca Club
                </h3>
                <p className="modal-desc" style={{ marginBottom: "1rem" }}>Tutti i giochi registrati in catalogo:</p>
                
                <div className="games-list-simple" style={{ maxHeight: "350px", overflowY: "auto", display: "flex", flexDirection: "column", gap: "0.5rem", paddingRight: "0.25rem", textAlign: "left" }}>
                  {games.slice().sort((a, b) => a.nome.localeCompare(b.nome)).map((game) => (
                    <div 
                      key={game.id} 
                      style={{ 
                        padding: "0.85rem 1rem", 
                        background: "rgba(255, 255, 255, 0.03)", 
                        borderRadius: "14px", 
                        border: "1px solid var(--border-subtle)",
                        fontWeight: "600",
                        fontSize: "0.95rem",
                        color: "var(--text-primary)",
                        display: "flex",
                        alignItems: "center",
                        gap: "0.6rem"
                      }}
                    >
                      <span style={{ color: "var(--gold)" }}>•</span>
                      {game.nome}
                    </div>
                  ))}
                  {games.length === 0 && (
                    <p style={{ textAlign: "center", color: "var(--text-secondary)", padding: "1.5rem" }}>Caricamento giochi in corso...</p>
                  )}
                </div>

                <div className="modal-actions" style={{ marginTop: "1.5rem" }}>
                  <button className="btn-modal-secondary" style={{ width: "100%" }} onClick={() => setShowGamesModal(false)}>
                    Chiudi
                  </button>
                </div>
              </div>
            </div>
          )}

        </div>
      </div>
    </>
  );
}
