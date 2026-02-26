import fs from "node:fs";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

export async function registerCommands(bot, deps = {}) {
  const dir = path.dirname(fileURLToPath(import.meta.url));

  const commandFiles = fs
    .readdirSync(dir)
    .filter((file) => file.endsWith(".js") && file !== "loader.js" && !file.startsWith("_"))
    .sort();

  for (const file of commandFiles) {
    const modUrl = pathToFileURL(path.join(dir, file)).href;
    const mod = await import(modUrl);

    const handler = mod?.default || mod?.register;
    if (typeof handler === "function") {
      await handler(bot, deps);
    } else {
      console.warn("[commands] skipped", { file });
    }
  }
}
