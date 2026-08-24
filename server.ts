import express from "express";
import path from "path";
import apiRouter from "./src/routes/api";

const app = express();

// Request parsing middlewares
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Mount API routers
app.use("/api", apiRouter);

// Static files channel for receipts/avatars uploads
app.use("/uploads", express.static(path.join(process.cwd(), "uploads")));

// Vite routing integration
if (process.env.NODE_ENV !== "production") {
  const startDevServer = async () => {
    const { createServer: createViteServer } = await import("vite");
    const viteConfigFnModule = await import("./vite.config.js");
    const viteConfigFn = viteConfigFnModule.default || viteConfigFnModule;

    // Resolve the config function (in case it returns an object or promise)
    const viteConfig = typeof viteConfigFn === "function" 
      ? await (viteConfigFn as any)({ command: 'serve', mode: 'development' }) 
      : viteConfigFn;

    const vite = await createViteServer({
      ...viteConfig,
      configFile: false, // Bypass Vite's internal loader entirely to fix Windows ERR_INVALID_URL_SCHEME
      server: { ...viteConfig?.server, middlewareMode: true },
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
