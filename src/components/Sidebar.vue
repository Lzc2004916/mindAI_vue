<template>
  <el-aside :width="isCollapse ? '68px' : '240px'" class="sidebar-aside">
    <el-menu
      :collapse-transition="false"
      :default-active="route.path"
      class="menu-style"
      :collapse="isCollapse"
      router
    >
      <div class="brand">
        <div class="brand-mark">聆</div>
        <transition name="brand-fade">
          <div class="info-card" v-show="!isCollapse">
            <h1 class="brand-title">聪聆</h1>
            <p class="brand-subtitle">管理后台</p>
          </div>
        </transition>
      </div>
        <el-menu-item v-for="item in menuList" :key="item.path" :index="item.path">
          <el-icon><component :is="item.icon"></component></el-icon>
          <span>{{ item.title }}</span>
        </el-menu-item>
      </el-menu>
  </el-aside>
</template>

<script setup>
import { computed } from 'vue'
import { useRoute } from 'vue-router'
import { useAdminStore } from '@/stores/admin'

const route = useRoute()
const adminStore = useAdminStore()
const isCollapse = computed(() => adminStore.isCollapse)

const menuList = [
  { path: '/back/dashboard', title: '数据概览', icon: 'PieChart' },
  { path: '/back/knowledge', title: '知识文章', icon: 'ChatLineRound' },
  { path: '/back/consultations', title: '咨询记录', icon: 'Message' },
  { path: '/back/emotional', title: '情感日志', icon: 'Notebook' },
  { path: '/back/users', title: '用户管理', icon: 'UserFilled' }
]
</script>

<style lang="scss" scoped>
.sidebar-aside {
  transition: width 0.25s var(--ease-out, ease);
  overflow: hidden;
  background: var(--bg-card);
  border-right: 1px solid var(--border);
}
.brand-fade-enter-active,
.brand-fade-leave-active {
  transition: opacity 0.2s ease;
}
.brand-fade-enter-from,
.brand-fade-leave-to {
  opacity: 0;
}
.menu-style{
    height: 100%;
    border-right: none;
    background: transparent;
    padding: 12px 8px;

    :deep(.el-menu-item) {
      border-radius: var(--radius-md);
      margin-bottom: 4px;
      color: var(--text-2);
      font-size: 14px;
      height: 44px;
      line-height: 44px;

      &:hover {
        background: var(--brand-50);
        color: var(--brand);
      }

      &.is-active {
        background: var(--brand);
        color: #fff;
        font-weight: 500;
        box-shadow: 0 4px 12px rgba(15, 110, 86, 0.2);

        .el-icon {
          color: #fff;
        }
      }
    }
}
.brand {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 16px 16px 20px;
  height: var(--header-height, 60px);
  flex-shrink: 0;
  box-sizing: border-box;
}
.brand-mark {
  width: 36px;
  height: 36px;
  border-radius: 10px;
  background: var(--brand-grad-135);
  color: #fff;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 16px;
  font-weight: 600;
  flex-shrink: 0;
  box-shadow: 0 4px 10px rgba(15, 110, 86, 0.2);
}
.info-card {
  display: flex;
  flex-direction: column;
  white-space: nowrap;
}
.brand-title {
  font-size: 18px;
  font-weight: 700;
  color: var(--text-1);
  letter-spacing: 0.5px;
  line-height: 1.2;
}
.brand-subtitle {
  font-size: 12px;
  color: var(--text-3);
  margin-top: 2px;
}
</style>
