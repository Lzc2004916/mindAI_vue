import { defineStore } from 'pinia'
import { ref, watch } from 'vue'

/**
 * 主题背景 store
 * - 配置持久化到 localStorage
 * - 预设主题一键切换
 * - 支持纯色 / 渐变 / 图片三种背景类型
 * - 自定义主题可保存复用
 */

const STORAGE_KEY = 'congling-theme'

export const PRESETS = [
  { key: 'default', name: '薄荷奶白', type: 'solid', solidColor: '#f4f7f6', swatch: ['#f4f7f6', '#0f6e56'] },
  { key: 'warm', name: '暖阳', type: 'gradient', gradientFrom: '#fff1e6', gradientTo: '#ffd0a8', angle: 135, swatch: ['#fff1e6', '#ffd0a8'] },
  { key: 'forest', name: '森林', type: 'gradient', gradientFrom: '#eef3ea', gradientTo: '#c2d8b8', angle: 135, swatch: ['#eef3ea', '#c2d8b8'] },
  { key: 'ocean', name: '深海', type: 'gradient', gradientFrom: '#e8f2f6', gradientTo: '#a8cbe0', angle: 135, swatch: ['#e8f2f6', '#a8cbe0'] },
  { key: 'night', name: '暗夜', type: 'solid', solidColor: '#1f2d3d', dark: true, swatch: ['#1f2d3d', '#3d5166'] },
]

const defaultConfig = {
  type: 'preset',          // preset | solid | gradient | image
  presetKey: 'default',
  solidColor: '#f4f7f6',
  gradientFrom: '#e1f5ee',
  gradientTo: '#a7d9c8',
  gradientAngle: 135,
  imageUrl: '',
  imageFit: 'cover',       // cover | contain | tile | center
  imageOpacity: 0.85,
  imageBlur: 0,
  dark: false,
  customThemes: [],
}

function load() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (raw) return { ...defaultConfig, ...JSON.parse(raw) }
  } catch (e) { /* 损坏配置回退默认 */ }
  return { ...defaultConfig }
}

export const useThemeStore = defineStore('theme', () => {
  const config = ref(load())
  const settingsVisible = ref(false)

  // 任何变更都写回 localStorage
  watch(config, (val) => {
    try { localStorage.setItem(STORAGE_KEY, JSON.stringify(val)) } catch (e) {}
  }, { deep: true })

  const applyPreset = (key) => {
    const p = PRESETS.find((x) => x.key === key)
    if (!p) return
    const next = { ...config.value, type: 'preset', presetKey: key, dark: !!p.dark }
    if (p.type === 'solid') {
      next.solidColor = p.solidColor
    } else {
      next.gradientFrom = p.gradientFrom
      next.gradientTo = p.gradientTo
      next.gradientAngle = p.angle || 135
    }
    config.value = next
  }

  const update = (patch) => {
    config.value = { ...config.value, ...patch }
  }

  const reset = () => {
    // 保留已保存的自定义主题
    config.value = { ...defaultConfig, customThemes: config.value.customThemes }
  }

  const openSettings = () => { settingsVisible.value = true }
  const closeSettings = () => { settingsVisible.value = false }

  const saveCustomTheme = (name) => {
    const item = { name, config: { ...config.value } }
    const list = config.value.customThemes.filter((x) => x.name !== name)
    list.push(item)
    config.value.customThemes = list
  }

  const applyCustomTheme = (item) => {
    config.value = JSON.parse(JSON.stringify(item.config))
  }

  return {
    config, settingsVisible,
    applyPreset, update, reset,
    openSettings, closeSettings,
    saveCustomTheme, applyCustomTheme,
  }
})
