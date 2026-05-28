# DragonFist Club PWA — SOP

## Obiettivo
Progressive Web App per i membri dell'associazione DragonFist Club.
Ogni membro inserisce la propria email e visualizza:
- Profilo (nome, cognome, foto, email)
- Punti associativi totali
- Storico punti (grafico a barre)
- Classifica generale (leaderboard top 10)

## Sorgente Dati
- **Google Sheet pubblico**
- Sheet ID: `1BVBIw8dl2Q5CiPewZV4x4ZP8MPVgrKkD2fHAkvbkff4`
- Colonne: Nome, Cognome, Email, Foto (URL), Punti
- I punti vengono aggregati per email (un membro può avere più righe)

## Stack Tecnologico
- **Frontend + API**: Next.js (App Router) + Tailwind-free custom CSS
- **Data fetching**: CSV export dal Google Sheet → parsed con `papaparse`
- **PWA Features**: Service Worker per offline caching, manifest.json con icone responsive (192, 384, 512, apple-icon), metadata Next.js
- **Hosting**: può essere deployato su Vercel, Netlify, o simili

## Come Funziona
1. L'utente apre la PWA e inserisce la propria email
2. Il frontend chiama `/api/member?email=...`
3. L'API route fetch il CSV, parsa, filtra per email, aggrega i punti
4. I risultati vengono mostrati nella dashboard
5. Cache in memoria (5 minuti) per non sovraccaricare Google Sheets

## Come Aggiornare i Dati
Basta aggiungere/modificare righe nel Google Sheet.
Le modifiche sono visibili nella PWA entro 5 minuti (TTL della cache).

## Come Aggiungere la Foto di un Membro
Inserire un URL pubblico dell'immagine nella colonna "Foto" del Google Sheet.
Es: URL di Google Drive (con condivisione pubblica) o qualsiasi URL immagine.

## Come Deployare
```bash
cd frontend
npm run build
npm start
```
Oppure collegare il repo a Vercel per deploy automatico.

## File Principali
- `frontend/lib/sheets.js` — Logica di fetch + parsing + cache
- `frontend/app/api/member/route.js` — API lookup membro (usa path alias `@/lib/sheets`)
- `frontend/app/api/leaderboard/route.js` — API classifica (usa path alias `@/lib/sheets`)
- `frontend/app/page.js` — UI principale (login + dashboard + contatore animato CountUp)
- `frontend/app/globals.css` — Design system DragonFist (include effetti olografici/shine)
- `frontend/public/manifest.json` — Configurazione PWA completa di icone responsive
- `frontend/public/sw.js` — Service worker per offline caching

## Casi Limite
- **Email non trovata**: restituisce errore 404 con messaggio utente
- **Sheet non raggiungibile**: restituisce errore 502
- **Colonna Foto vuota**: mostra avatar con iniziali
- **Più righe stessa email**: i punti vengono sommati, storico mostrato come grafico
