export default defineNuxtPlugin(() => {
  const tg = (
    window as unknown as {
      Telegram?: {
        WebApp?: { ready: () => void; expand: () => void; initData?: string };
      };
    }
  ).Telegram?.WebApp;

  if (tg) {
    // Запоминаем launch-параметры сразу при старте: Telegram отдаёт их только в
    // первом открытии, а уход на /subscribe и возврат «Назад» могут перезагрузить
    // WebView уже без них. Запасной источник авторизации — sessionStorage
    // (см. getInitData в api/client.ts).
    if (tg.initData) {
      try {
        sessionStorage.setItem("tg-init-data", tg.initData);
      } catch {
        /* sessionStorage недоступен — полагаемся на «живой» initData */
      }
    }
    tg.ready();
    tg.expand();
  }
});
