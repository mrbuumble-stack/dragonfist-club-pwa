import { NextResponse } from "next/server";

export async function POST(request) {
    try {
        const body = await request.json();
        const { email, fotoUrl } = body;

        if (!email || !fotoUrl) {
            return NextResponse.json(
                { error: "Parametri 'email' e 'fotoUrl' obbligatori" },
                { status: 400 }
            );
        }

        const emailLower = email.trim().toLowerCase();
        const urlTrimmed = fotoUrl.trim();

        // Validazione base URL
        try {
            new URL(urlTrimmed);
        } catch {
            return NextResponse.json(
                { error: "L'URL fornito non e' valido." },
                { status: 400 }
            );
        }

        let sheetUpdated = false;
        let warning = null;

        // Invia al Google Apps Script
        const scriptUrl = process.env.GOOGLE_SCRIPT_URL;
        if (scriptUrl && scriptUrl.trim().length > 0) {
            try {
                const response = await fetch(scriptUrl, {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({
                        action: "updateFoto",
                        email: emailLower,
                        fotoUrl: urlTrimmed,
                    }),
                    cache: "no-store",
                });

                if (response.ok) {
                    sheetUpdated = true;
                } else {
                    const text = await response.text();
                    warning = `Apps Script ha risposto con errore (${response.status}): ${text}`;
                }
            } catch (fetchErr) {
                console.error("Errore chiamata Apps Script (update-foto):", fetchErr);
                warning = `Impossibile scrivere su Google Sheet: ${fetchErr.message}`;
            }
        } else {
            warning = "GOOGLE_SCRIPT_URL non configurato. Foto non salvata in modo persistente.";
        }

        return NextResponse.json({
            success: true,
            sheetUpdated,
            warning,
            email: emailLower,
            fotoUrl: urlTrimmed,
        });
    } catch (err) {
        console.error("API Error [member/update-foto]:", err);
        return NextResponse.json(
            { error: "Errore interno: " + err.message },
            { status: 500 }
        );
    }
}
