import { NextResponse } from "next/server";
import { addLocalTransaction } from "@/lib/sheets";

export async function POST(request) {
    try {
        const body = await request.json();
        const { email, points, reason } = body;

        if (!email || typeof points !== "number") {
            return NextResponse.json(
                { error: "Parametri 'email' (string) e 'points' (number) obbligatori" },
                { status: 400 }
            );
        }

        const emailLower = email.trim().toLowerCase();

        // 1. Aggiorna in memoria locale
        addLocalTransaction(emailLower, points);

        let sheetUpdated = false;
        let warning = null;

        // 2. Se impostato, invia al Google Apps Script
        const scriptUrl = process.env.GOOGLE_SCRIPT_URL;
        if (scriptUrl && scriptUrl.trim().length > 0) {
            try {
                // Eseguiamo la chiamata POST a Google Apps Script con anche il motivo (gioco o admin)
                const response = await fetch(scriptUrl, {
                    method: "POST",
                    headers: {
                        "Content-Type": "application/json",
                    },
                    body: JSON.stringify({ 
                        email: emailLower, 
                        punti: points, 
                        motivo: reason || "Admin" 
                    }),
                    cache: "no-store",
                });

                if (response.ok) {
                    sheetUpdated = true;
                } else {
                    const text = await response.text();
                    warning = `Google Apps Script ha risposto con errore (${response.status}): ${text}`;
                }
            } catch (fetchErr) {
                console.error("Errore chiamata Google Apps Script:", fetchErr);
                warning = `Impossibile inviare dati a Google Sheet: ${fetchErr.message}`;
            }
        } else {
            warning = "GOOGLE_SCRIPT_URL non configurato in .env. Dati salvati in memoria locale.";
        }

        return NextResponse.json({
            success: true,
            sheetUpdated,
            warning,
            email: emailLower,
            points
        });
    } catch (err) {
        console.error("API Error [admin/update]:", err);
        return NextResponse.json(
            { error: "Errore interno: " + err.message },
            { status: 500 }
        );
    }
}
