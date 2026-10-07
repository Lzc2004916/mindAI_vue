<template>
  <RoutePage title="个人资料">
    <div class="profile-page">
      <el-form ref="formRef" :model="formData" :rules="rules" label-position="top" @submit.prevent>

        <el-form-item label="头像">
          <div class="avatar-row">
            <el-avatar :size="72" :src="avatarPreview">
              {{ auth.avatarText }}
            </el-avatar>
            <div class="avatar-actions">
              <!-- 不用 el-upload 的自动上传：选中文件后走我们自己的 uploadAvatar，
                   拿到 filePath 先预览，点「保存」才随资料一起提交 -->
              <el-upload
                :show-file-list="false"
                :auto-upload="false"
                accept="image/*"
                :on-change="handleAvatarPick"
              >
                <el-button :loading="avatarUploading">更换头像</el-button>
              </el-upload>
              <p class="avatar-tip">支持 jpg / png / gif / webp，不超过 10MB</p>
            </div>
          </div>
        </el-form-item>

        <el-form-item label="昵称" prop="nickname">
          <el-input v-model="formData.nickname" size="large" maxlength="50" show-word-limit
            placeholder="请输入昵称（最长 50 字）" />
        </el-form-item>

        <el-form-item label="性别" prop="gender">
          <el-radio-group v-model="formData.gender">
            <el-radio :value="1">男</el-radio>
            <el-radio :value="2">女</el-radio>
          </el-radio-group>
        </el-form-item>

        <el-form-item label="生日" prop="birthday">
          <el-date-picker
            v-model="formData.birthday"
            type="date"
            value-format="YYYY-MM-DD"
            :disabled-date="isFutureDate"
            placeholder="请选择生日"
            size="large"
            style="width: 100%"
          />
        </el-form-item>
      </el-form>
    </div>

    <template #footer>
      <el-button @click="goBack">取消</el-button>
      <el-button type="primary" :loading="loading" @click="handleSubmit">保存</el-button>
    </template>
  </RoutePage>
</template>

<script setup>
import { computed, reactive, ref } from 'vue'
import { useRouter } from 'vue-router'
import { ElMessage } from 'element-plus'
import RoutePage from '@/views/RoutePage.vue'
import { updateProfile, uploadAvatar } from '@/api/admin'
import { useAuthStore } from '@/stores/auth'
import { fileBaseUrl } from '@/config'

const router = useRouter()
const auth = useAuthStore()

const formRef = ref()
const loading = ref(false)
const avatarUploading = ref(false)

// 初始值取当前登录态（登录时后端已下发完整 UserDetailResponseDTO）
const formData = reactive({
  nickname: auth.userInfo?.nickname || '',
  avatar: auth.userInfo?.avatar || '',
  gender: auth.userInfo?.gender ?? null,
  birthday: auth.userInfo?.birthday || null
})

/** avatar 存的是后端相对路径（/files/...），预览要拼 fileBaseUrl */
const avatarPreview = computed(() =>
  formData.avatar ? fileBaseUrl + formData.avatar : undefined
)

const isFutureDate = (date) => date.getTime() > Date.now()

const rules = reactive({
  nickname: [
    { max: 50, message: '昵称最长 50 字', trigger: 'blur' }
  ],
  gender: [
    {
      validator: (rule, value, callback) => {
        if (value === null || value === undefined || value === 1 || value === 2) return callback()
        callback(new Error('性别取值不合法'))
      },
      trigger: 'change'
    }
  ]
})

/** 选中图片立即上传拿 filePath（仅预览，保存时才真正绑定到资料上） */
const handleAvatarPick = async (uploadFile) => {
  const raw = uploadFile.raw
  if (!raw) return
  if (!raw.type.startsWith('image/')) {
    ElMessage.error('请选择图片文件')
    return
  }
  if (raw.size > 10 * 1024 * 1024) {
    ElMessage.error('图片不能超过 10MB')
    return
  }
  avatarUploading.value = true
  try {
    const res = await uploadAvatar(raw)
    formData.avatar = res?.filePath || ''
    ElMessage.success('头像已上传，保存后生效')
  } catch (e) {
    // 失败提示已由拦截器统一弹出
  } finally {
    avatarUploading.value = false
  }
}

const goBack = () => router.back()

const handleSubmit = async () => {
  if (!formRef.value) return
  const valid = await formRef.value.validate().catch(() => false)
  if (!valid) return

  loading.value = true
  try {
    // 后端是局部更新：nickname 为空串会被忽略，null 字段不动 —— 全量提交现状即可
    const res = await updateProfile({
      nickname: formData.nickname?.trim() || undefined,
      avatar: formData.avatar || undefined,
      gender: formData.gender ?? undefined,
      birthday: formData.birthday || undefined
    })
    // 接口直接返回最新 UserDetailResponseDTO，一把刷新登录态（导航头像/昵称即时生效）
    if (res) auth.updateUserInfo(res)
    ElMessage.success('资料已保存')
    router.back()
  } catch (e) {
    // 失败提示已由拦截器统一弹出
  } finally {
    loading.value = false
  }
}
</script>

<style lang="scss" scoped>
.profile-page {
  max-width: 460px;

  .avatar-row {
    display: flex;
    align-items: center;
    gap: 16px;

    .avatar-tip {
      margin-top: 6px;
      font-size: 12px;
      line-height: 1.4;
      color: var(--text-3, #9ca3af);
    }
  }
}
</style>
