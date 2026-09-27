<template>
  <el-dialog
    v-model="dialogVisible"
    title="修改密码"
    width="440px"
    :close-on-click-modal="false"
    destroy-on-close
    @closed="handleClosed"
  >
    <el-form
      ref="formRef"
      :model="formData"
      :rules="rules"
      label-position="top"
      @submit.prevent
    >
      <el-form-item label="原密码" prop="password">
        <el-input
          v-model="formData.password"
          type="password"
          show-password
          size="large"
          placeholder="请输入当前登录密码"
        />
      </el-form-item>

      <el-form-item label="新密码" prop="newPassword">
        <el-input
          v-model="formData.newPassword"
          type="password"
          show-password
          size="large"
          :maxlength="PASSWORD_MAX"
          placeholder="请输入新密码"
        />
        <!--
          强度条只做视觉反馈，不参与校验拦截（拦截规则见 rules.newPassword）。
          三格进度条按 strength.level（0/1/2）点亮 1/2/3 格。
        -->
        <div class="pwd-extra">
          <div v-if="formData.newPassword" class="pwd-strength">
            <span
              v-for="i in 3"
              :key="i"
              class="bar"
              :style="i <= strength.level + 1 ? { background: strength.color } : {}"
              :class="{ 'is-on': i <= strength.level + 1 }"
            />
            <span class="strength-text" :style="{ color: strength.color }">
              强度：{{ strength.label }}
            </span>
          </div>
          <p v-else class="pwd-policy">规则：{{ PASSWORD_POLICY_TEXT }}</p>
        </div>
      </el-form-item>

      <el-form-item label="确认新密码" prop="confirmPassword">
        <el-input
          v-model="formData.confirmPassword"
          type="password"
          show-password
          size="large"
          :maxlength="PASSWORD_MAX"
          placeholder="请再次输入新密码"
          @keyup.enter="handleSubmit"
        />
      </el-form-item>
    </el-form>

    <template #footer>
      <el-button @click="dialogVisible = false">取消</el-button>
      <el-button type="primary" :loading="loading" @click="handleSubmit">
        确认修改
      </el-button>
    </template>
  </el-dialog>
</template>

<script setup>
/**
 * 修改密码弹窗（管理端 / 用户端共用）
 *
 * 用法：<ChangePasswordDialog v-model="visible" />，visible 为 true 时弹出。
 *
 * 三个必须注意的点：
 *  1. 请求体字段名是 password / newPassword / confirmPassword（后端 ChangesPassword_Username），
 *     不是 oldPassword，写错后端会以「原密码不能为空」报错，很容易误判成密码填错。
 *  2. 校验规则刻意做成「前端与后端一致 + 比后端更严」：
 *     后端只校验非空与 6-50 长度，这里额外拦「必须含字母和数字」「新旧密码不能相同」，
 *     把错误在前端就暴露出来，不必白跑一次请求。
 *  3. 改密成功后要清登录态重新登录 —— 后端 logout / 改密都是「无状态」的，
 *     改密本身**不会**让已签发的旧 token 失效（UserService.changes 只更新 password 列，
 *     实测用改密前的 token 打 /api/user/current 仍是 200），旧凭据继续可用，
 *     所以这里主动清掉本地登录态，让用户拿新密码重新登录。
 */
import { computed, reactive, ref, watch } from 'vue'
import { ElMessageBox } from 'element-plus'
import { useRouter } from 'vue-router'
import { changePassword } from '@/api/admin'
import { useAuthStore } from '@/stores/auth'
import {
  PASSWORD_MAX,
  PASSWORD_MIN,
  PASSWORD_POLICY_TEXT,
  evaluatePasswordStrength,
  meetsPasswordPolicy
} from '@/utils/password'

const props = defineProps({
  modelValue: {
    type: Boolean,
    default: false
  }
})
const emit = defineEmits(['update:modelValue', 'success'])

const router = useRouter()
const auth = useAuthStore()

const formRef = ref()
const loading = ref(false)
const formData = reactive({
  password: '',
  newPassword: '',
  confirmPassword: ''
})

