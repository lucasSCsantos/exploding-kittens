// The table screen: felt background, opponents around the edge, draw/discard piles, this
// player's own hand (driven by the server's `view` for this socket — ticket 12), and every
// special-moment overlay the rules need — Nope window, See/Alter the Future, Defuse reinsertion,
// Favor, and combos (ticket 11).

import { useRef, useState } from "react";
import type { CardId } from "../../engine/types.js";
import { AlterTheFuture } from "../overlays/AlterTheFuture.js";
import { DefuseReinsert } from "../overlays/DefuseReinsert.js";
import { DiscardPicker } from "../overlays/DiscardPicker.js";
import { FavorPrompt } from "../overlays/FavorPrompt.js";
import { NamedCardPicker } from "../overlays/NamedCardPicker.js";
import { NopeWindow } from "../overlays/NopeWindow.js";
import { SeeTheFuture } from "../overlays/SeeTheFuture.js";
import { TargetPicker } from "../overlays/TargetPicker.js";
import { assignDesigns } from "../cards.js";
import { DiscardPile } from "./DiscardPile.js";
import { DrawPile } from "./DrawPile.js";
import { EventLog } from "./EventLog.js";
import { Hand } from "./Hand.js";
import { Opponent } from "./Opponent.js";
import { RotatePrompt } from "./RotatePrompt.js";
import { useGameStore } from "./gameStore.js";
import { opponentSeatPositions } from "./layout.js";
import { classifySelectionShape, classifySinglePlay } from "./selection.js";
import type { Card } from "../../engine/types.js";

/** State machine for "the player selected cards and pressed Play, but we still need more input
 * before we know the full Action to dispatch" (targets, a named card, a discard pick, an order). */
type PendingPlay =
  | { kind: "target"; cardUid: string; toAction: (cardUid: string, target: number) => import("../../engine/actions.js").Action }
  | { kind: "alterFuture"; cardUid: string; cards: Card[] }
  | { kind: "pairTarget"; cardUids: [string, string] }
  | { kind: "tripleTarget"; cardUids: [string, string, string] }
  | { kind: "tripleName"; cardUids: [string, string, string]; target: number }
  | { kind: "fiveDifferent"; cardUids: [string, string, string, string, string] };

