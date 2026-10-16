// The table screen: felt background, seats around the edge, draw/discard piles, the active
// seat's hand, and a dev-only seat switcher so one device can hot-seat the whole game
// (ticket 10).

import { useRef } from "react";
import type { Action } from "../../engine/actions.js";
import type { CardId } from "../../engine/types.js";
import { assignDesigns } from "../cards.js";
import { CardFace } from "./CardFace.js";
import { DiscardPile } from "./DiscardPile.js";
import { DrawPile } from "./DrawPile.js";
import { Hand } from "./Hand.js";
import { Opponent } from "./Opponent.js";
import { useActivePlayerView, useGameStore } from "./gameStore.js";
import { opponentSeatPositions } from "./layout.js";

/** Action cards playable standalone, with no target or extra parameters — the rest (targeted
 * attack, favor, combos, nope) are ticket 11's overlays. */
const SIMPLE_PLAYS: Partial<Record<CardId, (cardUid: string) => Action>> = {
  ATK: (cardUid) => ({ type: "PLAY_ATTACK", cardUid }),
  SKIP: (cardUid) => ({ type: "PLAY_SKIP", cardUid }),
  SHUF: (cardUid) => ({ type: "PLAY_SHUFFLE", cardUid }),
  STF: (cardUid) => ({ type: "PLAY_SEE_FUTURE", cardUid }),
  DFB: (cardUid) => ({ type: "PLAY_DRAW_FROM_BOTTOM", cardUid }),
};

export function Table() {
  const game = useGameStore((s) => s.game);
  const activeSeat = useGameStore((s) => s.activeSeat);
  const setActiveSeat = useGameStore((s) => s.setActiveSeat);
  const dispatch = useGameStore((s) => s.dispatch);
  const lastError = useGameStore((s) => s.lastError);
  const view = useActivePlayerView();
  const discardRef = useRef<HTMLButtonElement>(null);

  if (!game || !view) return null;

  assignDesigns(view);

  const isYourTurn = view.currentPlayer === view.you && view.phase === "ACTION";
  const seats = opponentSeatPositions(view.players.length, view.you);

  return (
    <div className="relative h-screen w-screen overflow-hidden bg-gradient-to-b from-green-900 to-green-950">
      <div className="absolute left-1/2 top-3 flex -translate-x-1/2 gap-2 rounded-full bg-black/40 px-3 py-1">
        {game.players.map((p, seat) => (
          <button
            key={p.id}
            type="button"
            onClick={() => setActiveSeat(seat)}
            className={`rounded-full px-3 py-1 text-xs font-medium ${
              seat === activeSeat ? "bg-amber-400 text-neutral-900" : "text-white/70 hover:text-white"
            }`}
          >
            DEV: {p.id}
          </button>
        ))}
      </div>

      {view.winner !== null && (
        <div className="absolute inset-0 z-40 flex items-center justify-center bg-black/70">
          <p className="text-3xl font-bold text-amber-300">
            {game.players[view.winner]!.id} wins!
          </p>
        </div>
      )}

      {seats.map(({ seat, xPercent, yPercent }) => {
        const player = view.players[seat]!;
        return (
          <div
            key={seat}
            className="absolute -translate-x-1/2 -translate-y-1/2"
            style={{ left: `${xPercent}%`, top: `${yPercent}%` }}
          >
            <Opponent
              nickname={player.id}
              handSize={player.handSize}
              alive={player.alive}
              isActiveTurn={view.currentPlayer === seat}
            />
          </div>
        );
      })}

      <div className="absolute left-1/2 top-1/2 flex -translate-x-1/2 -translate-y-1/2 gap-8">
        <DrawPile
          deckSize={view.deckSize}
          canDraw={isYourTurn && view.deckSize > 0}
          onDraw={() => dispatch({ type: "DRAW" })}
        />
        <DiscardPile ref={discardRef} discard={view.discard} />
      </div>

      <div className="absolute bottom-4 left-1/2 -translate-x-1/2">
        <Hand
          hand={view.hand}
          canPlay={isYourTurn}
          isPlayable={(cardId) => cardId in SIMPLE_PLAYS}
          onPlay={(card) => {
            const toAction = SIMPLE_PLAYS[card.id];
            if (toAction) dispatch(toAction(card.uid));
          }}
          getDiscardRect={() => discardRef.current?.getBoundingClientRect() ?? null}
        />
      </div>

      {view.phase === "NOPE_WINDOW" && (
        <div className="absolute inset-x-0 bottom-32 flex justify-center gap-2">
          {view.hand.some((card) => card.id === "NOPE") && (
            <button
              type="button"
              onClick={() => {
                const nope = view.hand.find((card) => card.id === "NOPE")!;
                dispatch({ type: "PLAY_NOPE", player: view.you, cardUid: nope.uid });
              }}
              className="rounded-full bg-red-500 px-6 py-2 font-semibold text-white shadow-lg"
            >
              Play Nope
            </button>
          )}
          <button
            type="button"
            onClick={() => dispatch({ type: "PASS_NOPE_WINDOW" })}
            className="rounded-full bg-neutral-100 px-6 py-2 font-semibold text-neutral-900 shadow-lg"
          >
            Pass Nope window
          </button>
        </div>
      )}

      {view.phase === "DEFUSE_REINSERT" && view.currentPlayer === view.you && (
        <div className="absolute inset-x-0 bottom-32 flex flex-wrap justify-center gap-2 px-4">
          {Array.from({ length: view.deckSize + 1 }, (_, position) => (
            <button
              key={position}
              type="button"
              onClick={() => dispatch({ type: "DEFUSE_REINSERT", position })}
              className="rounded-full bg-amber-500 px-3 py-1 text-sm font-semibold text-neutral-900 shadow"
            >
              {position === 0 ? "Top" : position === view.deckSize ? "Bottom" : `#${position}`}
            </button>
          ))}
        </div>
      )}

      {view.phase === "FAVOR_RESOLVE" &&
        view.pendingAction?.type === "FAVOR" &&
        view.pendingAction.target === view.you && (
          <div className="absolute inset-x-0 bottom-32 flex flex-wrap justify-center gap-2 px-4">
            {view.hand.map((card) => (
              <button
                key={card.uid}
                type="button"
                onClick={() => dispatch({ type: "RESOLVE_FAVOR", cardUid: card.uid })}
              >
                <CardFace card={card} />
              </button>
            ))}
          </div>
        )}

      {lastError && (
        <p className="absolute bottom-1 left-1/2 -translate-x-1/2 text-xs text-red-300">
          {lastError}
        </p>
      )}
    </div>
  );
}
