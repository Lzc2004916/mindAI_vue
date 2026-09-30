<template>
  <div class="route-page">
    <header class="route-page-header">
      <el-button text :icon="ArrowLeft" @click="goBack">返回</el-button>
      <h2 class="route-page-title">{{ title }}</h2>
      <div class="route-page-actions">
        <slot name="actions" />
      </div>
    </header>
    <main class="route-page-body">
      <slot />
    </main>
    <footer v-if="$slots.footer" class="route-page-footer">
      <slot name="footer" />
    </footer>
  </div>
</template>

<script setup>
import { useRouter } from 'vue-router'
import { ArrowLeft } from '@element-plus/icons-vue'

const props = defineProps({
  title: {
    type: String,
    default: ''
  },
  // 指定返回目标路径；不传则 router.back() 回上一页
  backTo: {
    type: String,
    default: ''
  }
})

const router = useRouter()
const goBack = () => {
  if (props.backTo) router.push(props.backTo)
  else router.back()
}
</script>

<style lang="scss" scoped>
.route-page {
  background: var(--bg-card, #ffffff);
  border: 1px solid var(--border, #e5e7eb);
  border-radius: var(--radius-lg, 12px);
  box-shadow: var(--shadow-card, 0 2px 12px rgba(0, 0, 0, 0.04));
  height: 100%;
  min-height: 100%;
  width: 100%;
  max-width: 1000px;
  margin: 0 auto;
  box-sizing: border-box;
  display: flex;
  flex-direction: column;

  .route-page-header {
    flex-shrink: 0;
    display: flex;
    align-items: center;
    gap: 12px;
    padding: 16px 20px;
    border-bottom: 1px solid var(--border, #e5e7eb);

    .route-page-title {
      position: relative;
      flex: 1;
      margin: 0;
      padding-left: 14px;
      font-size: 18px;
      font-weight: 600;
      color: var(--text-1, #1f2d29);

      &::before {
        content: '';
        position: absolute;
        left: 0;
        top: 50%;
        transform: translateY(-50%);
        width: 4px;
        height: 16px;
        border-radius: 2px;
        background: var(--brand-grad-135, linear-gradient(135deg, #1d9e75, #0f6e56));
      }
    }

    .route-page-actions {
      display: flex;
      gap: 8px;
    }
  }

  .route-page-body {
    flex: 1;
    min-height: 0;
    overflow-y: auto;
    padding: 20px;
  }

  .route-page-footer {
    flex-shrink: 0;
    padding: 16px 20px;
    border-top: 1px solid var(--border, #e5e7eb);
    display: flex;
    justify-content: flex-end;
    gap: 8px;
  }
}
</style>