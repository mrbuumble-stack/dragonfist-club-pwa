import { NextResponse } from "next/server";
import { fetchMembers, aggregateMember } from "@/lib/sheets";

export async function GET(request) {
    const { searchParams } = new URL(request.url);
    const email = searchParams.get("email");

    if (!email) {
        return NextResponse.json(
            { error: "Parametro 'email' obbligatorio" },
            { status: 400 }
        );
    }

    try {
        const members = await fetchMembers();
        const member = aggregateMember(members, email);

        if (!member) {
            return NextResponse.json(
                { error: "Membro non trovato. Controlla l'email e riprova." },
                { status: 404 }
            );
        }

        return NextResponse.json(member);
    } catch (err) {
        return NextResponse.json(
            { error: "Errore nel recupero dei dati: " + err.message },
            { status: 502 }
        );
    }
}
