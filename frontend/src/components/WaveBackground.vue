<script setup lang="ts">
import { ref, onMounted, onUnmounted } from 'vue'

const canvasRef = ref<HTMLCanvasElement>()

let ctx: CanvasRenderingContext2D
let W: number
let H: number
let time = 0
let rafId = 0

function resize() {
  const dpr = Math.min(window.devicePixelRatio || 1, 2)
  W = window.innerWidth
  H = window.innerHeight
  const canvas = canvasRef.value!
  canvas.width = W * dpr
  canvas.height = H * dpr
  canvas.style.width = W + 'px'
  canvas.style.height = H + 'px'
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
}

const waveLayers = [
  {
    baseY: 0.38, amp: 25, freq: 0.003, speed: 0.025,
    color1: '#4688b4', color2: '#6aadd4',
    harmonics: [
      { ampRatio: 0.6, freqRatio: 2.3, speedRatio: 0.35, phase: 0.8 },
      { ampRatio: 0.3, freqRatio: 4.1, speedRatio: 0.5, phase: 2.4 },
    ]
  },
  {
    baseY: 0.44, amp: 35, freq: 0.0025, speed: 0.035,
    color1: '#6aadd4', color2: '#8cc6e6',
    harmonics: [
      { ampRatio: 0.5, freqRatio: 1.8, speedRatio: 0.4, phase: 1.2 },
      { ampRatio: 0.35, freqRatio: 3.5, speedRatio: 0.55, phase: 3.8 },
      { ampRatio: 0.15, freqRatio: 6.0, speedRatio: 0.75, phase: 5.1 },
    ]
  },
  {
    baseY: 0.52, amp: 45, freq: 0.002, speed: 0.05,
    color1: '#8cc6e6', color2: '#aad8f0',
    harmonics: [
      { ampRatio: 0.55, freqRatio: 2.0, speedRatio: 0.33, phase: 0.5 },
      { ampRatio: 0.3, freqRatio: 3.8, speedRatio: 0.5, phase: 2.9 },
      { ampRatio: 0.18, freqRatio: 5.5, speedRatio: 0.7, phase: 4.3 },
    ]
  },
  {
    baseY: 0.60, amp: 55, freq: 0.0018, speed: 0.065,
    color1: '#b8e0f0', color2: '#d4ecf8',
    harmonics: [
      { ampRatio: 0.5, freqRatio: 1.7, speedRatio: 0.3, phase: 1.8 },
      { ampRatio: 0.35, freqRatio: 3.2, speedRatio: 0.48, phase: 3.5 },
      { ampRatio: 0.2, freqRatio: 5.0, speedRatio: 0.65, phase: 0.9 },
    ]
  },
  {
    baseY: 0.70, amp: 60, freq: 0.0015, speed: 0.08,
    color1: '#e0f2fa', color2: '#ecf6fc',
    harmonics: [
      { ampRatio: 0.45, freqRatio: 1.6, speedRatio: 0.28, phase: 2.2 },
      { ampRatio: 0.3, freqRatio: 3.0, speedRatio: 0.45, phase: 4.7 },
      { ampRatio: 0.2, freqRatio: 4.8, speedRatio: 0.63, phase: 1.3 },
      { ampRatio: 0.1, freqRatio: 7.5, speedRatio: 0.88, phase: 3.0 },
    ]
  },
  {
    baseY: 0.80, amp: 65, freq: 0.0012, speed: 0.095,
    color1: '#f4fafe', color2: '#fafcff',
    harmonics: [
      { ampRatio: 0.4, freqRatio: 1.5, speedRatio: 0.25, phase: 0.3 },
      { ampRatio: 0.28, freqRatio: 2.8, speedRatio: 0.43, phase: 5.5 },
      { ampRatio: 0.18, freqRatio: 4.5, speedRatio: 0.6, phase: 2.0 },
    ]
  },
]

function getWaveY(layer: typeof waveLayers[number], x: number, t: number) {
  let y = layer.baseY * H
  y += layer.amp * Math.sin(x * layer.freq + t * layer.speed)
  for (const h of layer.harmonics) {
    y += layer.amp * h.ampRatio *
      Math.sin(x * layer.freq * h.freqRatio + t * layer.speed * h.speedRatio + h.phase)
  }
  return y
}

function drawSky() {
  const grad = ctx.createLinearGradient(0, 0, 0, H * 0.5)
  grad.addColorStop(0, '#ffffff')
  grad.addColorStop(0.2, '#f0f8fc')
  grad.addColorStop(0.5, '#c8e4f2')
  grad.addColorStop(1, '#b0d4e8')
  ctx.fillStyle = grad
  ctx.fillRect(0, 0, W, H * 0.55)
}

function drawFoam(layer: typeof waveLayers[number], t: number) {
  if (layer === waveLayers[0]) return
  ctx.save()
  ctx.globalAlpha = 0.2 + (layer.baseY - 0.35) * 0.25
  ctx.strokeStyle = 'rgba(255, 255, 255, 0.8)'
  ctx.lineWidth = 1.5
  ctx.beginPath()
  for (let x = 0; x <= W; x += 3) {
    const y = getWaveY(layer, x, t) - 1
    if (x === 0) ctx.moveTo(x, y)
    else ctx.lineTo(x, y)
  }
  ctx.stroke()
  ctx.restore()
}

