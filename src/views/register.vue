<template>
  <div class="container">
    <div class="title">
    <div class="title-text">
        <h2>创建您的账户</h2>
        <p>请输入您的账户信息</p>
    </div>
    </div>
    <div class="form-container">
      <el-form
      :model="formdata"
      :rules="rules"
      ref="ruleFormRef"
      label-position="top"
      >
      <el-form-item label="用户名"  prop="username">
        <el-input v-model="formdata.username" placeholder="请输入用户名" size="large" />
      </el-form-item>
      <el-form-item label="邮箱" prop="email">
        <el-input v-model="formdata.email" placeholder="请输入邮箱" size="large" />
      </el-form-item>
      <el-form-item label="昵称" prop="nickname">
        <el-input v-model="formdata.nickname" placeholder="请输入昵称" size="large" />
      </el-form-item>
      <el-form-item label="手机号" prop="phone">
        <el-input v-model="formdata.phone" placeholder="请输入手机号" size="large" />
      </el-form-item>
      <el-form-item label="密码" prop="password">
        <el-input v-model="formdata.password" placeholder="请输入密码" size="large" type="password" show-password />
      </el-form-item>
      <el-form-item label="确认密码" prop="confirmPassword">
        <el-input v-model="formdata.confirmPassword" placeholder="请输入确认密码" size="large" type="password" show-password />
      </el-form-item>
      <el-button class="btn" type="primary" size="large" :loading="loading" @click="submitForm">创建用户</el-button>
      </el-form>
       <div class="footer">
            <p>已经有账户？<router-link to="/auth/login">去登录</router-link></p>
        </div>
    </div>
  </div>
</template>

<script setup>
import { ref, reactive } from "vue"
import { addUser } from "@/api/frontend";
import {ElMessage} from 'element-plus'
import { useRouter } from "vue-router";
const router = useRouter()
// 注意：这里不放 userType。
// 角色是服务端决定的字段，后端注册接口已强制写成普通用户，
// 前端再传一遍既没意义，也容易被误以为「可以靠它提权」。
const formdata = reactive({
    username: '',
    email: '',
    nickname: '',
    phone: '',
    password: '',
    confirmPassword: '',
    gender: 0
})
const ruleFormRef = ref()
const loading = ref(false)

// 校验规则复用
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
const PHONE_RE = /^1[3-9]\d{9}$/
/** 与后端 UserRegisterCommandDTO 的 @Pattern("^[a-zA-Z0-9_]+$") 逐字一致 */
const USERNAME_RE = /^[a-zA-Z0-9_]+$/

const rules = reactive({
  username:[
    {required: true, message: '请输入用户名', trigger: 'blur'},
    // ⚠️ 必须与后端对齐：后端是 @Size(min=3, max=50) + @Pattern("^[a-zA-Z0-9_]+$")。
    //    原来这里写的是「2-20 且不校验字符集」→ 输入 2 个字符、中文或带符号的用户名时
    //    前端放行、后端报「用户名长度必须在3到50个字符之间」/「只能包含字母、数字和下划线」，
    //    用户填完才被拒，属于白跑一趟。
    { min: 3, max: 50, message: '用户名长度为 3-50 个字符', trigger: 'blur' },
    {
      validator: (rule, value, callback) => {
        if (!value) return callback()
        USERNAME_RE.test(value) ? callback() : callback(new Error('用户名只能包含字母、数字和下划线'))
      },
      trigger: 'blur'
    }
  ],
  email:[
    {required: true, message: '请输入邮箱', trigger: 'blur'},
    {
      // 原来只校验了「非空」，邮箱格式随便填都能过
      validator: (rule, value, callback) => {
        if (!value) return callback()
        EMAIL_RE.test(value) ? callback() : callback(new Error('邮箱格式不正确'))
      },
      trigger: 'blur'
    }
  ],
  nickname:[
    {required: true, message: '请输入昵称', trigger: 'blur'}
  ],
  phone:[
    {required: true, message: '请输入手机号', trigger: 'blur'},
    {
      validator: (rule, value, callback) => {
        if (!value) return callback()
        PHONE_RE.test(value) ? callback() : callback(new Error('请输入 11 位有效手机号'))
      },
      trigger: 'blur'
    }
  ],
  password:[
    {required: true, message: '请输入密码', trigger: 'blur'},
    { min: 6, max: 32, message: '密码长度为 6-32 个字符', trigger: 'blur' }
  ],
  confirmPassword:[
    {required: true, message: '请输入确认密码', trigger: 'blur'},
    {
      // 两次密码一致性：本地就拦掉，不必等后端返回「两次密码不一致」
      validator: (rule, value, callback) => {
        if (!value) return callback()
        value === formdata.password ? callback() : callback(new Error('两次输入的密码不一致'))
      },
      trigger: 'blur'
    }
  ],
})

const submitForm = async ()=>{
  if(!ruleFormRef.value) return
  const valid = await ruleFormRef.value.validate().catch(() => false)
  if(!valid) return
  loading.value = true
  try{
    await addUser(formdata)
    ElMessage.success('注册成功')
    router.push('/auth/login')
  }catch(e){
    // 失败提示（如"用户名已存在"）已由拦截器统一弹出
  }finally{
    loading.value = false
  }
}
</script>

<style lang="scss" scoped>
.container {
    width: 384px;
    .title {
        .title-text {
            text-align: center;
            h2 {
                font-size: 24px;
                font-weight: bold;
                color: #333;
                margin-bottom: 10px;
            }
            p {
                font-size: 14px;
                color: #999;
            }
        }
    }
    .form-container {
        margin: 0 auto;
        .btn {
            margin-top: 40px;
            width: 100%;
        }
        .footer {
            text-align: center;
            margin-top: 20px;
            p {
                font-size: 14px;
                color: #999;
            }
        }
    }
}
</style>
