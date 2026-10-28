import "dotenv/config";
import app from "./index.js";

const port = Number(process.env.PORT);
if (!Number.isInteger(port) || port < 1 || port > 65_535) throw new Error("Run this adapter with vercel dev; it requires the assigned PORT.");
app.listen(port, "127.0.0.1");
