import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import "./index.css";

function App() {
  return (
    <main className="flex h-screen items-center justify-center bg-neutral-900 text-white">
      <h1 className="text-2xl font-semibold">Exploding Friends</h1>
    </main>
  );
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
