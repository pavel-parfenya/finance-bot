import { config } from "./config";
import { buildContainer } from "./di/container";

async function main(): Promise<void> {
  const { bot } = buildContainer(config);

  console.log("Starting finance bot...");
  await bot.start({
    onStart: () => console.log("Bot is running!"),
  });
}

main().catch((err) => {
  console.error("Fatal error:", err);
  process.exit(1);
});
