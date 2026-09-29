<template>
  <el-drawer
    :model-value="theme.settingsVisible"
    @update:model-value="theme.closeSettings()"
    title="主题背景"
    direction="rtl"
    size="380px"
  >
    <div class="theme-settings">
      <!-- 背景类型 -->
      <el-radio-group v-model="activeTab" class="type-tabs">
        <el-radio-button value="preset">预设</el-radio-button>
        <el-radio-button value="solid">纯色</el-radio-button>
        <el-radio-button value="gradient">渐变</el-radio-button>
        <el-radio-button value="image">图片</el-radio-button>
      </el-radio-group>

      <!-- 预设主题 -->
      <div v-if="activeTab === 'preset'" class="section">
        <p class="section-title">一键风格</p>
        <div class="preset-grid">
          <div
            v-for="p in PRESETS"
            :key="p.key"
            class="preset-item"
            :class="{ active: theme.config.presetKey === p.key && theme.config.type === 'preset' }"
            @click="theme.applyPreset(p.key)"
          >
            <div class="preset-swatch" :style="{ background: `linear-gradient(135deg, ${p.swatch[0]}, ${p.swatch[1]})` }"></div>
            <span class="preset-name">{{ p.name }}</span>
          </div>
        </div>
      </div>

      <!-- 纯色 -->
      <div v-else-if="activeTab === 'solid'" class="section">
        <p class="section-title">选择颜色</p>
        <div class="color-row">
          <el-color-picker :model-value="theme.config.solidColor" @change="onSolid" />
          <span class="color-value">{{ theme.config.solidColor }}</span>
        </div>
      </div>

      <!-- 渐变 -->
      <div v-else-if="activeTab === 'gradient'" class="section">
        <p class="section-title">渐变颜色</p>
        <div class="color-row">
          <el-color-picker :model-value="theme.config.gradientFrom" @change="(v) => theme.update({ type: 'gradient', gradientFrom: v })" />
          <el-color-picker :model-value="theme.config.gradientTo" @change="(v) => theme.update({ type: 'gradient', gradientTo: v })" />
        </div>
        <p class="section-title">角度：{{ theme.config.gradientAngle }}°</p>
        <el-slider v-model="theme.config.gradientAngle" :min="0" :max="360" @input="(v) => theme.update({ type: 'gradient', gradientAngle: v })" />
      </div>

      <!-- 图片 -->
      <div v-else class="section">
        <p class="section-title">图片地址</p>
        <el-input
          :model-value="theme.config.imageUrl"
          placeholder="粘贴图片 URL，或上传本地图片"
          @input="onImageUrl"
          clearable
        />
        <div class="upload-row">
          <el-upload
            :show-file-list="false"
            :auto-upload="false"
            accept="image/*"
            :on-change="onUpload"
          >
            <el-button>上传本地图片</el-button>
          </el-upload>
          <el-button v-if="theme.config.imageUrl" text type="danger" @click="theme.update({ imageUrl: '' })">清除</el-button>
        </div>
        <p v-if="imageError" class="error-tip">图片加载失败，请检查地址或换一张</p>

        <template v-if="theme.config.imageUrl">
          <p class="section-title">透明度</p>
          <el-slider v-model="theme.config.imageOpacity" :min="0.2" :max="1" :step="0.05" />
          <p class="section-title">模糊：{{ theme.config.imageBlur }}px</p>
          <el-slider v-model="theme.config.imageBlur" :min="0" :max="20" />
          <p class="section-title">填充方式</p>
          <el-radio-group v-model="theme.config.imageFit" @change="(v) => theme.update({ imageFit: v })">
            <el-radio value="cover">覆盖</el-radio>
            <el-radio value="contain">完整</el-radio>
            <el-radio value="tile">平铺</el-radio>
            <el-radio value="center">居中</el-radio>
          </el-radio-group>
        </template>
      </div>

      <!-- 已保存的自定义主题 -->
      <div v-if="theme.config.customThemes.length" class="section">
        <p class="section-title">我的主题</p>
        <div
          v-for="t in theme.config.customThemes"
          :key="t.name"
          class="custom-item"
        >
          <span class="custom-name" @click="theme.applyCustomTheme(t)">{{ t.name }}</span>
          <el-button text type="danger" size="small" @click="removeCustom(t.name)">删除</el-button>
        </div>
      </div>

      <!-- 操作 -->
      <div class="actions">
        <el-button @click="saveAs">保存当前为主题</el-button>
        <el-button @click="theme.reset()">恢复默认</el-button>
      </div>
    </div>
  </el-drawer>
</template>

<script setup>
import { ref } from 'vue'
import { ElMessage } from 'element-plus'
import { useThemeStore, PRESETS } from '@/stores/theme'

const theme = useThemeStore()
const activeTab = ref(theme.config.type === 'preset' ? 'preset' : theme.config.type)
const imageError = ref(false)

// 切 tab 时同步到配置类型
const syncType = (type) => {
  if (type !== 'preset') theme.update({ type })
}

const onSolid = (v) => theme.update({ type: 'solid', solidColor: v })

const onImageUrl = (v) => {
  imageError.value = false
  theme.update({ type: 'image', imageUrl: v })
}

const onUpload = (file) => {
  const reader = new FileReader()
  reader.onload = (e) => {
    imageError.value = false
    theme.update({ type: 'image', imageUrl: e.target.result })
  }
  reader.readAsDataURL(file.raw)
}

const saveAs = () => {
  const name = prompt('给这个主题起个名字：')
  if (!name) return
  theme.saveCustomTheme(name.trim())
  ElMessage.success('已保存')
}

const removeCustom = (name) => {
  theme.config.customThemes = theme.config.customThemes.filter((x) => x.name !== name)
}

// 监听图片加载失败（通过全局事件或简单提示）
window.addEventListener('error', (e) => {
  if (e.target && e.target.tagName === 'IMG') imageError.value = true
}, true)
</script>

<style lang="scss" scoped>
.theme-settings {
  padding: 0 4px;

  .type-tabs {
    margin-bottom: 20px;
  }

  .section {
    margin-bottom: 24px;
  }

  .section-title {
    font-size: 13px;
    color: var(--text-2);
    margin: 0 0 10px;
    font-weight: 500;
  }

  .preset-grid {
    display: grid;
    grid-template-columns: repeat(2, 1fr);
    gap: 12px;
  }

  .preset-item {
    cursor: pointer;
    border-radius: var(--radius-md);
    overflow: hidden;
    border: 2px solid transparent;
    transition: all 0.2s;

    &.active {
      border-color: var(--brand);
    }

    .preset-swatch {
      height: 60px;
    }

    .preset-name {
      display: block;
      text-align: center;
      font-size: 12px;
      padding: 6px 0;
      color: var(--text-2);
    }
  }

  .color-row {
    display: flex;
    align-items: center;
    gap: 12px;
  }

  .color-value {
    font-size: 13px;
    color: var(--text-3);
  }

  .upload-row {
    margin-top: 10px;
    display: flex;
    align-items: center;
    gap: 8px;
  }

  .error-tip {
    margin-top: 8px;
    font-size: 12px;
    color: #d96c5a;
  }

  .custom-item {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 8px 12px;
    border-radius: var(--radius-sm);
    background: var(--bg-soft);
    margin-bottom: 8px;

    .custom-name {
      cursor: pointer;
      font-size: 14px;
      color: var(--text-1);
    }
  }

  .actions {
    margin-top: 24px;
    display: flex;
    gap: 12px;
  }
}
</style>
