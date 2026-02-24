import Papa from "papaparse";

const SHEET_ID =
    process.env.GOOGLE_SHEET_ID ||
    "1BVBIw8dl2Q5CiPewZV4x4ZP8MPVgrKkD2fHAkvbkff4";

const SHEET_CSV_URL = `https://docs.google.com/spreadsheets/d/${SHEET_ID}/export?format=csv`;

// ── In-memory cache (5 min TTL) ─────────────────────
let cachedData = null;
let cacheTimestamp = 0;
const CACHE_TTL = 300_000; // 5 minuti in ms

/**
 * Fetcha il CSV dal Google Sheet pubblico e restituisce
 * un array di oggetti membro.
 */
export async function fetchMembers() {
    const now = Date.now();

    if (cachedData && now - cacheTimestamp < CACHE_TTL) {
        return cachedData;
    }

    const res = await fetch(SHEET_CSV_URL);
    if (!res.ok) {
        throw new Error("Impossibile raggiungere il Google Sheet");
    }

    const csvText = await res.text();
    const parsed = Papa.parse(csvText, {
        header: true,
        skipEmptyLines: true,
    });

    const members = parsed.data.map((row) => ({
        nome: (row.Nome || "").trim(),
        cognome: (row.Cognome || "").trim(),
        email: (row.Email || "").trim().toLowerCase(),
        foto: (row.Foto || "").trim(),
        punti: parseInt(row.Punti, 10) || 0,
    }));

    cachedData = members;
    cacheTimestamp = now;

    return members;
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
