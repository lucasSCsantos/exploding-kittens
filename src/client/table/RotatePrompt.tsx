// Portrait-mode handling on phones (ticket 16): the table layout (fanned hand, opponents around
// the edge, draw/discard piles) needs landscape width, per the project description's "Designed
// for both phones (landscape) and computers". Visibility is pure CSS (see index.css) so it tracks
// device rotation live without a resize/orientation JS listener.

export function RotatePrompt() {
  return (
    <div className="rotate-prompt fixed inset-0 z-50 flex-col items-center justify-center gap-4 bg-neutral-950 p-6 text-center text-white">
      <p className="text-5xl">🔄</p>
      <p className="text-lg font-semibold">Rotate your device</p>
      <p className="text-sm text-neutral-300">
        Exploding Friends is designed for landscape — turn your phone sideways to see the table.
      </p>
    </div>
  );
}
