<template>
  <div class="navbar">
    <div class="flex-box">
        <el-button @click="handleCollapse">
            <el-icon><Expand /></el-icon>
        </el-button>
        <p class="page-title">{{route.meta.title}}</p>
    </div>
    <div class="flex-box">
        <el-dropdown @command="handleCommand">
            <div class="flex-box">
                <el-avatar :src="auth.avatar || undefined">{{ auth.avatarText }}</el-avatar>
                <p class="user-name">{{ auth.displayName }}</p>
                <el-icon><ArrowDown /></el-icon>
            </div>
            <template #dropdown>
                <el-dropdown-menu>
                    <el-dropdown-item command="theme">
                        主题设置
                    </el-dropdown-item>
                    <el-dropdown-item command="changePassword">
                        修改密码
                    </el-dropdown-item>
                    <el-dropdown-item command="logout" divided>
                        退出登录
                    </el-dropdown-item>
                </el-dropdown-menu>
            </template>
            </el-dropdown>
    </div>
    <!-- 改密弹窗：与用户端共用同一个组件，挂在导航栏上，任何管理页都能用 -->
    <ChangePasswordDialog v-model="pwdVisible" />
  </div>
</template>
<script setup>
import { ref } from 'vue';
import { Expand } from '@element-plus/icons-vue';
import { useAdminStore } from '@/stores/admin'
import { useAuthStore } from '@/stores/auth'
import { useThemeStore } from '@/stores/theme'
import { useLogout } from '@/composables/useLogout'
import { useRoute } from 'vue-router'
import ChangePasswordDialog from '@/components/ChangePasswordDialog.vue'
const route = useRoute();
const adminStore = useAdminStore();
const auth = useAuthStore();
const theme = useThemeStore();
const { confirmLogout } = useLogout();
const pwdVisible = ref(false);

const handleCommand = (command) => {
    if (command === 'logout') {
        confirmLogout()
    } else if (command === 'changePassword') {
        pwdVisible.value = true
    } else if (command === 'theme') {
        theme.openSettings()
    }
}
const handleCollapse = ()=>{
    adminStore.toggleCollapse()
}
</script>

<style lang="scss" scoped>

.navbar{
height: var(--header-height, 64px);
flex-shrink: 0;
display: flex;
align-items: center;
justify-content: space-between;
padding:0 15px;
background:white;
box-shadow:0 1px 4px rgba(0,21,41, 0.08);
border-bottom: 1px solid #e5e7eb;
.flex-box{
    display: flex;
    align-items: center;
    justify-content: center;
    .page-title{
    font-size: 20px;
    font-weight: 500;
    color: #292b30;
    margin-left: 10px;
}
}
}

</style>
