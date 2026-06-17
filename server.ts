import express from "express";
import path from "path";
import { createServer as createViteServer } from "vite";
import apiRouter from "./src/routes/api";
import { initDB, connectDB } from "./src/config/db";

// Initialize and Seed JSON-backed database
initDB();

const app = express();

// Request parsing middlewares
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Mount API routers
app.use("/api", async (req, res, next) => {
  await connectDB();
  next();
}, apiRouter);

// Static files channel for receipts/avatars uploads
app.use("/uploads", express.static(path.join(process.cwd(), "uploads")));

// Vite routing integration
if (process.env.NODE_ENV !== "production") {
  const startDevServer = async () => {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  };
  startDevServer();
} else {
  const distPath = path.join(process.cwd(), "dist");
  app.use(express.static(distPath));
  // Note: Vercel handles the SPA fallback via vercel.json rewrites, 
  // but we keep this here for local production testing.
  app.get("*", (req, res) => {
    if (!req.path.startsWith("/api")) {
      res.sendFile(path.join(distPath, "index.html"));
    }
  });
}

// Export the app for Vercel serverless functions
export default app;

// Only listen if not running in a serverless environment
if (process.env.NODE_ENV !== "production" || !process.env.VERCEL) {
  const PORT = process.env.PORT || 3000;
  app.listen(PORT, () => {
    console.log(`Server booted successfully and routing incoming traffic on port ${PORT}`);
  });
}
