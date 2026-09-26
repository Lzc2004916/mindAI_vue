<template>
  <el-aside :width="isCollapse ? '64px' : '264px'" class="sidebar-aside">
      <el-menu
        :collapse-transition="false"
        :default-active="route.path"
        class="menu-style"
        :collapse="isCollapse"
        router
      >
      <div class="brand">
        <el-image class="brand-image" :src="iconUrl" alt="logo /"></el-image>
        <transition name="brand-fade">
          <div class="info-card" v-show="!isCollapse">
            <h1 class="brand-title">心理健康AI助手</h1>
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
const iconUrl = new URL("@/assets/images/机器人.png", import.meta.url).href
const isCollapse = computed(() => adminStore.isCollapse)

/**
 * 菜单项显式声明（不再从 `router.options.routes[0].children` 动态取）。
 * 原因：原写法依赖路由数组的「顺序」和下标 —— 哪天新增/挪动一条路由，菜单就会错位或漏项。
 * 这里 path 直接用完整路径，配合 el-menu 的 router 模式，点击即跳转，不需要手动拼路径。
 */
const menuList = [
  { path: '/back/dashboard', title: '数据分析', icon: 'PieChart' },
  { path: '/back/knowledge', title: '知识文章', icon: 'ChatLineRound' },
  { path: '/back/consultations', title: '咨询记录', icon: 'Message' },
  { path: '/back/emotional', title: '情感日志', icon: 'User' }
]
</script>

<style lang="scss" scoped>
.sidebar-aside {
  transition: width 0.3s ease;
  overflow: hidden;
}
.brand-fade-enter-active,
.brand-fade-leave-active {
  transition: opacity 0.25s ease;
}
.brand-fade-enter-from,
.brand-fade-leave-to {
  opacity: 0;
}
.menu-style{
    height: 100%;
}
.brand {
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 10px;
  background-color: aliceblue;
  border-bottom: 1px solid #b3b3b375;
  height: var(--header-height, 64px);
  flex-shrink: 0;
  box-sizing: border-box;
}
.brand-image {
  width: 50px;
  height: 50px;
  margin-bottom: 12px;
}
.info-card {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  white-space: nowrap; /* 过渡期间文字不换行、不变形 */
}
/* 下面两个只保留一份定义（原先重复写了两遍，后一份会覆盖前一份，容易误判实际生效值） */
.brand-title {
  font-size: 20px;
  font-weight: bold;
}
.brand-subtitle {
  font-size: 14px;
  font-weight: normal;
  color: #666;
}
</style>
