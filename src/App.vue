<template>
  <!-- 全局主题背景层（固定在最底层） -->
  <ThemeBackground />
  <!-- 主题设置抽屉 -->
  <ThemeSettings />
  <!-- 业务路由 -->
  <router-view />
</template>

<script setup>
import ThemeBackground from '@/components/ThemeBackground.vue'
import ThemeSettings from '@/components/ThemeSettings.vue'
</script>

<style>
/* 让路由内容浮在背景层之上 */
#app {
  position: relative;
  z-index: 1;
}
</style>
