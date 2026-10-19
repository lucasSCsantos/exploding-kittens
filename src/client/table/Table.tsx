// The table screen: felt background, opponents around the edge, draw/discard piles, this
// player's own hand (driven by the server's `view` for this socket — ticket 12), and every
// special-moment overlay the rules need — Nope window, See/Alter the Future, Defuse reinsertion,
// Favor, and combos (ticket 11).

import { useEffect, useRef, useState } from "react";
import type { CardId } from "../../engine/types.js";
import { AlterTheFuture } from "../overlays/AlterTheFuture.js";
import { DefuseReinsert } from "../overlays/DefuseReinsert.js";
import { DiscardPicker } from "../overlays/DiscardPicker.js";
import { EliminationOverlay } from "../overlays/EliminationOverlay.js";
import { FavorPrompt } from "../overlays/FavorPrompt.js";
import { NamedCardPicker } from "../overlays/NamedCardPicker.js";
import { NopeWindow } from "../overlays/NopeWindow.js";
import { SeeTheFuture } from "../overlays/SeeTheFuture.js";
import { TargetPicker } from "../overlays/TargetPicker.js";
import { assignDesigns } from "../cards.js";
import { CardTransferFlight } from "./CardTransferFlight.js";
import { DiscardPile } from "./DiscardPile.js";
import { DrawPile } from "./DrawPile.js";
import { EliminationFlash } from "./EliminationFlash.js";
import { EventLog } from "./EventLog.js";
import { Hand } from "./Hand.js";
import { Opponent } from "./Opponent.js";
import { RotatePrompt } from "./RotatePrompt.js";
import { WinScreen } from "./WinScreen.js";
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

/** How long each loss overlay stays up before Table clears it back out of the store — a full-
 * screen moment for the viewer's own loss deserves longer than a bystander's seat-local echo. */
const OWN_ELIMINATION_DISMISS_MS = 2600;
const OPPONENT_ELIMINATION_DISMISS_MS = 1400;

