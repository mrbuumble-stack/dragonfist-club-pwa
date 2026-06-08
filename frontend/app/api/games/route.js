import { NextResponse } from "next/server";
import { fetchGames } from "@/lib/sheets";

export async function GET() {
    try {
        const games = await fetchGames();
        return NextResponse.json({ games });
    } catch (err) {
        console.error("API Error [games]:", err);
        return NextResponse.json(
            { error: "Errore interno: " + err.message },
            { status: 500 }
        );
    }
}
