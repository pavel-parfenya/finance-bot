import { createApp } from "vue";
import App from "./App.vue";
import "./styles.css";

const tg = (
  window as unknown as {
    Telegram?: { WebApp?: { ready: () => void; expand: () => void } };
  }
).Telegram?.WebApp;
if (tg) {
  tg.ready();
  tg.expand();
}

createApp(App).mount("#app");