export function Table() {
  const dispatch = useGameStore((s) => s.dispatch);
  const peekTopOfDeck = useGameStore((s) => s.peekTopOfDeck);
  const playAgain = useGameStore((s) => s.playAgain);
  const lastError = useGameStore((s) => s.lastError);
  const view = useGameStore((s) => s.view);
  const playerId = useGameStore((s) => s.playerId);
  const hostId = useGameStore((s) => s.hostId);
  const lastElimination = useGameStore((s) => s.lastElimination);
  const lastTransfer = useGameStore((s) => s.lastTransfer);
  const lastDraw = useGameStore((s) => s.lastDraw);
  const discardRef = useRef<HTMLButtonElement>(null);
  const drawPileRef = useRef<HTMLDivElement>(null);
  // Keyed by seat (the viewer's own seat included), so a transfer can fly to/from any seat
  // without plumbing refs through Opponent/Hand — ticket 27 only needs each seat's current rect.
  const seatRefs = useRef(new Map<number, HTMLDivElement>());
  const [pendingPlay, setPendingPlay] = useState<PendingPlay | null>(null);
  const [dismissedSeeFutureAt, setDismissedSeeFutureAt] = useState(0);
  // Once the host clicks "Play again", the server's `lobby` broadcast (which leaves the game
  // screen entirely) always arrives before a second click could matter — this just prevents a
  // spurious "game is not over yet" error from a double click in the meantime.
  const [playAgainClicked, setPlayAgainClicked] = useState(false);

  useEffect(() => {
    if (!lastElimination) return;
    const isOwn = lastElimination.seat === useGameStore.getState().view?.you;
    const delay = isOwn ? OWN_ELIMINATION_DISMISS_MS : OPPONENT_ELIMINATION_DISMISS_MS;
    const timeout = window.setTimeout(() => {
      useGameStore.setState((state) =>
        state.lastElimination === lastElimination ? { lastElimination: null } : {},
      );
    }, delay);
    return () => window.clearTimeout(timeout);
  }, [lastElimination]);

  function setSeatRef(seat: number) {
    return (el: HTMLDivElement | null) => {
      if (el) seatRefs.current.set(seat, el);
      else seatRefs.current.delete(seat);
    };
  }

  function clearTransfer(transfer: typeof lastTransfer) {
    useGameStore.setState((state) => (state.lastTransfer === transfer ? { lastTransfer: null } : {}));
  }

  function clearDraw(draw: typeof lastDraw) {
    useGameStore.setState((state) => (state.lastDraw === draw ? { lastDraw: null } : {}));
  }

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

  const transferFlight = (() => {
    if (!lastTransfer) return null;
    const fromEl = seatRefs.current.get(lastTransfer.fromSeat);
    const toEl = seatRefs.current.get(lastTransfer.toSeat);
    if (!fromEl || !toEl) return null;
    return { fromRect: fromEl.getBoundingClientRect(), toRect: toEl.getBoundingClientRect() };
  })();

  // Reuses the same deck → seat flight as hand-to-hand transfers (ticket 26): face-up with the
  // actual card for the viewer's own draw, face-down (no card) for an opponent's.
  const drawFlight = (() => {
    if (!lastDraw) return null;
    const fromEl = drawPileRef.current;
    const toEl = seatRefs.current.get(lastDraw.seat);
    if (!fromEl || !toEl) return null;
    return { fromRect: fromEl.getBoundingClientRect(), toRect: toEl.getBoundingClientRect() };
  })();

  // Withhold the just-drawn card from the fan while it's still flying in from the deck, so it
  // doesn't appear in its slot and as the flying card at the same time — it joins the fan the
  // instant the flight lands (lastDraw clears, the full hand flows through again).
  const handForDisplay =
    drawFlight && lastDraw?.kind === "own" && lastDraw.card
      ? view.hand.filter((card) => card.uid !== lastDraw.card!.uid)
      : view.hand;

  return (
    <div className="relative h-screen w-screen overflow-hidden bg-gradient-to-b from-green-900 to-green-950">
      <RotatePrompt />

      <EventLog players={view.players} playHistory={view.playHistory} />

      {view.winner !== null && (
        <WinScreen
          winnerName={view.players[view.winner]!.id}
          isHost={playerId === hostId}
          playAgainDisabled={playAgainClicked}
          onPlayAgain={() => {
            setPlayAgainClicked(true);
            playAgain();
          }}
        />
      )}

      {lastElimination && lastElimination.seat === view.you && (
        <EliminationOverlay card={lastElimination.card} />
      )}

      {seats.map(({ seat, xPercent, yPercent }) => {
        const player = view.players[seat]!;
        // Hold the fan at its pre-draw count until the face-down card actually lands, so the
        // count visibly "arrives" with the card instead of jumping ahead of the animation.
        const isDrawLanding = drawFlight !== null && lastDraw?.kind === "opponent" && lastDraw.seat === seat;
        const handSize = isDrawLanding ? player.handSize - 1 : player.handSize;
        return (
          <div
            key={seat}
            ref={setSeatRef(seat)}
            className="absolute -translate-x-1/2 -translate-y-1/2"
            style={{ left: `${xPercent}%`, top: `${yPercent}%` }}
          >
            <Opponent
              nickname={player.id}
              handSize={handSize}
              alive={player.alive}
              isActiveTurn={view.currentPlayer === seat}
            />
            {lastElimination && lastElimination.seat === seat && (
              <EliminationFlash card={lastElimination.card} />
            )}
          </div>
        );
      })}

      <div className="absolute left-1/2 top-1/2 flex -translate-x-1/2 -translate-y-1/2 gap-8">
        <DrawPile
          ref={drawPileRef}
          deckSize={view.deckSize}
          canDraw={isYourTurn && view.deckSize > 0}
          onDraw={() => dispatch({ type: "DRAW" })}
        />
        <DiscardPile ref={discardRef} discard={view.discard} />
      </div>

      <div ref={setSeatRef(view.you)} className="absolute bottom-4 left-1/2 -translate-x-1/2">
        <Hand
          hand={handForDisplay}
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

      {view.phase === "DEFUSE_REINSERT" && view.pendingAction?.type === "DEFUSE_REINSERT" && (
        <DefuseReinsert
          kitten={view.pendingAction.kitten}
          deckSize={view.deckSize}
          onConfirm={
            view.currentPlayer === view.you
              ? (position) => dispatch({ type: "DEFUSE_REINSERT", position })
              : undefined
          }
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

      {lastTransfer && transferFlight && (
        <CardTransferFlight
          // Forces a fresh mount per transfer — otherwise a transfer that starts before the
          // previous one's flight finishes would resume mid-animation from the wrong spot
          // instead of starting clean at the new source rect.
          key={`${lastTransfer.fromSeat}-${lastTransfer.toSeat}-${lastTransfer.card?.uid ?? "hidden"}`}
          fromRect={transferFlight.fromRect}
          toRect={transferFlight.toRect}
          card={lastTransfer.card}
          onDone={() => clearTransfer(lastTransfer)}
        />
      )}

      {lastDraw && drawFlight && (
        <CardTransferFlight
          key={`draw-${lastDraw.seat}-${lastDraw.card?.uid ?? "hidden"}`}
          fromRect={drawFlight.fromRect}
          toRect={drawFlight.toRect}
          card={lastDraw.card}
          onDone={() => clearDraw(lastDraw)}
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
