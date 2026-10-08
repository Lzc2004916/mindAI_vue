<template>
  <div class="navbar">
    <div class="flex-box">
        <el-button text @click="handleCollapse" class="collapse-btn">
            <el-icon><Expand /></el-icon>
        </el-button>
        <p class="page-title">{{route.meta.title}}</p>
    </div>
    <div class="flex-box">
        <el-dropdown @command="handleCommand">
            <div class="user-chip">
                <el-avatar :size="30" :src="auth.avatar || undefined" class="user-avatar">{{ auth.avatarText }}</el-avatar>
                <p class="user-name">{{ auth.displayName }}</p>
                <el-icon class="arrow"><ArrowDown /></el-icon>
            </div>
            <template #dropdown>
                <el-dropdown-menu>
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
    </div>
</template>
<script setup>
import { Expand } from '@element-plus/icons-vue';
import { useAdminStore } from '@/stores/admin'
import { useAuthStore } from '@/stores/auth'
import { useLogout } from '@/composables/useLogout'
import { useRoute, useRouter } from 'vue-router'
const route = useRoute();
const adminStore = useAdminStore();
const auth = useAuthStore();
const { confirmLogout } = useLogout();
const router = useRouter();

const handleCommand = (command) => {
    if (command === 'logout') {
        confirmLogout()
    } else if (command === 'changePassword') {
        router.push('/back/change-password')
    }
}
const handleCollapse = ()=>{
    adminStore.toggleCollapse()
}
</script>

<style lang="scss" scoped>
.navbar{
height: var(--header-height, 60px);
flex-shrink: 0;
display: flex;
align-items: center;
justify-content: space-between;
padding:0 24px;
background: rgba(255,255,255,0.85);
backdrop-filter: blur(12px);
border-bottom: 1px solid var(--border);
.flex-box{
    display: flex;
    align-items: center;
    justify-content: center;
    .page-title{
    font-size: 16px;
    font-weight: 600;
    color: var(--text-1);
    margin-left: 8px;
    letter-spacing: 0.2px;
}
}
.collapse-btn {
  font-size: 18px;
  color: var(--text-2);
}
.user-chip {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 5px 12px 5px 5px;
  border-radius: var(--radius-pill);
  cursor: pointer;
  transition: background 0.2s;

  &:hover {
    background: var(--brand-50);
  }
  .user-avatar {
    background: var(--brand);
    color: #fff;
    font-weight: 500;
  }
  .user-name {
    font-size: 14px;
    color: var(--text-1);
    font-weight: 500;
  }
  .arrow {
    font-size: 12px;
    color: var(--text-3);
  }
}
}
</style>
