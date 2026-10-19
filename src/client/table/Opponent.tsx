// One opponent seat: avatar, nickname, face-down fan sized to their hand count, and a highlight
// while it's their turn (ticket 10).

import { getCardBackImage } from "../cards.js";
import { fanTransform } from "./layout.js";
import { ACTIVE_TURN_GLOW, ACTIVE_TURN_RING } from "./turnHighlight.js";

export interface OpponentProps {
  nickname: string;
  handSize: number;
  alive: boolean;
  isActiveTurn: boolean;
  onClick?: () => void;
  selectable?: boolean;
}

export function Opponent({
  nickname,
  handSize,
  alive,
  isActiveTurn,
  onClick,
  selectable = false,
}: OpponentProps) {
  const backImage = getCardBackImage();
  const fanCount = Math.min(handSize, 8);
  const Container = selectable ? "button" : "div";

  return (
    <Container
      type={selectable ? "button" : undefined}
      onClick={onClick}
      className={`flex flex-col items-center gap-1 rounded-xl p-2 transition ${
        isActiveTurn ? ACTIVE_TURN_RING : ""
      } ${selectable ? "cursor-pointer ring-2 ring-sky-400 hover:bg-white/10" : ""} ${
        !alive ? "opacity-40 grayscale" : ""
      }`}
    >
      <div
        className={`flex h-14 w-14 items-center justify-center rounded-full bg-neutral-700 text-lg font-bold text-white ${
          isActiveTurn ? ACTIVE_TURN_GLOW : ""
        }`}
      >
        {nickname.slice(0, 2).toUpperCase()}
      </div>
      <span className="max-w-24 truncate text-sm text-white">{nickname}</span>
      <div className="relative flex h-14 items-end justify-center">
        {Array.from({ length: fanCount }, (_, i) => {
          const { rotateDeg, translateX } = fanTransform(i, fanCount);
          return (
            <img
              key={i}
              src={backImage}
              alt=""
              aria-hidden
              draggable={false}
              className="absolute h-14 w-10 max-w-none select-none rounded object-cover shadow"
              style={{ transform: `rotate(${rotateDeg}deg) translateX(${translateX / 2}px)` }}
            />
          );
        })}
      </div>
      <span className="text-xs text-neutral-300">{handSize} cards</span>
    </Container>
  );
}
