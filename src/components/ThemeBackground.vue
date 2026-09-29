<template>
  <div class="theme-bg" :class="{ 'is-dark': config.dark }">
    <!-- 背景层本体 -->
    <div class="theme-bg-layer" :style="layerStyle"></div>
    <!-- 图片模式下的可读性罩层：在背景上盖一层半透明白，保证文字可读 -->
    <div v-if="config.type === 'image'" class="theme-bg-readability"></div>
  </div>
</template>

<script setup>
import { computed } from 'vue'
import { useThemeStore } from '@/stores/theme'

const theme = useThemeStore()
const config = computed(() => theme.config)

const layerStyle = computed(() => {
  const c = config.value
  const base = { position: 'absolute', inset: 0, transition: 'opacity 0.3s ease' }

  if (c.type === 'solid') {
    return { ...base, background: c.solidColor }
  }

  if (c.type === 'gradient') {
    return { ...base, background: `linear-gradient(${c.gradientAngle}deg, ${c.gradientFrom}, ${c.gradientTo})` }
  }

  if (c.type === 'image' && c.imageUrl) {
    const fitMap = {
      cover: 'cover',
      contain: 'contain',
      center: 'center',
      tile: 'repeat',
    }
    const sizeMap = {
      cover: 'cover',
      contain: 'contain',
      center: 'auto',
      tile: 'auto',
    }
    return {
      ...base,
      backgroundImage: `url("${c.imageUrl}")`,
      backgroundRepeat: fitMap[c.imageFit] || 'cover',
      backgroundSize: sizeMap[c.imageFit] || 'cover',
      backgroundPosition: 'center',
      filter: c.imageBlur ? `blur(${c.imageBlur}px)` : 'none',
      opacity: c.imageOpacity,
    }
  }

  // preset：根据预设 key 落到对应样式
  return { ...base, background: c.solidColor || '#f4f7f6' }
})
</script>

<style lang="scss" scoped>
.theme-bg {
  position: fixed;
  inset: 0;
  /* 用负 z-index：在 #app 的 stacking context 内，位于所有路由内容之下 */
  z-index: -1;
  overflow: hidden;
  pointer-events: none;

  .theme-bg-layer {
    position: absolute;
    inset: 0;
  }

  /* 图片背景上的半透明白罩层，保证白色卡片与文字可读 */
  .theme-bg-readability {
    position: absolute;
    inset: 0;
    background: rgba(255, 255, 255, 0.55);
  }

  &.is-dark .theme-bg-readability {
    background: rgba(20, 30, 40, 0.55);
  }
}
</style>