function drawWaveLayer(layer: typeof waveLayers[number], t: number) {
  ctx.beginPath()
  ctx.moveTo(0, H)

  const step = 2
  for (let x = 0; x <= W; x += step) {
    const y = getWaveY(layer, x, t)
    ctx.lineTo(x, y)
  }
  ctx.lineTo(W, H)
  ctx.closePath()

  const gradTop = layer.baseY * H - layer.amp * 1.5
  const grad = ctx.createLinearGradient(0, gradTop, 0, H)
  grad.addColorStop(0, layer.color1)
  grad.addColorStop(1, layer.color2)
  ctx.fillStyle = grad
  ctx.fill()

  drawFoam(layer, t)
}

function drawLightSpots(t: number) {
  ctx.save()
  const spots = [
    { cx: 0.2, cy: 0.55, r: 100, speed: 0.03, phase: 0 },
    { cx: 0.45, cy: 0.62, r: 130, speed: 0.025, phase: 1.5 },
    { cx: 0.7, cy: 0.50, r: 90, speed: 0.035, phase: 3.0 },
    { cx: 0.85, cy: 0.65, r: 110, speed: 0.02, phase: 4.5 },
    { cx: 0.35, cy: 0.72, r: 80, speed: 0.025, phase: 2.2 },
  ]
  for (const s of spots) {
    const ox = Math.sin(t * s.speed + s.phase) * 30
    const oy = Math.cos(t * s.speed * 0.7 + s.phase) * 15
    const alpha = 0.12 + 0.07 * Math.sin(t * 0.08 + s.phase)
    const grad = ctx.createRadialGradient(
      s.cx * W + ox, s.cy * H + oy, 0,
      s.cx * W + ox, s.cy * H + oy, s.r
    )
    grad.addColorStop(0, `rgba(255, 255, 255, ${alpha})`)
    grad.addColorStop(1, 'rgba(255, 255, 255, 0)')
    ctx.fillStyle = grad
    ctx.fillRect(
      s.cx * W + ox - s.r, s.cy * H + oy - s.r,
      s.r * 2, s.r * 2
    )
  }
  ctx.restore()
}

function drawDeepWater() {
  const grad = ctx.createLinearGradient(0, H * 0.7, 0, H)
  grad.addColorStop(0, 'rgba(120, 178, 210, 0)')
  grad.addColorStop(1, 'rgba(80, 150, 192, 0.4)')
  ctx.fillStyle = grad
  ctx.fillRect(0, H * 0.7, W, H * 0.3)
}

function animate() {
  time += 0.5
  ctx.clearRect(0, 0, W, H)

  drawSky()
  for (const layer of waveLayers) {
    drawWaveLayer(layer, time)
  }
  drawLightSpots(time)
  drawDeepWater()

  rafId = requestAnimationFrame(animate)
}

onMounted(() => {
  ctx = canvasRef.value!.getContext('2d')!
  resize()
  window.addEventListener('resize', resize)
  animate()
})

onUnmounted(() => {
  window.removeEventListener('resize', resize)
  cancelAnimationFrame(rafId)
})
</script>

<template>
  <canvas id="ocean" ref="canvasRef" aria-hidden="true"></canvas>
  <div class="glass-layer glass-primary"></div>
  <div class="glass-layer glass-texture"></div>
  <div class="glass-layer glass-vignette"></div>
  <div class="glass-layer glass-toplight"></div>
</template>

<style scoped>
canvas#ocean {
  position: fixed;
  inset: 0;
  width: 100%;
  height: 100%;
  z-index: 1;
}

.glass-layer {
  position: fixed;
  inset: 0;
  z-index: 2;
  pointer-events: none;
}

.glass-primary {
  backdrop-filter: blur(6px) saturate(1.2) brightness(1.02);
  -webkit-backdrop-filter: blur(6px) saturate(1.2) brightness(1.02);
  will-change: backdrop-filter;
  background:
    radial-gradient(ellipse 120% 80% at 50% 100%, rgba(80, 150, 200, 0.12), transparent 70%),
    radial-gradient(ellipse 80% 40% at 30% 20%, rgba(255, 255, 255, 0.15), transparent 60%),
    linear-gradient(180deg, rgba(255, 255, 255, 0.12) 0%, rgba(160, 200, 230, 0.08) 100%);
}

.glass-texture {
  opacity: 0.5;
  background-image: url("data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)' opacity='0.04'/%3E%3C/svg%3E");
  background-size: 200px 200px;
}

.glass-vignette {
  background:
    radial-gradient(ellipse 70% 60% at 50% 55%, transparent 0%, rgba(100, 165, 200, 0.3) 100%),
    radial-gradient(ellipse 50% 30% at 50% 60%, rgba(255, 255, 255, 0.15), transparent 70%);
  animation: breathe 30s ease-in-out infinite;
}

.glass-toplight {
  background: linear-gradient(180deg, rgba(255, 255, 255, 0.12) 0%, transparent 30%);
}

@keyframes breathe {
  0%, 100% { opacity: 1; }
  50% { opacity: 0.7; }
}

@media (prefers-reduced-motion: reduce) {
  .glass-vignette { animation: none; }
}
</style>
