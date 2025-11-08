import { NextRequest, NextResponse } from "next/server";
import { incrementPlayerScore } from "@/lib/gameStore";

export async function POST(
  request: NextRequest,
  { params }: { params: { code: string } }
) {
  try {
    const { code } = params;
    const body = await request.json();
    const { playerName, targetColor } = body;

    if (!playerName) {
      return NextResponse.json(
        { error: "Player name is required" },
        { status: 400 }
      );
    }

    // Increment player score
    const game = incrementPlayerScore(code, playerName);
    
    // Find the player's updated score
    const player = game.players.find(p => p.name === playerName);
    const score = player?.score ?? 0;

    return NextResponse.json({ 
      success: true, 
      score,
      message: "Hit registered!" 
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to register shot";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
