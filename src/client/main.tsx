import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import "./index.css";
// Side-effect import only: registers the sound/haptics feedback subscription (ticket 15).
import "./table/gameFeedback.js";
import { Lobby } from "./table/Lobby.js";
import { NewGameForm } from "./table/NewGameForm.js";
import { Table } from "./table/Table.js";
import { useGameStore } from "./table/gameStore.js";

function App() {
  const code = useGameStore((s) => s.code);
  const view = useGameStore((s) => s.view);

  if (!code) return <NewGameForm />;
  if (!view) return <Lobby />;
  return <Table />;
}

const container = document.getElementById("root");
if (!container) {
  throw new Error("Root element not found");
}

createRoot(container).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
