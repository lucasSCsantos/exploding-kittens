import path from "node:path";
import { fileURLToPath } from "node:url";
import express from "express";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const clientDist = path.resolve(__dirname, "../client");

const app = express();
const port = process.env.PORT ? Number(process.env.PORT) : 3000;

app.use(express.static(clientDist));

app.use((_req, res) => {
  res.sendFile(path.join(clientDist, "index.html"));
});

app.listen(port, () => {
  console.log(`Server listening on port ${port}`);
});
