import { NextResponse } from "next/server";
import { fetchMembers, buildLeaderboard } from "@/lib/sheets";

export async function GET(request) {
    const { searchParams } = new URL(request.url);
    const limit = Math.min(parseInt(searchParams.get("limit") || "10", 10), 50);

    try {
        const members = await fetchMembers();
        const leaderboard = buildLeaderboard(members).slice(0, limit);

        return NextResponse.json({ leaderboard });
    } catch (err) {
        return NextResponse.json(
            { error: "Errore nel recupero dei dati: " + err.message },
            { status: 502 }
        );
    }
}
