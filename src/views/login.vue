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
    .title{
        .back-home{
            margin-bottom: 40px;
            .back-link{
                display: inline-flex;
                align-items: center;
                gap: 4px;
                font-size: 14px;
                color: #909399;
                text-decoration: none;
                transition: color 0.2s ease;
                &:hover{
                    color: #409eff;
                }
            }
        }
        .title-text{
            text-align: center;
            h2{
                font-size: 24px;
            font-weight: bold;
            color: #333;
            }
            p{
                font-size: 14px;
                color: #999;
            }
        }
    }
    .form-container{
        margin: 0 auto;
        .btn{
            margin-top: 40px;
            width: 100%;
        }
        .footer{
            text-align: center;
            margin-top: 20px;
            p{
                font-size: 14px;
                color: #999;
            }
        }
    }
}
</style>
