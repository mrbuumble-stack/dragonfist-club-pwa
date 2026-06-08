import Papa from "papaparse";
import fs from "fs";
import path from "path";

const SHEET_ID =
    process.env.GOOGLE_SHEET_ID ||
    "1EJ58lRklpuZIMPPWLINQyQnLdzjUlZL0mWin3U2FiIk";

const API_KEY = process.env.GOOGLE_API_KEY;

console.log("Sheet Lib: Using Sheet ID:", SHEET_ID);
if (API_KEY) {
    console.log("Sheet Lib: Google API Key is configured.");
} else {
    console.log("Sheet Lib: Google API Key NOT configured, using CSV / mock fallbacks.");
}

const SHEET_CSV_URL = `https://docs.google.com/spreadsheets/d/${SHEET_ID}/export?format=csv`;

// ── In-memory cache (5 min TTL) ─────────────────────
let cachedData = null;
let cacheTimestamp = 0;
const CACHE_TTL = 300_000; // 5 minuti in ms

// Registro locale delle transazioni per permettere aggiornamenti di test locali in memoria
let localTransactions = [];

// Dati mock di fallback in caso di errore di Google Sheets (es. 410 Gone, 404, offline)
const MOCK_MEMBERS = [
    { nome: "Lorenzo", cognome: "Minto", email: "mrbuumble@gmail.com", foto: "", punti: 150, amministratore: true },
    { nome: "Giosuè", cognome: "Scapinello", email: "giosue.scapinello@gmail.com", foto: "", punti: 1, amministratore: false },
    { nome: "Davide", cognome: "Tonetto", email: "davide.tonetto@gmail.com", foto: "", punti: 2, amministratore: false },
    { nome: "Nicola", cognome: "Bison", email: "nicola.bison@gmail.com", foto: "", punti: 5, amministratore: false },
    { nome: "Giacomo", cognome: "Natali", email: "giacomo.natali@gmail.com", foto: "", punti: 7, amministratore: false },
    { nome: "Mario", cognome: "Rossi", email: "mario.rossi@gmail.com", foto: "", punti: 0, amministratore: false },
    { nome: "Paolo", cognome: "Gigio", email: "paolo.gigio@gmail.com", foto: "", punti: 0, amministratore: false }
];

/**
 * Aggiunge una transazione locale in memoria per simulare la scrittura di punti
 */
export function addLocalTransaction(email, punti) {
    const emailLower = email.trim().toLowerCase();
    localTransactions.push({ email: emailLower, punti });
    console.log(`Sheet Lib: Aggiunta transazione locale per ${emailLower}: ${punti} punti. Totale transazioni:`, localTransactions.length);
    // Invalida la cache per forzare il ricalcolo al prossimo fetch
    cachedData = null;
}

/**
 * Fetcha i membri tramite Google Sheets API v4 (se configurata API Key)
 * oppure tramite CSV pubblico o fallbacks locali.
 */
