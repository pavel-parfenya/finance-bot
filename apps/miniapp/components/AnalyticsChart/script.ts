import { defineComponent, ref, onMounted, onUnmounted, watch } from "vue";
import {
  Chart,
  DoughnutController,
  ArcElement,
  Legend,
  Tooltip,
  type ChartConfiguration,
} from "chart.js";

Chart.register(DoughnutController, ArcElement, Legend, Tooltip);

const REMAINDER_LABEL = "Остаток";

/* Категориальная палитра (валидирована скилом dataviz: CVD-safe и по контрасту
   на обеих поверхностях). Порядок слотов — механизм CVD-безопасности, не косметика:
   blue, green, magenta, yellow, aqua, orange, violet, red. Отдельные наборы под
   тему, т.к. тёмные шаги подобраны под тёмную поверхность. */
const CATEGORY_COLORS_LIGHT = [
  "#2a78d6",
  "#008300",
  "#e87ba4",
  "#eda100",
  "#1baf7a",
  "#eb6834",
  "#4a3aa7",
  "#e34948",
];

const CATEGORY_COLORS_DARK = [
  "#3987e5",
  "#008300",
  "#d55181",
  "#c98500",
  "#199e70",
  "#d95926",
  "#9085e9",
  "#e66767",
];

const DISABLED_COLOR = "#8b8fa8";

function isDarkTheme(): boolean {
  const attr = document.documentElement.dataset.theme;
  if (attr === "dark") return true;
  if (attr === "light") return false;
  return window.matchMedia?.("(prefers-color-scheme: dark)").matches ?? false;
}

/** Значение CSS-переменной темы с фолбэком. */
function themeVar(name: string, fallback: string): string {
  const v = getComputedStyle(document.documentElement).getPropertyValue(name).trim();
  return v || fallback;
}

function createLegendCircle(color: string, disabled = false): HTMLCanvasElement {
  const size = 12;
  const canvas = document.createElement("canvas");
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext("2d");
  if (!ctx) return canvas;
  ctx.beginPath();
  ctx.arc(size / 2, size / 2, size / 2 - 0.5, 0, 2 * Math.PI);
  ctx.fillStyle = disabled ? DISABLED_COLOR : color;
  ctx.globalAlpha = disabled ? 0.5 : 1;
  ctx.fill();
  ctx.globalAlpha = 1;
  return canvas;
}

export interface ChartItem {
  category: string;
  value: number;
}

export default defineComponent({
  props: {
    items: { type: Array as () => ChartItem[], required: true },
    formatAsPercent: { type: Boolean, default: false },
    /** Секторы (кроме «Остаток») кликабельны — для перехода в траты. */
    interactive: { type: Boolean, default: false },
  },
  emits: ["segment-click"],
  setup(props, { emit }) {
    const canvasRef = ref<HTMLCanvasElement | null>(null);
    let chartInst: Chart | null = null;

    function formatValue(value: number): string {
      return props.formatAsPercent ? value.toFixed(1) + "%" : String(value);
    }

    function resolveColors(items: ChartItem[]): { bg: string[]; solid: string[] } {
      const palette = isDarkTheme() ? CATEGORY_COLORS_DARK : CATEGORY_COLORS_LIGHT;
      const remainderColor = themeVar("--income", "#12924a");
      const bg: string[] = [];
      const solid: string[] = [];
      let colorIdx = 0;

      for (const item of items) {
        if (item.category === REMAINDER_LABEL) {
          bg.push(remainderColor);
          solid.push(remainderColor);
        } else {
          const c = palette[colorIdx % palette.length] as string;
          colorIdx++;
          bg.push(c);
          solid.push(c);
        }
      }
      return { bg, solid };
    }

    function initChart() {
      if (!canvasRef.value || props.items.length === 0) return;
      const ctx = canvasRef.value.getContext("2d");
      if (!ctx) return;

      const textColor = themeVar("--text", "#111");
      const mutedColor = themeVar("--text-muted", "#888");
      // Разделители дуг = цвет поверхности карточки (2px «зазор» по спецификации марок).
      const surfaceColor = themeVar("--surface", "#fff");

      const labels = props.items.map((x) => x.category);
      const data = props.items.map((x) => x.value);
      const { bg, solid } = resolveColors(props.items);

      const remainderIdx = labels.indexOf(REMAINDER_LABEL);
      const borderWidths = labels.map((_, i) => (i === remainderIdx ? 4 : 2));
      const borderColors = labels.map((_, i) =>
        i === remainderIdx ? mutedColor : surfaceColor
      );

      chartInst = new Chart(ctx, {
        type: "doughnut",
        data: {
          labels,
          datasets: [
            {
              data,
              backgroundColor: bg,
              borderWidth: borderWidths,
              borderColor: borderColors,
              hoverBorderWidth: remainderIdx >= 0 ? 5 : 2,
            },
          ],
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          onClick: props.interactive
            ? (_evt, elements) => {
                const el = elements[0];
                if (!el) return;
                const idx = el.index;
                const label = labels[idx];
                if (typeof label !== "string" || label === REMAINDER_LABEL) return;
                emit("segment-click", label);
              }
            : undefined,
          plugins: {
            legend: {
              position: "bottom",
              labels: {
                color: textColor,
                usePointStyle: true,
                generateLabels(chart) {
                  const dataset = chart.data.datasets?.[0];
                  if (!dataset) return [];
                  const values = dataset.data as number[];
                  const meta = chart.getDatasetMeta(0);
                  return (chart.data.labels as string[]).map((label, i) => {
                    const value = values[i] ?? 0;
                    const hidden = meta?.data[i]?.hidden ?? false;
                    const color = solid[i] ?? "#888";
                    return {
                      text: props.formatAsPercent
                        ? `${label}: ${value.toFixed(1)}%`
                        : `${label}: ${formatValue(value)}`,
                      fillStyle: hidden ? DISABLED_COLOR : color,
                      fontColor: hidden ? DISABLED_COLOR : textColor,
                      pointStyle: createLegendCircle(color, hidden),
                      hidden,
                      index: i,
                    };
                  });
                },
              },
            },
            tooltip: {
              callbacks: {
                label(ctx) {
                  const value = ctx.raw as number;
                  const total = (ctx.dataset.data as number[]).reduce((a, b) => a + b, 0);
                  const pct = total > 0 ? ((value / total) * 100).toFixed(1) : "0";
                  return props.formatAsPercent
                    ? `${ctx.label}: ${value.toFixed(1)}%`
                    : `${ctx.label}: ${formatValue(value)} (${pct}%)`;
                },
              },
            },
          },
        },
      } as ChartConfiguration);
    }

    function destroyChart() {
      if (chartInst) {
        chartInst.destroy();
        chartInst = null;
      }
    }

    // Перерисовка при смене темы: цвета берутся из токенов на момент init.
    let themeObserver: MutationObserver | null = null;

    onMounted(() => {
      initChart();
      themeObserver = new MutationObserver(() => {
        destroyChart();
        initChart();
      });
      themeObserver.observe(document.documentElement, {
        attributes: true,
        attributeFilter: ["data-theme"],
      });
    });

    onUnmounted(() => {
      themeObserver?.disconnect();
      themeObserver = null;
      destroyChart();
    });

    watch(
      () => [props.items, props.formatAsPercent, props.interactive],
      () => {
        destroyChart();
        initChart();
      },
      { deep: true }
    );

    return { canvasRef };
  },
});
