<template>
  <div class="backend-layout">
    <el-container class="main-container">
      <Sidebar></Sidebar>
      <el-container direction="vertical">
        <Navbar></Navbar>
        <el-main>
          <div class="content-container">
            <router-view v-slot="{ Component, route }">
              <transition :name="transitionName" mode="out-in" appear>
                <component :is="Component" :key="route.path" />
              </transition>
            </router-view>
          </div>
        </el-main>
      </el-container>
    </el-container>
  </div>
</template>

<script setup>
import { computed, ref } from 'vue'
import { onBeforeRouteUpdate, useRoute } from 'vue-router'
import Sidebar from './Sidebar.vue'
import Navbar from './Navbar.vue'

const route = useRoute()

// 记录「上一跳是否来自带转场的路由」，保证详情页返回上级时也有离开动画
const leavingHasTransition = ref(false)
onBeforeRouteUpdate((to, from) => {
  leavingHasTransition.value = from.meta.transition === true
})
const transitionName = computed(() =>
  route.meta.transition || leavingHasTransition.value ? 'page' : ''
)
</script>
<style lang="scss" scoped>
.backend-layout{
    --header-height: 60px;
    height: 100vh;
    height: 100dvh;
    .el-header{
        height: var(--header-height) !important;
    }
    .main-container{
        height: 100%;
        :deep(.el-main){
            overflow-y: auto;
            padding: 0;
            background: var(--bg-app);
        }
        .content-container{
            padding: 24px;
            max-width: 1400px;
            margin: 0 auto;
            width: 100%;
            min-height: calc(100% - var(--header-height));
        }
    }
}
</style>