export async function fetchMembers() {
    const now = Date.now();

    if (cachedData && now - cacheTimestamp < CACHE_TTL) {
        return applyLocalTransactions(cachedData);
    }

    // Prova ad usare la Google Sheets API v4 se la chiave è presente
    if (API_KEY && API_KEY.trim().length > 0) {
        try {
            console.log("Sheet Lib: Tentativo caricamento tramite Google Sheets API...");
            const range = "Membri!A:F";
            const url = `https://sheets.googleapis.com/v4/spreadsheets/${SHEET_ID}/values/${encodeURIComponent(range)}?key=${API_KEY}`;
            const res = await fetch(url, { cache: "no-store" });
            
            if (res.ok) {
                const data = await res.json();
                if (data.values && data.values.length > 0) {
                    const parsedMembers = parseGoogleSheetsValues(data.values);
                    console.log(`Sheet Lib: Caricati ${parsedMembers.length} membri via Google Sheets API.`);
                    cachedData = parsedMembers;
                    cacheTimestamp = now;
                    return applyLocalTransactions(parsedMembers);
                }
            } else {
                console.warn(`Sheet Lib: Errore Google Sheets API (${res.status}). Provo fallback CSV...`);
            }
        } catch (apiErr) {
            console.warn("Sheet Lib: Impossibile usare Google Sheets API:", apiErr.message);
        }
    }

    // Fallback: Tentativo tramite CSV
    try {
        console.log("Sheet Lib: Tentativo caricamento tramite CSV pubblico...");
        const res = await fetch(SHEET_CSV_URL, {
            headers: {
                "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36"
            },
            cache: 'no-store'
        });
        
        if (!res.ok) {
            throw new Error(`CSV export returned status ${res.status}`);
        }

        const csvText = await res.text();
        const result = Papa.parse(csvText, {
            header: true,
            skipEmptyLines: true,
        });

        const members = result.data.map(row => {
            const isEmailValid = (row["Email"] || "").trim().length > 0;
            let email = (row["Email"] || "").trim().toLowerCase();
            if (!isEmailValid && row["Nome"]) {
                email = `${row["Nome"].toLowerCase().replace(/\s+/g, "")}.${(row["Cognome"] || "club").toLowerCase().replace(/\s+/g, "")}@example.com`;
            }
            return {
                nome: row["Nome"] || "",
                cognome: row["Cognome"] || "",
                email: email,
                foto: row["Foto"] || "",
                punti: parseInt(row["Punti"]) || 0,
                amministratore: (row["Amministratore"] || "").trim().toUpperCase() === "SI"
            };
        }).filter(m => m.email !== "");

        console.log(`Sheet Lib: Caricati ${members.length} membri via CSV.`);
        cachedData = members;
        cacheTimestamp = now;

        return applyLocalTransactions(members);
    } catch (err) {
        console.warn("Sheet Lib: Errore nel caricamento CSV. Utilizzo dati mock locali:", err.message);
        cachedData = MOCK_MEMBERS;
        cacheTimestamp = now;
        return applyLocalTransactions(MOCK_MEMBERS);
    }
}

/**
 * Parsa i dati matriciali provenienti dall'API di Google Sheets v4
 */
function parseGoogleSheetsValues(values) {
    const headers = values[0].map(h => (h || "").trim());
    const rows = values.slice(1);
    
    return rows.map(row => {
        const getVal = (colName) => {
            const idx = headers.indexOf(colName);
            return idx !== -1 && idx < row.length ? (row[idx] || "").trim() : "";
        };
        
        const nome = getVal("Nome");
        const cognome = getVal("Cognome");
        let email = getVal("Email").toLowerCase();
        
        if (!email && nome) {
            email = `${nome.toLowerCase().replace(/\s+/g, "")}.${(cognome || "club").toLowerCase().replace(/\s+/g, "")}@example.com`;
        }
        
        return {
            nome: nome,
            cognome: cognome,
            email: email,
            foto: getVal("Foto"),
            punti: parseInt(getVal("Punti")) || 0,
            amministratore: getVal("Amministratore").toUpperCase() === "SI"
        };
    }).filter(m => m.email !== "");
}

/**
 * Applica le transazioni locali in memoria all'elenco dei membri
 */
function applyLocalTransactions(members) {
    const baseMembers = members.map(m => ({ ...m }));
    
    for (const tx of localTransactions) {
        const index = baseMembers.findIndex(m => m.email === tx.email);
        if (index !== -1) {
            baseMembers.push({
                nome: baseMembers[index].nome,
                cognome: baseMembers[index].cognome,
                email: tx.email,
                foto: baseMembers[index].foto,
                punti: tx.punti,
                amministratore: baseMembers[index].amministratore
            });
        } else {
            baseMembers.push({
                nome: tx.email.split("@")[0],
                cognome: "Nuovo",
                email: tx.email,
                foto: "",
                punti: tx.punti,
                amministratore: false
            });
        }
    }
    
    return baseMembers;
}

/**
 * Aggrega i punti per email e restituisce un oggetto membro
 */
export function aggregateMember(members, email) {
    const emailLower = email.trim().toLowerCase();
    const matches = members.filter((m) => m.email === emailLower);

    if (matches.length === 0) return null;

    const first = matches[0];
    const totalPunti = matches.reduce((sum, m) => sum + m.punti, 0);
    const storico = matches.map((m) => m.punti);
    const isAmministratore = matches.some((m) => m.amministratore === true);

    return {
        nome: first.nome,
        cognome: first.cognome,
        email: first.email,
        foto: first.foto,
        punti: totalPunti,
        storico,
        amministratore: isAmministratore
    };
}

/**
 * Aggrega tutti i membri per email e restituisce la classifica
 */
