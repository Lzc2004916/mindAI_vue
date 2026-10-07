<template>
  <div class="container">
    <div class="title">
        <div class="back-home">
            <router-link to="/" class="back-link">
                <el-icon><Back /></el-icon>
                <span>返回首页</span>
            </router-link>
        </div>
    <div class="title-text">
        <h2>登录您的账户</h2>
        <p>请输入您的登录信息</p>
    </div>
    </div>
    <div class="form-container">
        <el-form
          :model="formData"
          :rules="rules"
          ref="ruleFormRef"
          label-position="top"
        >
        <el-form-item label="用户名或邮箱" prop="username">
            <el-input v-model="formData.username" placeholder="请输入用户名" size="large"></el-input>
        </el-form-item>
        <el-form-item label="密码" prop="password">
            <el-input v-model="formData.password" placeholder="请输入密码" size="large" type="password" show-password></el-input>
        </el-form-item>
        <el-button class="btn" type="primary" size="large" :loading="loading" @click="submitForm">登录</el-button>
        
        </el-form>
        <div class="footer">
            <p>还没有账户？<router-link to="/auth/register">去注册</router-link></p>
        </div>
    </div>
  </div>
</template>

<script setup>
import { ref, reactive } from "vue"
import { ElMessage } from "element-plus"
import { login } from "@/api/admin";
import { useRouter } from 'vue-router'
import { useAuthStore } from '@/stores/auth'
const router = useRouter()
const auth = useAuthStore()
const ruleFormRef = ref()
const loading = ref(false)
const formData = reactive({
    username: '',
    password: ''
})
const rules = reactive({
    username:[
        {required: true, message: '请输入用户名', trigger: 'blur'}
    ],
    password:[
        {required: true, message: '请输入密码', trigger: 'blur'}
    ]
})
const submitForm = async()=>{
    if(!ruleFormRef.value) return
    // validate 校验失败会 reject，这里不额外弹提示（表单自身已有红字）
    const valid = await ruleFormRef.value.validate().catch(() => false)
    if(!valid) return
    loading.value = true
    try{
        const data = await login(formData)
        // 防御性判断：正常情况下失败会被拦截器 reject 掉，走不到这里
        if(!data?.token){
            ElMessage.error('登录失败，请检查用户名和密码')
            return
        }
        // 登录态统一写入 store（内部会同步到 localStorage）
        auth.login(data.token, data.userInfo)
        // ElMessage 挂载在 body 上，路由跳走后提示依然能正常展示
        ElMessage.success(`登录成功，欢迎回来，${auth.displayName}`)
        // 按角色分流：管理员去管理端，普通用户回用户端
        router.replace(auth.homePath)
    } finally {
        loading.value = false
    }
}
</script>

<style lang="scss" scoped>
.container {
    width: 384px;
    animation: fade-up 0.5s var(--ease-out) both;
    .title{
        .back-home{
            margin-bottom: 40px;
            .back-link{
                display: inline-flex;
                align-items: center;
                gap: 4px;
                font-size: 14px;
                color: var(--text-3);
                text-decoration: none;
                transition: color var(--transition);
                &:hover{
                    color: var(--brand);
                }
            }
        }
        .title-text{
            text-align: center;
            h2{
                font-size: 26px;
                font-weight: 700;
                color: var(--text-1);
                margin-bottom: 8px;
            }
            p{
                font-size: 14px;
                color: var(--text-3);
            }
        }
    }
    .form-container{
        margin: 0 auto;
        :deep(.el-input__wrapper) {
            border-radius: var(--radius-md);
            padding: 4px 14px;
            box-shadow: 0 0 0 1px var(--border) inset;
            transition: box-shadow var(--transition);
            &:hover, &.is-focus {
                box-shadow: 0 0 0 1.5px var(--brand) inset;
            }
        }
        .btn{
            margin-top: 32px;
            width: 100%;
            border-radius: var(--radius-md);
            font-size: 16px;
            font-weight: 600;
            letter-spacing: 2px;
            height: 46px;
        }
        .footer{
            text-align: center;
            margin-top: 24px;
            p{
                font-size: 14px;
                color: var(--text-3);
                a {
                    color: var(--brand);
                    font-weight: 500;
                }
            }
        }
    }
}
</style>
