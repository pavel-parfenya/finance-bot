export default defineNuxtPlugin(() => {
  const tg = (
    window as unknown as {
      Telegram?: { WebApp?: { ready: () => void; expand: () => void } };
    }
  ).Telegram?.WebApp;

  if (tg) {
    tg.ready();
    tg.expand();
  }
});
