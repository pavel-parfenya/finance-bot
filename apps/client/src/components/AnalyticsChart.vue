<script setup lang="ts">
import { ref, onMounted, onUnmounted, watch } from "vue";
import {
  Chart,
  DoughnutController,
  ArcElement,
  Legend,
  Tooltip,
  type ChartConfiguration,
} from "chart.js";

Chart.register(DoughnutController, ArcElement, Legend, Tooltip);

const props = defineProps<{
  labels: string[];
  data: number[];
}>();

const canvasRef = ref<HTMLCanvasElement | null>(null);
let chartInst: Chart | null = null;

const COLORS = [
  "#58a6ff",
  "#3fb950",
  "#d29922",
  "#db61a2",
  "#bc8cff",
  "#79c0ff",
  "#a371f7",
  "#f85149",
];

function initChart() {
  if (!canvasRef.value || props.data.length === 0) return;
  const ctx = canvasRef.value.getContext("2d");
  if (!ctx) return;
  const textColor =
    getComputedStyle(document.body).getPropertyValue("--tg-theme-text-color") ||
    "#e6edf3";
  chartInst = new Chart(ctx, {
    type: "doughnut",
    data: {
      labels: props.labels,
      datasets: [
        {
          data: props.data,
          backgroundColor: COLORS,
        },
      ],
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: { position: "bottom", labels: { color: textColor } },
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
  () => [props.labels, props.data],
  () => {
    destroyChart();
    initChart();
  },
  { deep: true }
);
</script>

<template>
  <div class="chart-wrap">
    <canvas ref="canvasRef"></canvas>
  </div>
</template>

<style scoped>
.chart-wrap {
  position: relative;
  height: 260px;
  margin-bottom: 24px;
}
</style>
