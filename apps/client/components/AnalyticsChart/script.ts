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
const REMAINDER_GREEN = "#22c55e";

const CATEGORY_COLORS = [
  "#3B82F6",
  "#F59E0B",
  "#8B5CF6",
  "#EC4899",
  "#06B6D4",
  "#F97316",
  "#14B8A6",
  "#A855F7",
  "#E11D48",
  "#0EA5E9",
];

const DISABLED_COLOR = "#64748b";

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
  },
  setup(props) {
    const canvasRef = ref<HTMLCanvasElement | null>(null);
    let chartInst: Chart | null = null;

    function formatValue(value: number): string {
      return props.formatAsPercent ? value.toFixed(1) + "%" : String(value);
    }

    function resolveColors(items: ChartItem[]): { bg: string[]; solid: string[] } {
      const bg: string[] = [];
      const solid: string[] = [];
      let colorIdx = 0;

      for (const item of items) {
        if (item.category === REMAINDER_LABEL) {
          bg.push(REMAINDER_GREEN);
          solid.push(REMAINDER_GREEN);
        } else {
          const c = CATEGORY_COLORS[colorIdx % CATEGORY_COLORS.length];
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

      const textColor =
        getComputedStyle(document.body).getPropertyValue("--tg-theme-text-color") ||
        "#e6edf3";

      const labels = props.items.map((x) => x.category);
      const data = props.items.map((x) => x.value);
      const { bg, solid } = resolveColors(props.items);

      const remainderIdx = labels.indexOf(REMAINDER_LABEL);
      const borderWidths = labels.map((_, i) => (i === remainderIdx ? 4 : 1));
      const borderColors = labels.map((_, i) =>
        i === remainderIdx ? "rgba(255,255,255,0.9)" : "rgba(255,255,255,0.2)"
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
                      fontColor: hidden ? "rgba(100,116,139,0.5)" : textColor,
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

    onMounted(() => initChart());
    onUnmounted(destroyChart);

    watch(
      () => [props.items, props.formatAsPercent],
      () => {
        destroyChart();
        initChart();
      },
      { deep: true }
    );

    return { canvasRef };
  },
});
