<template>
  <RoutePage title="修改密码">
    <div class="pwd-page">
      <el-form ref="formRef" :model="formData" :rules="rules" label-position="top" @submit.prevent>
        <el-form-item label="原密码" prop="password">
          <el-input v-model="formData.password" type="password" show-password size="large"
            placeholder="请输入当前登录密码" />
        </el-form-item>

        <el-form-item label="新密码" prop="newPassword">
          <el-input v-model="formData.newPassword" type="password" show-password size="large" :maxlength="PASSWORD_MAX"
            placeholder="请输入新密码" />
          <div class="pwd-extra">
            <div v-if="formData.newPassword" class="pwd-strength">
              <span v-for="i in 3" :key="i" class="bar"
                :style="i <= strength.level + 1 ? { background: strength.color } : {}"
                :class="{ 'is-on': i <= strength.level + 1 }" />
              <span class="strength-text" :style="{ color: strength.color }">
                强度：{{ strength.label }}
              </span>
            </div>
            <p v-else class="pwd-policy">规则：{{ PASSWORD_POLICY_TEXT }}</p>
          </div>
        </el-form-item>

        <el-form-item label="确认新密码" prop="confirmPassword">
          <el-input v-model="formData.confirmPassword" type="password" show-password size="large"
            :maxlength="PASSWORD_MAX" placeholder="请再次输入新密码" @keyup.enter="handleSubmit" />
        </el-form-item>
      </el-form>
    </div>

    <template #footer>
      <el-button @click="goBack">取消</el-button>
      <el-button type="primary" :loading="loading" @click="handleSubmit">确认修改</el-button>
    </template>
  </RoutePage>
</template>

<script setup>
import { computed, reactive, ref, watch } from 'vue'
import { useRouter } from 'vue-router'
import { ElMessageBox } from 'element-plus'
import RoutePage from '@/views/RoutePage.vue'
import { changePassword } from '@/api/admin'
import { useAuthStore } from '@/stores/auth'
import {
  PASSWORD_MAX,
  PASSWORD_MIN,
  PASSWORD_POLICY_TEXT,
  evaluatePasswordStrength,
  meetsPasswordPolicy
} from '@/utils/password'

const router = useRouter()
const auth = useAuthStore()

const formRef = ref()
const loading = ref(false)
const formData = reactive({
  password: '',
  newPassword: '',
  confirmPassword: ''
})

const strength = computed(() => evaluatePasswordStrength(formData.newPassword))

const rules = reactive({
  password: [
    { required: true, message: '请输入原密码', trigger: 'blur' },
    { min: PASSWORD_MIN, max: PASSWORD_MAX, message: `密码长度必须在 ${PASSWORD_MIN}-${PASSWORD_MAX} 个字符之间`, trigger: 'blur' }
  ],
  newPassword: [
    { required: true, message: '请输入新密码', trigger: 'blur' },
    { min: PASSWORD_MIN, max: PASSWORD_MAX, message: `密码长度必须在 ${PASSWORD_MIN}-${PASSWORD_MAX} 个字符之间`, trigger: 'blur' },
    {
      validator: (rule, value, callback) => {
        if (!value) return callback()
        if (!meetsPasswordPolicy(value)) return callback(new Error(PASSWORD_POLICY_TEXT))
        if (value === formData.password) return callback(new Error('新密码不能与原密码相同'))
        callback()
      },
      trigger: 'blur'
    }
  ],
  confirmPassword: [
    { required: true, message: '请再次输入新密码', trigger: 'blur' },
    {
      validator: (rule, value, callback) => {
        if (!value) return callback()
        value === formData.newPassword ? callback() : callback(new Error('两次输入的密码不一致'))
      },
      trigger: 'blur'
    }
  ]
})

watch(
  () => formData.newPassword,
  () => {
    if (formData.confirmPassword && formRef.value) {
      formRef.value.validateField('confirmPassword').catch(() => {})
    }
  }
)

const goBack = () => router.back()

/** 改密成功：提示 → 清登录态 → 回登录页 */
async function redirectToLogin() {
  try {
    await ElMessageBox.alert('密码修改成功，请使用新密码重新登录。', '修改成功', {
      confirmButtonText: '重新登录',
      type: 'success',
      showClose: false,
      closeOnClickModal: false,
      closeOnPressEscape: false
    })
  } finally {
    auth.clear()
    router.replace('/auth/login')
  }
}

const handleSubmit = async () => {
  if (!formRef.value) return
  const valid = await formRef.value.validate().catch(() => false)
  if (!valid) return

  loading.value = true
  try {
    await changePassword({
      password: formData.password,
      newPassword: formData.newPassword,
      confirmPassword: formData.confirmPassword
    })
    await redirectToLogin()
  } catch (e) {
    // 失败提示已由请求拦截器统一弹出
  } finally {
    loading.value = false
  }
}
</script>

<style lang="scss" scoped>
.pwd-page {
  max-width: 460px;

  .pwd-extra {
    width: 100%;
    margin-top: 6px;

    .pwd-strength {
      display: flex;
      align-items: center;
      gap: 6px;

      .bar {
        width: 40px;
        height: 6px;
        border-radius: 3px;
        background: var(--border, #e5e7eb);
        transition: background 0.2s ease;
      }

      .strength-text {
        margin-left: 4px;
        font-size: 12px;
        line-height: 1;
      }
    }

    .pwd-policy {
      font-size: 12px;
      line-height: 1.4;
      color: var(--text-3, #9ca3af);
    }
  }
}

:deep(.el-form-item.is-error) .pwd-extra .pwd-policy {
  display: none;
}
</style>