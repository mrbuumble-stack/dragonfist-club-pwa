import Papa from "papaparse";

const SHEET_ID =
    process.env.GOOGLE_SHEET_ID ||
    "1BVBIw8dl2Q5CiPewZV4x4ZP8MPVgrKkD2fHAkvbkff4";

console.log("Sheet Lib: Using Sheet ID:", SHEET_ID);

const SHEET_CSV_URL = `https://docs.google.com/spreadsheets/d/${SHEET_ID}/export?format=csv`;

// ── In-memory cache (5 min TTL) ─────────────────────
let cachedData = null;
let cacheTimestamp = 0;
const CACHE_TTL = 300_000; // 5 minuti in ms

// Dati mock di fallback in caso di errore di Google Sheets (es. 410 Gone, 404, offline)
const MOCK_MEMBERS = [
    { nome: "Lorenzo", cognome: "Minto", email: "mrbuumble@gmail.com", foto: "", punti: 150 },
    { nome: "Mario", cognome: "Rossi", email: "mario.rossi@gmail.com", foto: "", punti: 120 },
    { nome: "Giulia", cognome: "Bianchi", email: "giulia.bianchi@gmail.com", foto: "", punti: 95 },
    { nome: "Luca", cognome: "Verdi", email: "luca.verdi@gmail.com", foto: "", punti: 80 },
    { nome: "Sofia", cognome: "Gallo", email: "sofia.gallo@gmail.com", foto: "", punti: 70 },
    { nome: "Andrea", cognome: "Ferrari", email: "andrea.ferrari@gmail.com", foto: "", punti: 60 }
];

/**
 * Fetcha il CSV dal Google Sheet pubblico e restituisce
 * un array di oggetti membro. In caso di errore (es. 410 Gone),
 * ricorre a un set di dati mock locali.
 */
export async function fetchMembers() {
    const now = Date.now();

    if (cachedData && now - cacheTimestamp < CACHE_TTL) {
        return cachedData;
    }

    try {
        const res = await fetch(SHEET_CSV_URL, {
            headers: {
                "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36"
            },
            cache: 'no-store'
        });
        
        if (!res.ok) {
            throw new Error(`Google Sheet returned status ${res.status}`);
        }

        const csvText = await res.text();

        const result = Papa.parse(csvText, {
            header: true,
            skipEmptyLines: true,
        });

        const members = result.data.map(row => ({
            nome: row["Nome"] || "",
            cognome: row["Cognome"] || "",
            email: (row["Email"] || "").trim().toLowerCase(),
            foto: row["Foto"] || "",
            punti: parseInt(row["Punti"]) || 0
        })).filter(m => m.email !== ""); // Rimuove righe senza email

        cachedData = members;
        cacheTimestamp = now;

        return members;
    } catch (err) {
        console.warn("Sheet Lib: Errore durante il caricamento da Google Sheets. Utilizzo dati mock di fallback:", err.message);
        cachedData = MOCK_MEMBERS;
        cacheTimestamp = now;
        return MOCK_MEMBERS;
    }
}

/**
 * Aggrega i punti per email e restituisce un oggetto membro
 * con il totale dei punti + lo storico dei singoli record.
 */
export function aggregateMember(members, email) {
    const emailLower = email.trim().toLowerCase();
    const matches = members.filter((m) => m.email === emailLower);

    if (matches.length === 0) return null;

    const first = matches[0];
    const totalPunti = matches.reduce((sum, m) => sum + m.punti, 0);
    const storico = matches.map((m) => m.punti);

    return {
        nome: first.nome,
        cognome: first.cognome,
        email: first.email,
        foto: first.foto,
        punti: totalPunti,
        storico,
    };
}

/**
 * Aggrega tutti i membri per email e restituisce la classifica
 * ordinata per punti decrescenti.
 */
export function buildLeaderboard(members) {
    const aggregated = {};

    for (const m of members) {
        if (aggregated[m.email]) {
            aggregated[m.email].punti += m.punti;
        } else {
            aggregated[m.email] = { ...m };
        }
    }

    return Object.values(aggregated).sort((a, b) => b.punti - a.punti);
}
