import { NextResponse } from "next/server";
import { fetchMembers, buildLeaderboard } from "@/lib/sheets";

export async function GET(request) {
    const limit = Math.min(parseInt(searchParams.get("limit") || "1000", 10), 1000);

    try {
        const members = await fetchMembers();
        const leaderboard = buildLeaderboard(members).slice(0, limit);

        return NextResponse.json({ leaderboard });
    } catch (err) {
        console.error("API Error [leaderboard]:", err);
        return NextResponse.json(
            { error: "Errore interno: " + err.message },
            { status: 500 }
        );
    }
}
