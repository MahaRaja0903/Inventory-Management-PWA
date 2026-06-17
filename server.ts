import express from "express";
import path from "path";
import { createServer as createViteServer } from "vite";
import apiRouter from "./src/routes/api";
import { initDB } from "./src/config/db";

async function startServer() {
  // Initialize and Seed JSON-backed database
  initDB();

  const app = express();
  const PORT = 3000;

  // Request parsing middlewares
  app.use(express.json());
  app.use(express.urlencoded({ extended: true }));

  // Mount API routers
  app.use("/api", apiRouter);

  // Static files channel for receipts/avatars uploads
  app.use("/uploads", express.static(path.join(process.cwd(), "uploads")));

  // Vite routing integration
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server booted successfully and routing incoming traffic on port ${PORT}`);
  });
}

startServer();
