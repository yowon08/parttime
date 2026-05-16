import { rm } from "node:fs/promises";
import { resolve } from "node:path";

const root = process.cwd();
const dist = resolve(root, "dist");

if (!dist.startsWith(root)) {
  throw new Error(`Refusing to clean outside project: ${dist}`);
}

for (let attempt = 1; attempt <= 5; attempt += 1) {
  try {
    await rm(dist, { recursive: true, force: true, maxRetries: 4, retryDelay: 120 });
    break;
  } catch (error) {
    if (attempt === 5) throw error;
    await new Promise((resolveDelay) => setTimeout(resolveDelay, 160 * attempt));
  }
}
