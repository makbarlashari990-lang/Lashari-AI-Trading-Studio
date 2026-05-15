import express from "express";
import path from "path";
import { createServer } from "http";
import { Server } from "socket.io";
import { createServer as createViteServer } from "vite";

const ASSET_CONFIGS: Record<string, { base: number; volatility: number; precision: number }> = {
  'BTC/USD': { base: 64000, volatility: 450, precision: 2 },
  'ETH/USD': { base: 3400, volatility: 25, precision: 2 },
  'SOL/USD': { base: 145, volatility: 2, precision: 2 },
  'EUR/USD': { base: 1.0850, volatility: 0.0015, precision: 5 },
  'GBP/USD': { base: 1.2640, volatility: 0.0018, precision: 5 },
  'USD/JPY': { base: 151.40, volatility: 0.25, precision: 3 },
  'XAU/USD': { base: 2165.00, volatility: 12.50, precision: 2 },
};

async function startServer() {
  const app = express();
  const httpServer = createServer(app);
  const io = new Server(httpServer, {
    cors: {
      origin: "*",
      methods: ["GET", "POST"]
    }
  });

  const PORT = 3000;

  // Track prices
  let prices: Record<string, number> = {};
  Object.keys(ASSET_CONFIGS).forEach(asset => {
    prices[asset] = ASSET_CONFIGS[asset].base;
  });

  // Price Simulation Loop
  setInterval(() => {
    Object.keys(ASSET_CONFIGS).forEach(asset => {
      const config = ASSET_CONFIGS[asset];
      const fluctuation = (Math.random() - 0.5) * (config.volatility * 0.1);
      prices[asset] = parseFloat((prices[asset] + fluctuation).toFixed(config.precision));
    });
    
    io.emit("price_update", prices);
  }, 1000);

  io.on("connection", (socket) => {
    console.log("Client connected:", socket.id);
    socket.emit("initial_prices", prices);
    
    socket.on("disconnect", () => {
      console.log("Client disconnected:", socket.id);
    });
  });

  // Vite middleware for development
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  httpServer.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
