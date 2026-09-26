<template>
  <div class="frontend-layout">
    <div class="navbar-container">
        <div class="brand-section">
            <el-image :src="logoImg" alt="logo" class="brand-logo" style="width: 50px; height: 50px;"></el-image>
            <h1 class="brand-name">心理健康AI助手</h1>
        </div>
        <div class="nav-section">
            <router-link to="/" class="nav-link">首页</router-link>
            <router-link to="/consultation" class="nav-link" v-if="isLogin">AI咨询</router-link>
            <router-link to="/emotion-diary" class="nav-link" v-if="isLogin">情绪日志</router-link>
            <router-link to="/knowledge" class="nav-link">知识库</router-link>
            <template v-if="isLogin">
                <span class="user-greeting">{{ auth.displayName }}</span>
                <el-button class="logout-btn" @click="confirmLogout">退出登录</el-button>
            </template>
            <template v-else>
                <router-link to="/auth/login" class="nav-link">登录</router-link>
                 <router-link to="/auth/register" class="nav-link">
                    <el-button type="primary">注册</el-button>
                 </router-link>
            </template>
        </div>
    </div>
    <div class="main-container">
        <router-view></router-view>
    </div>
    <div class="footer-container" v-if="footerShow">
        <div class="footer-bottom">
            <p>欢迎来到心理健康AI助手 &copy; 2026</p>
        </div>
    </div>
  </div>
</template>

<script setup>
import { computed } from 'vue';
import { useRoute } from 'vue-router'
import { useAuthStore } from '@/stores/auth'
import { useLogout } from '@/composables/useLogout'

const route = useRoute();
const auth = useAuthStore();
const { confirmLogout } = useLogout();

const logoImg = new URL('@/assets/images/机器人.png', import.meta.url).href

// 登录态来自 store（响应式）：登录/退出后导航立刻切换，不再需要 F5
const isLogin = computed(() => auth.isLogin)

// 只有首页显示 footer，路由切换自动响应
const footerShow = computed(() => route.path === '/')
</script>

<style lang="scss" scoped>
.frontend-layout {
    display: flex;
    flex-direction: column;
    height: 100vh;
    overflow: hidden;
    background-color: #fff;

    .navbar-container {
        flex-shrink: 0;
        max-width: 1200px;
        width: 100%;
        margin: 0 auto;
        padding: 10px;
        display: flex;
        align-items: center;
        justify-content: space-between;

        .brand-section {
            display: flex;
            align-items: center;

            .brand-name {
                margin-left: 10px;
                font-size: 24px;
                font-weight: 600;
                color: #333;
            }
        }

        .nav-section {
            display: flex;
            align-items: center;
            gap: 40px;

            .nav-link {
                color: #4b5563;
                font-size: 16px;
                font-weight: 500;

                &:hover {
                    color: var(--brand);
                }
            }

            .user-greeting {
                color: #4b5563;
                font-size: 16px;
                font-weight: 500;
                max-width: 120px;
                overflow: hidden;
                text-overflow: ellipsis;
                white-space: nowrap;
            }
        }
    }

    .main-container {
        flex: 1;
        min-height: 0;
        overflow: hidden;
    }

    .footer-container {
        flex-shrink: 0;
        background: #1f2937;
        color: white;
        padding: 15px 0;
        .footer-bottom {
            max-width: 1200px;
            margin: 0 auto;
            padding: 0 10px;
            text-align: center;
        }
    }
}
</style>
