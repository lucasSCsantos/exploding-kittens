import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import "./index.css";
import { NewGameForm } from "./table/NewGameForm.js";
import { Table } from "./table/Table.js";
import { useGameStore } from "./table/gameStore.js";

function App() {
  const hasGame = useGameStore((s) => s.game !== null);
  return hasGame ? <Table /> : <NewGameForm />;
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