/** 与 v-model 双向绑定：对外只暴露 modelValue */
const dialogVisible = computed({
  get: () => props.modelValue,
  set: (val) => emit('update:modelValue', val)
})

/** 新密码的强度（用于进度条与文案） */
const strength = computed(() => evaluatePasswordStrength(formData.newPassword))

const rules = reactive({
  password: [
    { required: true, message: '请输入原密码', trigger: 'blur' },
    {
      min: PASSWORD_MIN,
      max: PASSWORD_MAX,
      message: `密码长度必须在 ${PASSWORD_MIN}-${PASSWORD_MAX} 个字符之间`,
      trigger: 'blur'
    }
  ],
  newPassword: [
    { required: true, message: '请输入新密码', trigger: 'blur' },
    {
      min: PASSWORD_MIN,
      max: PASSWORD_MAX,
      message: `密码长度必须在 ${PASSWORD_MIN}-${PASSWORD_MAX} 个字符之间`,
      trigger: 'blur'
    },
    {
      // 用函数式校验而不是正则规则：可读性更好，且能把两条业务规则合并成一个提示位
      validator: (rule, value, callback) => {
        if (!value) return callback()
        if (!meetsPasswordPolicy(value)) {
          return callback(new Error('新密码需同时包含字母和数字'))
        }
        // 后端不校验「新旧相同」，但允许等于原密码等于没改，这里提前拦掉
        if (value === formData.password) {
          return callback(new Error('新密码不能与原密码相同'))
        }
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
        value === formData.newPassword
          ? callback()
          : callback(new Error('两次输入的密码不一致'))
      },
      trigger: 'blur'
    }
  ]
})

/**
 * 新密码改动后，若「确认新密码」已填过，要重新校验一次它。
 * 否则用户先填确认框（报"不一致"红字）、再回头改新密码，红字会一直挂着不消失。
 *
 * ⚠️ 这里的 `.catch(() => {})` 不能省：Element Plus 的 validateField 在**校验不通过时
 * 返回 rejected promise**（不是 resolve(false)）。不接住它，浏览器控制台会刷出
 * 「Uncaught (in promise)」——实测连打 5 条，正好对应确认框内容还不一致时的每次输入。
 * 红字该显示照旧显示，这里只是把这条 promise 的失败吞掉。
 */
watch(
  () => formData.newPassword,
  () => {
    if (formData.confirmPassword && formRef.value) {
      formRef.value.validateField('confirmPassword').catch(() => {})
    }
  }
)

/** 改密成功后的收尾：提示 → 清登录态 → 回登录页 */
async function redirectToLogin() {
  try {
    await ElMessageBox.alert('密码修改成功，请使用新密码重新登录。', '修改成功', {
      confirmButtonText: '重新登录',
      type: 'success',
      // 关掉所有「绕过确认」的出口：必须点按钮，否则登录态清了一半会很难排查
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
  // 校验失败会自动在表单项下显示红字，这里不再额外弹提示
  const valid = await formRef.value.validate().catch(() => false)
  if (!valid) return

  loading.value = true
  try {
    await changePassword({
      password: formData.password,
      newPassword: formData.newPassword,
      confirmPassword: formData.confirmPassword
    })
    emit('success')
    dialogVisible.value = false
    await redirectToLogin()
  } catch (e) {
    // 「原密码错误」「两次密码不一致」等提示已由请求拦截器统一弹出，这里只复位 loading
  } finally {
    loading.value = false
  }
}

/** 关闭后清空，下次打开是干净表单（destroy-on-close 销毁的是 DOM，响应式数据仍在） */
const handleClosed = () => {
  formRef.value?.resetFields()
  formData.password = ''
  formData.newPassword = ''
  formData.confirmPassword = ''
}
</script>

<style lang="scss" scoped>
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

/*
 * 该字段已经报出红字时，隐藏灰色规则提示。
 * Element Plus 的红字是绝对定位挂在表单项末尾的，两条提示叠在一起会挤成一坨，
 * 且红字位置被压到提示下方、离输入框更远，读起来别扭。
 */
:deep(.el-form-item.is-error) .pwd-extra .pwd-policy {
  display: none;
}
</style>
