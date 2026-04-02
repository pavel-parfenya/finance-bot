import { defineComponent, ref, onMounted, onUnmounted, watch } from "vue";
import {
  Chart,
  LineController,
  LineElement,
  PointElement,
  LinearScale,
  CategoryScale,
  Legend,
  Tooltip,
  type ChartConfiguration,
} from "chart.js";
import type { AppUserStatsResponse } from "@finance-bot/shared";
import { fetchAppUserStats } from "~/api/client";

Chart.register(
  LineController,
  LineElement,
  PointElement,
  LinearScale,
  CategoryScale,
  Legend,
  Tooltip
);

function utcYmd(d: Date): string {
  return d.toISOString().slice(0, 10);
}

/** Последние 7 UTC‑дней, включая сегодня. */
function defaultRange(): { from: string; to: string } {
  const to = new Date();
  const from = new Date(
    Date.UTC(to.getUTCFullYear(), to.getUTCMonth(), to.getUTCDate() - 6)
  );
  return { from: utcYmd(from), to: utcYmd(to) };
}

const SHORT_MONTHS_RU = [
  "янв",
  "фев",
  "мар",
  "апр",
  "май",
  "июн",
  "июл",
  "авг",
  "сен",
  "окт",
  "ноя",
  "дек",
] as const;

/** Подпись оси: dd.mon (UTC-день из YYYY-MM-DD). */
function formatDdMon(isoDate: string): string {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(isoDate);
  if (!m) return isoDate;
  const day = parseInt(m[3], 10);
  const monthNum = parseInt(m[2], 10);
  const mon = monthNum >= 1 && monthNum <= 12 ? SHORT_MONTHS_RU[monthNum - 1] : m[2];
  return `${day}.${mon}`;
}

const COLOR_TOTAL = "#2563eb";
const COLOR_EMPTY = "#64748b";
const COLOR_ACTIVE = "#16a34a";
const COLOR_INACTIVE = "#d97706";

export default defineComponent({
  setup() {
    const canvasRef = ref<HTMLCanvasElement | null>(null);
    let chartInst: Chart | null = null;

    const loading = ref(true);
    const error = ref<string | null>(null);
    const current = ref({
      totalUsers: 0,
      emptyUsers: 0,
      activeUsers: 0,
      inactiveUsers: 0,
    });
    const series = ref<
      Array<{
        date: string;
        totalUsers: number;
        emptyUsers: number;
        activeUsers: number;
        inactiveUsers: number;
      }>
    >([]);

    const fromDate = ref(defaultRange().from);
    const toDate = ref(defaultRange().to);

    async function load() {
      loading.value = true;
      error.value = null;
      const data = await fetchAppUserStats(fromDate.value, toDate.value);
      if ("error" in data && data.error) {
        error.value =
          typeof data.error === "string" ? data.error : "Не удалось загрузить";
        loading.value = false;
        return;
      }
      const d = data as AppUserStatsResponse;
      if (d.error) {
        error.value = d.error;
        loading.value = false;
        return;
      }
      current.value = d.current;
      series.value = d.series ?? [];
      loading.value = false;
    }

    function destroyChart() {
      if (chartInst) {
        chartInst.destroy();
        chartInst = null;
      }
    }

    function initChart() {
      if (!canvasRef.value || series.value.length === 0) {
        destroyChart();
        return;
      }
      const ctx = canvasRef.value.getContext("2d");
      if (!ctx) return;

      const textColor =
        getComputedStyle(document.body)
          .getPropertyValue("--tg-theme-text-color")
          .trim() || "#111827";
      const gridColor =
        getComputedStyle(document.body)
          .getPropertyValue("--tg-theme-hint-color")
          .trim() || "#9ca3af";

      const labels = series.value.map((p) => formatDdMon(p.date));
      const mk = (key: "totalUsers" | "emptyUsers" | "activeUsers" | "inactiveUsers") =>
        series.value.map((p) => p[key]);

      chartInst = new Chart(ctx, {
        type: "line",
        data: {
          labels,
          datasets: [
            {
              label: "Всего",
              data: mk("totalUsers"),
              borderColor: COLOR_TOTAL,
              backgroundColor: `${COLOR_TOTAL}33`,
              tension: 0.2,
              pointRadius: 2,
            },
            {
              label: "Пустых",
              data: mk("emptyUsers"),
              borderColor: COLOR_EMPTY,
              backgroundColor: `${COLOR_EMPTY}33`,
              tension: 0.2,
              pointRadius: 2,
            },
            {
              label: "Активные",
              data: mk("activeUsers"),
              borderColor: COLOR_ACTIVE,
              backgroundColor: `${COLOR_ACTIVE}33`,
              tension: 0.2,
              pointRadius: 2,
            },
            {
              label: "Неактивные",
              data: mk("inactiveUsers"),
              borderColor: COLOR_INACTIVE,
              backgroundColor: `${COLOR_INACTIVE}33`,
              tension: 0.2,
              pointRadius: 2,
            },
          ],
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          interaction: { mode: "index", intersect: false },
          scales: {
            x: {
              ticks: { color: textColor, maxRotation: 45, minRotation: 0 },
              grid: { color: `${gridColor}40` },
            },
            y: {
              ticks: { color: textColor, precision: 0 },
              grid: { color: `${gridColor}40` },
              beginAtZero: true,
            },
          },
          plugins: {
            legend: {
              position: "bottom",
              labels: { color: textColor, boxWidth: 12 },
            },
            tooltip: {
              callbacks: {
                title(items) {
                  const i = items[0]?.dataIndex ?? 0;
                  const iso = series.value[i]?.date;
                  return iso ? formatDdMon(iso) : "";
                },
              },
            },
          },
        },
      } as ChartConfiguration);
    }

    onMounted(() => {
      void load().then(() => initChart());
    });

    onUnmounted(destroyChart);

    watch(
      () => series.value,
      () => {
        destroyChart();
        initChart();
      },
      { deep: true }
    );

    async function applyRange() {
      await load();
      destroyChart();
      initChart();
    }

    return {
      canvasRef,
      loading,
      error,
      current,
      series,
      fromDate,
      toDate,
      applyRange,
    };
  },
});
