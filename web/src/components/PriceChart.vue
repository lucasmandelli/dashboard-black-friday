<script setup lang="ts">
import {
  Chart,
  Legend,
  LinearScale,
  LineElement,
  PointElement,
  Tooltip,
  type ChartData,
  type ChartOptions,
} from 'chart.js'
import { computed, onBeforeUnmount, onMounted, ref } from 'vue'
import { Line } from 'vue-chartjs'
import { dayLabel, money, when } from '../lib/format'
import type { Link, Snapshot } from '../types'

Chart.register(LineElement, PointElement, LinearScale, Tooltip, Legend)

const props = defineProps<{ links: Link[]; snapshots: Snapshot[]; target: number | null }>()

// Lê os tokens CSS para o gráfico acompanhar o modo claro/escuro.
const theme = ref(readTheme())
let media: MediaQueryList | null = null
const onScheme = () => (theme.value = readTheme())
onMounted(() => {
  media = window.matchMedia('(prefers-color-scheme: dark)')
  media.addEventListener('change', onScheme)
})
onBeforeUnmount(() => media?.removeEventListener('change', onScheme))

function readTheme() {
  const css = getComputedStyle(document.documentElement)
  const v = (name: string) => css.getPropertyValue(name).trim()
  return {
    series: Array.from({ length: 8 }, (_, i) => v(`--series-${i + 1}`)),
    surface: v('--surface'),
    ink: v('--ink'),
    ink2: v('--ink-2'),
    muted: v('--muted'),
    grid: v('--grid'),
    axis: v('--axis'),
    good: v('--good'),
  }
}

interface SeriesMeta {
  link: Link
  color: string
}

const series = computed<SeriesMeta[]>(() =>
  // A cor segue o link (ordem fixa de cadastro), nunca o ranking de preço.
  props.links.map((link, i) => ({ link, color: theme.value.series[i % 8] })),
)

const data = computed<ChartData<'line', { x: number; y: number }[]>>(() => {
  const datasets = series.value.map(({ link, color }) => ({
    label: link.store,
    data: props.snapshots
      .filter((s) => s.link_id === link.id)
      .map((s) => ({ x: Date.parse(s.captured_at), y: s.price })),
    borderColor: color,
    backgroundColor: color,
    borderWidth: 2,
    pointRadius: 0,
    pointHoverRadius: 5,
    pointHoverBorderWidth: 2,
    pointHoverBorderColor: theme.value.surface,
    stepped: 'before' as const,
  }))
  if (props.target != null && props.snapshots.length) {
    datasets.push({
      label: 'Alvo',
      data: [
        { x: xRange.value.min, y: props.target },
        { x: xRange.value.max, y: props.target },
      ],
      borderColor: theme.value.good,
      backgroundColor: theme.value.good,
      borderWidth: 1.5,
      pointRadius: 0,
      pointHoverRadius: 0,
      pointHoverBorderWidth: 0,
      pointHoverBorderColor: theme.value.good,
      stepped: 'before' as const,
      borderDash: [4, 4],
    } as never)
  }
  return { datasets }
})

const xRange = computed(() => {
  const xs = props.snapshots.map((s) => Date.parse(s.captured_at))
  return { min: Math.min(...xs), max: Math.max(...xs) }
})

const options = computed<ChartOptions<'line'>>(() => {
  const t = theme.value
  return {
    responsive: true,
    maintainAspectRatio: false,
    animation: false,
    parsing: false,
    interaction: { mode: 'nearest', axis: 'x', intersect: false },
    scales: {
      x: {
        type: 'linear',
        min: xRange.value.min,
        max: xRange.value.max,
        grid: { display: false },
        border: { color: t.axis },
        ticks: { color: t.muted, maxTicksLimit: 7, callback: (v) => dayLabel(Number(v)) },
      },
      y: {
        grid: { color: t.grid },
        border: { display: false },
        ticks: { color: t.muted, maxTicksLimit: 6, callback: (v) => money(Number(v)) },
        grace: '5%',
      },
    },
    plugins: {
      legend: {
        position: 'top',
        align: 'start',
        labels: { color: t.ink2, usePointStyle: true, pointStyle: 'line', boxWidth: 18 },
      },
      tooltip: {
        backgroundColor: t.surface,
        titleColor: t.ink,
        bodyColor: t.ink2,
        borderColor: t.axis,
        borderWidth: 1,
        padding: 10,
        usePointStyle: true,
        filter: (item) => item.dataset.label !== 'Alvo',
        callbacks: {
          title: (items) => (items[0] ? when(new Date(items[0].parsed.x as number).toISOString()) : ''),
          label: (item) => ` ${item.dataset.label}: ${money(item.parsed.y as number)}`,
        },
      },
    },
  }
})
</script>

<template>
  <div class="relative h-80">
    <Line :data="data" :options="options" aria-label="Histórico de preços por loja" role="img" />
  </div>
</template>
