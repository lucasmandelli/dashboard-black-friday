<script setup lang="ts">
import { computed } from 'vue'
import type { DailyPoint } from '../lib/insights'

const props = defineProps<{ points: DailyPoint[]; target?: number | null }>()

const W = 240
const H = 48
const PAD = 4

const geometry = computed(() => {
  const pts = props.points
  if (pts.length < 2) return null
  const prices = pts.map((p) => p.price)
  if (props.target != null) prices.push(props.target)
  const min = Math.min(...prices)
  const max = Math.max(...prices)
  const span = max - min || 1
  const x0 = pts[0].day
  const xSpan = pts[pts.length - 1].day - x0 || 1
  const x = (d: number) => PAD + ((d - x0) / xSpan) * (W - PAD * 2)
  const y = (v: number) => PAD + (1 - (v - min) / span) * (H - PAD * 2)
  const last = pts[pts.length - 1]
  return {
    path: pts.map((p, i) => `${i ? 'L' : 'M'}${x(p.day).toFixed(1)},${y(p.price).toFixed(1)}`).join(''),
    lastX: x(last.day),
    lastY: y(last.price),
    targetY: props.target != null ? y(props.target) : null,
  }
})
</script>

<template>
  <svg v-if="geometry" :viewBox="`0 0 ${W} ${H}`" class="h-12 w-full" preserveAspectRatio="none" aria-hidden="true">
    <line
      v-if="geometry.targetY != null"
      :x1="0" :x2="W" :y1="geometry.targetY" :y2="geometry.targetY"
      stroke="var(--good)" stroke-width="1" stroke-dasharray="3 3" vector-effect="non-scaling-stroke" opacity="0.7"
    />
    <path :d="geometry.path" fill="none" stroke="var(--series-1)" stroke-width="2" stroke-linejoin="round" stroke-linecap="round" vector-effect="non-scaling-stroke" />
  </svg>
  <div v-else class="grid h-12 place-items-center text-xs text-muted">Histórico ainda sendo coletado</div>
</template>