export function buildLeaderboard(members) {
    const aggregated = {};

    for (const m of members) {
        if (aggregated[m.email]) {
            aggregated[m.email].punti += m.punti;
            if (m.amministratore) {
                aggregated[m.email].amministratore = true;
            }
        } else {
            aggregated[m.email] = { ...m };
        }
    }

    return Object.values(aggregated).sort((a, b) => b.punti - a.punti);
}

/**
 * Recupera il catalogo dei giochi dal secondo foglio "Giochi" del Google Sheet.
 * In caso di errore o assenza, effettua il fallback sul file locale giochi.json.
 */
export async function fetchGames() {
    // 1. Prova via Google Sheets API v4 se la chiave è presente
    if (API_KEY && API_KEY.trim().length > 0) {
        try {
            console.log("Sheet Lib: Tentativo caricamento giochi tramite Google Sheets API...");
            const range = "Giochi!A:B";
            const url = `https://sheets.googleapis.com/v4/spreadsheets/${SHEET_ID}/values/${encodeURIComponent(range)}?key=${API_KEY}`;
            const res = await fetch(url, { cache: "no-store" });
            
            if (res.ok) {
                const data = await res.json();
                if (data.values && data.values.length > 0) {
                    const games = parseGoogleSheetsGames(data.values);
                    console.log(`Sheet Lib: Caricati ${games.length} giochi via Google Sheets API.`);
                    return games;
                }
            } else {
                console.warn(`Sheet Lib: Errore API Giochi (${res.status}). Provo fallback locale...`);
            }
        } catch (apiErr) {
            console.warn("Sheet Lib: Impossibile usare Google Sheets API per i giochi:", apiErr.message);
        }
    }

    // 2. Prova via CSV pubblico (tab "Giochi")
    try {
        console.log("Sheet Lib: Tentativo caricamento giochi tramite CSV (tab Giochi)...");
        const gamesUrl = `https://docs.google.com/spreadsheets/d/${SHEET_ID}/gviz/tq?tqx=out:csv&sheet=Giochi`;
        const res = await fetch(gamesUrl, { cache: 'no-store' });
        
        if (res.ok) {
            const csvText = await res.text();
            const result = Papa.parse(csvText, {
                header: true,
                skipEmptyLines: true,
            });
            
            const games = result.data.map((row, idx) => {
                const nome = row["Nome Gioco"] || row["Nome"] || "";
                const punti = parseInt(row["Punti Vittoria"] || row["Punti"]) || 0;
                return {
                    id: nome.toLowerCase().replace(/[^a-z0-9]/g, "_") || `game_${idx}`,
                    nome: nome,
                    puntiVittoria: punti
                };
            }).filter(g => g.nome !== "");
            
            if (games.length > 0) {
                console.log(`Sheet Lib: Caricati ${games.length} giochi via CSV.`);
                return games;
            }
        }
    } catch (csvErr) {
        console.warn("Sheet Lib: Impossibile caricare giochi via CSV:", csvErr.message);
    }

    // 3. Fallback locale giochi.json
    try {
        console.log("Sheet Lib: Caricamento giochi dal file giochi.json locale...");
        const filePath = path.join(process.cwd(), "public", "giochi.json");
        const fileData = fs.readFileSync(filePath, "utf8");
        return JSON.parse(fileData);
    } catch (fileErr) {
        console.error("Sheet Lib: Errore nella lettura del giochi.json locale:", fileErr);
        return [
            { id: "catan", nome: "Catan", puntiVittoria: 10 },
            { id: "carcassonne", nome: "Carcassonne", puntiVittoria: 8 },
            { id: "dixit", nome: "Dixit", puntiVittoria: 6 }
        ];
    }
}

/**
 * Parsa il catalogo giochi proveniente dall'API Google Sheets
 */
function parseGoogleSheetsGames(values) {
    const headers = values[0].map(h => (h || "").trim());
    const rows = values.slice(1);
    
    return rows.map((row, idx) => {
        const getVal = (colName) => {
            const idx = headers.indexOf(colName);
            return idx !== -1 && idx < row.length ? (row[idx] || "").trim() : "";
        };
        
        const nome = getVal("Nome Gioco") || getVal("Nome") || "";
        const puntiVal = getVal("Punti Vittoria") || getVal("Punti") || "0";
        const punti = parseInt(puntiVal) || 0;
        
        return {
            id: nome.toLowerCase().replace(/[^a-z0-9]/g, "_") || `game_${idx}`,
            nome: nome,
            puntiVittoria: punti
        };
    }).filter(g => g.nome !== "");
}