export function Table() {
  const dispatch = useGameStore((s) => s.dispatch);
  const peekTopOfDeck = useGameStore((s) => s.peekTopOfDeck);
  const playAgain = useGameStore((s) => s.playAgain);
  const lastError = useGameStore((s) => s.lastError);
  const view = useGameStore((s) => s.view);
  const playerId = useGameStore((s) => s.playerId);
  const hostId = useGameStore((s) => s.hostId);
  const discardRef = useRef<HTMLButtonElement>(null);
  const [pendingPlay, setPendingPlay] = useState<PendingPlay | null>(null);
  const [dismissedSeeFutureAt, setDismissedSeeFutureAt] = useState(0);
  // Once the host clicks "Play again", the server's `lobby` broadcast (which leaves the game
  // screen entirely) always arrives before a second click could matter — this just prevents a
  // spurious "game is not over yet" error from a double click in the meantime.
  const [playAgainClicked, setPlayAgainClicked] = useState(false);

  if (!view) return null;

  assignDesigns(view);

  const isYourTurn = view.currentPlayer === view.you && view.phase === "ACTION";
  const seats = opponentSeatPositions(view.players.length, view.you);

  function handlePlaySelection(cards: Card[]) {
    const shape = classifySelectionShape(cards);
    switch (shape.size) {
      case 1: {
        const play = classifySinglePlay(shape.cards[0].id);
        if (play.kind === "simple") dispatch(play.toAction(shape.cards[0].uid));
        else if (play.kind === "target") {
          setPendingPlay({ kind: "target", cardUid: shape.cards[0].uid, toAction: play.toAction });
        } else if (play.kind === "alterFuture") {
          const cardUid = shape.cards[0].uid;
          peekTopOfDeck()
            .then((cards) => setPendingPlay({ kind: "alterFuture", cardUid, cards }))
            .catch((err: unknown) =>
              useGameStore.setState({ lastError: err instanceof Error ? err.message : String(err) }),
            );
        }
        break;
      }
      case 2:
        setPendingPlay({ kind: "pairTarget", cardUids: [shape.cards[0].uid, shape.cards[1].uid] });
        break;
      case 3:
        setPendingPlay({
          kind: "tripleTarget",
          cardUids: [shape.cards[0].uid, shape.cards[1].uid, shape.cards[2].uid],
        });
        break;
      case 5:
        setPendingPlay({
          kind: "fiveDifferent",
          cardUids: shape.cards.map((c) => c.uid) as [string, string, string, string, string],
        });
        break;
      default:
        break;
    }
  }

  const lastHistoryEntry = view.playHistory[view.playHistory.length - 1];
  const showSeeFuture =
    view.phase === "ACTION" &&
    lastHistoryEntry !== undefined &&
    lastHistoryEntry.player === view.you &&
    lastHistoryEntry.effect.kind === "SEE_FUTURE" &&
    !lastHistoryEntry.noped &&
    view.playHistory.length > dismissedSeeFutureAt;
  const seenFutureCards = view.knownDeck
    .filter((entry) => entry.position < 3)
    .sort((a, b) => a.position - b.position)
    .map((entry) => entry.card);

  return (
    <div className="relative h-screen w-screen overflow-hidden bg-gradient-to-b from-green-900 to-green-950">
      <RotatePrompt />

      <EventLog players={view.players} playHistory={view.playHistory} />

      {view.winner !== null && (
        <div className="absolute inset-0 z-40 flex flex-col items-center justify-center gap-6 bg-black/70">
          <p className="text-3xl font-bold text-amber-300">{view.players[view.winner]!.id} wins!</p>
          {playerId === hostId ? (
            <button
              type="button"
              disabled={playAgainClicked}
              onClick={() => {
                setPlayAgainClicked(true);
                playAgain();
              }}
              className="rounded-full bg-amber-500 px-6 py-2 font-semibold text-neutral-900 disabled:opacity-50"
            >
              Play again
            </button>
          ) : (
            <p className="text-sm text-neutral-300">Waiting for the host to start a new round…</p>
          )}
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
          isSimplePlayable={(cardId: CardId) => classifySinglePlay(cardId).kind === "simple"}
          onSimplePlay={(card) => {
            const play = classifySinglePlay(card.id);
            if (play.kind === "simple") dispatch(play.toAction(card.uid));
          }}
          onPlaySelection={handlePlaySelection}
          getDiscardRect={() => discardRef.current?.getBoundingClientRect() ?? null}
        />
      </div>

      {view.phase === "NOPE_WINDOW" && (
        <NopeWindow
          nopeDeadline={view.nopeDeadline}
          hand={view.hand}
          onPlayNope={(cardUid) => dispatch({ type: "PLAY_NOPE", player: view.you, cardUid })}
          onWindowClosed={() => dispatch({ type: "PASS_NOPE_WINDOW" })}
        />
      )}

      {view.phase === "DEFUSE_REINSERT" && view.currentPlayer === view.you && (
        <DefuseReinsert
          deckSize={view.deckSize}
          onConfirm={(position) => dispatch({ type: "DEFUSE_REINSERT", position })}
        />
      )}

      {view.phase === "FAVOR_RESOLVE" &&
        view.pendingAction?.type === "FAVOR" &&
        view.pendingAction.target === view.you && (
          <FavorPrompt
            hand={view.hand}
            onGive={(cardUid) => dispatch({ type: "RESOLVE_FAVOR", cardUid })}
          />
        )}

      {showSeeFuture && (
        <SeeTheFuture
          cards={seenFutureCards}
          onDismiss={() => setDismissedSeeFutureAt(view.playHistory.length)}
        />
      )}

      {pendingPlay?.kind === "target" && (
        <TargetPicker
          title="Choose a target"
          view={view}
          onSelect={(target) => {
            dispatch(pendingPlay.toAction(pendingPlay.cardUid, target));
            setPendingPlay(null);
          }}
          onCancel={() => setPendingPlay(null)}
        />
      )}

      {pendingPlay?.kind === "pairTarget" && (
        <TargetPicker
          title="Steal a card from…"
          view={view}
          onSelect={(target) => {
            dispatch({ type: "PLAY_PAIR", cardUids: pendingPlay.cardUids, target });
            setPendingPlay(null);
          }}
          onCancel={() => setPendingPlay(null)}
        />
      )}

      {pendingPlay?.kind === "tripleTarget" && (
        <TargetPicker
          title="Choose a target"
          view={view}
          onSelect={(target) =>
            setPendingPlay({ kind: "tripleName", cardUids: pendingPlay.cardUids, target })
          }
          onCancel={() => setPendingPlay(null)}
        />
      )}

      {pendingPlay?.kind === "tripleName" && (
        <NamedCardPicker
          onSelect={(namedCard) => {
            dispatch({
              type: "PLAY_TRIPLE",
              cardUids: pendingPlay.cardUids,
              target: pendingPlay.target,
              namedCard,
            });
            setPendingPlay(null);
          }}
          onCancel={() => setPendingPlay(null)}
        />
      )}

      {pendingPlay?.kind === "fiveDifferent" && (
        <DiscardPicker
          discard={view.discard}
          onSelect={(discardUid) => {
            dispatch({ type: "PLAY_FIVE_DIFFERENT", cardUids: pendingPlay.cardUids, discardUid });
            setPendingPlay(null);
          }}
          onCancel={() => setPendingPlay(null)}
        />
      )}

      {pendingPlay?.kind === "alterFuture" && (
        <AlterTheFuture
          cards={pendingPlay.cards}
          onConfirm={(order) => {
            dispatch({ type: "PLAY_ALTER_FUTURE", cardUid: pendingPlay.cardUid, order });
            setPendingPlay(null);
          }}
          onCancel={() => setPendingPlay(null)}
        />
      )}

      {lastError && (
        <p className="absolute bottom-1 left-1/2 -translate-x-1/2 text-xs text-red-300">
          {lastError}
        </p>
      )}
    </div>
  );
}
