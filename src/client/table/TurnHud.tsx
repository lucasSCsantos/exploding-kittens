// A fixed HUD readout of "it's your turn", top-center of the screen — deliberately independent of
// Hand's own DOM position (which moves/grows with hand size and risked riding into the table's
// center and overlapping the discard pile). Shows a "Nx" badge whenever the player owes more than
// one turn in a row (stacked Attacks).

export interface TurnHudProps {
  isYourTurn: boolean;
  turnsRemaining: number;
}

export function TurnHud({ isYourTurn, turnsRemaining }: TurnHudProps) {
  if (!isYourTurn) return null;

  return (
    <div className="pointer-events-none absolute left-1/2 top-2 z-30 flex -translate-x-1/2 items-center gap-2 rounded-full bg-black/50 px-4 py-1.5 text-sm font-semibold shadow backdrop-blur">
      <span className="text-amber-300">Sua vez</span>
      {turnsRemaining > 1 && (
        <span
          className="rounded-full bg-red-500 px-2 py-0.5 text-xs font-bold text-white shadow"
          title={`Você deve jogar ${turnsRemaining} turnos seguidos (ataques acumulados)`}
        >
          {turnsRemaining}x
        </span>
      )}
    </div>
  );
}
