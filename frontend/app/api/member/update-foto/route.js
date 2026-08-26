import { NextResponse } from "next/server";

export async function POST(request) {
    try {
        const body = await request.json();
        const { email, fotoUrl, base64Data, mimeType } = body;

        if (!email || (!fotoUrl && !base64Data)) {
            return NextResponse.json(
                { error: "È necessario fornire un'immagine (file) o un URL valido." },
                { status: 400 }
            );
        }

        const emailLower = email.trim().toLowerCase();
        let payloadToSend = {
            email: emailLower,
        };

        if (base64Data) {
            payloadToSend.action = "uploadFoto";
            payloadToSend.base64Data = base64Data;
            payloadToSend.mimeType = mimeType || "image/jpeg";
        } else {
            const urlTrimmed = fotoUrl.trim();
            try {
                new URL(urlTrimmed);
            } catch {
                return NextResponse.json(
                    { error: "L'URL fornito non è valido." },
                    { status: 400 }
                );
            }
            payloadToSend.action = "updateFoto";
            payloadToSend.fotoUrl = urlTrimmed;
        }

        let sheetUpdated = false;
        let warning = null;
        let finalFotoUrl = fotoUrl ? fotoUrl.trim() : null;

        // Invia al Google Apps Script
        const scriptUrl = process.env.GOOGLE_SCRIPT_URL;
        if (scriptUrl && scriptUrl.trim().length > 0) {
            try {
                const response = await fetch(scriptUrl, {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify(payloadToSend),
                    cache: "no-store",
                });

                if (response.ok) {
                    const resultData = await response.json().catch(() => ({}));
                    sheetUpdated = true;
                    if (resultData.fotoUrl) {
                        finalFotoUrl = resultData.fotoUrl;
                    }
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
            fotoUrl: finalFotoUrl,
        });
    } catch (err) {
        console.error("API Error [member/update-foto]:", err);
        return NextResponse.json(
            { error: "Errore interno: " + err.message },
            { status: 500 }
        );
    }
}
