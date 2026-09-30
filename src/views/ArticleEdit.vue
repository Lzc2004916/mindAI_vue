<template>
  <RoutePage :title="isEdit ? '编辑文章' : '新增文章'" :back-to="'/back/knowledge'">
    <el-form ref="formRef" :model="formData" :rules="rules" label-width="90px">
      <el-form-item label="文章标题" prop="title">
        <el-input v-model="formData.title" placeholder="请输入文章标题" :maxlength="200" show-word-limit></el-input>
      </el-form-item>
      <el-form-item label="所属分类" prop="categoryId">
        <el-select v-model="formData.categoryId" placeholder="请选择分类">
          <el-option v-for="item in categories" :key="item.value" :label="item.label" :value="item.value"></el-option>
        </el-select>
      </el-form-item>
      <el-form-item label="文章摘要" prop="summary">
        <el-input type="textarea" v-model="formData.summary" placeholder="请输入文章摘要(可选)" :maxlength="1000"
          show-word-limit :rows="4"></el-input>
      </el-form-item>
      <el-form-item label="标签" prop="tags">
        <el-select v-model="formData.tagArray" placeholder="请输入文章标签(可选)" multiple filterable allow-create
          style="width: 100%;">
          <el-option v-for="item in commonTags" :key="item" :label="item" :value="item"></el-option>
        </el-select>
      </el-form-item>
      <el-form-item label="封面图片">
        <div class="cover-upload">
          <el-upload action="" :before-upload="beforeUpload" :http-request="handleUploadRequest"
            :show-file-list="false" accept="image/*">
            <div v-if="!imgUrl" class="cover-placeholder">
              <p>点击上传封面</p>
            </div>
            <img v-else :src="imgUrl" class="cover-image" alt="封面图片">
          </el-upload>
          <div v-if="imgUrl" class="cover-remove">
            <el-button type="danger" size="small" @click="handleRemove">移除封面</el-button>
          </div>
        </div>
      </el-form-item>
      <el-form-item label="文章内容" prop="content">
        <RichTextEditor :model-value="formData.content" placeholder="请输入文章内容，支持富文本格式" :maxCharCount="5000"
          @Change="handelContentChange" @created="handleEditorCreated" min-height="400px"></RichTextEditor>
      </el-form-item>
    </el-form>

    <div v-if="btnPreview" class="preview-block">
      <h3>内容预览</h3>
      <div v-html="formData.content"></div>
    </div>

    <template #footer>
      <el-button :type="btnPreview ? 'info' : 'primary'" @click="btnPreview = !btnPreview">
        {{ btnPreview ? '隐藏预览' : '预览效果' }}
      </el-button>
      <el-button @click="goBack">取消</el-button>
      <el-button type="primary" :loading="loading" @click="handleSubmit">{{ isEdit ? '更新' : '新增' }}</el-button>
    </template>
  </RoutePage>
</template>

<script setup>
import { computed, nextTick, onMounted, reactive, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { ElMessage } from 'element-plus'
import RoutePage from '@/views/RoutePage.vue'
import { categoryTree, createArticle, getArticleDetail, updateArticle, uploadFile } from '@/api/admin'
import { fileBaseUrl } from '@/config'
import { useDetailStore } from '@/stores/detail'
import RichTextEditor from '@/components/RichTextEditor.vue'

const route = useRoute()
const router = useRouter()
const detailStore = useDetailStore()

const categories = ref([])
const formRef = ref()
const loading = ref(false)
const btnPreview = ref(false)
const imgUrl = ref('')
const businessId = ref(null)
const editorInstance = ref(null)

const commonTags = [
  '情绪管理', '焦虑', '抑郁', '压力', '睡眠',
  '冥想', '正念', '放松', '心理健康', '自我成长',
  '人际关系', '工作压力', '学习方法', '生活技巧'
]

const formData = reactive({
  title: '',
  content: '',
  coverImage: '',
  categoryId: '',
  summary: '',
  tags: '',
  tagArray: [],
  id: ''
})

const isEdit = computed(() => !!route.params.id)

const rules = reactive({
  title: [
    { required: true, message: '请输入文章标题', trigger: 'blur' },
    { max: 200, message: '文章标题最多200个字符', trigger: 'blur' }
  ],
  categoryId: [
    { required: true, message: '请选择分类', trigger: 'change' }
  ],
  summary: [
    { max: 1000, message: '文章摘要最多1000个字符', trigger: 'blur' }
  ]
})

const goBack = () => router.push('/back/knowledge')

/** 分类树拍平为「id → 名称」与带缩进的下拉选项 */
const flattenTree = (nodes, depth = 0, out = []) => {
  (nodes || []).forEach((node) => {
    out.push({
      label: depth > 0 ? `${'　'.repeat(depth)}└ ${node.categoryName}` : node.categoryName,
      value: node.id
    })
    if (node.children && node.children.length) flattenTree(node.children, depth + 1, out)
  })
  return out
}

/** 用文章实体填充表单（编辑场景） */
const applyArticle = (row) => {
  Object.assign(formData, row)
  formData.tagArray = row.tags ? String(row.tags).split(',').filter(Boolean) : []
  businessId.value = row.id
  imgUrl.value = row.coverImage ? `${fileBaseUrl}${row.coverImage}` : ''
}

onMounted(async () => {
  try {
    categories.value = flattenTree(await categoryTree())
  } catch (e) {
    categories.value = []
  }

  const id = route.params.id
  if (id) {
    // 优先用父列表页传过来的完整实体（字段零丢失），刷新场景再回源拉一次
    let row = detailStore.current && String(detailStore.current.id) === String(id)
      ? detailStore.current
      : null
    if (!row) {
      try {
        row = await getArticleDetail(id)
      } catch (e) {
        row = null
      }
    }
    if (row) {
      nextTick(() => applyArticle(row))
    }
  }
})

const beforeUpload = (file) => {
  if (!file.type.startsWith('image/')) {
    ElMessage.error('请上传图片文件')
    return false
  }
  if (file.size / 1024 / 1024 >= 5) {
    ElMessage.error('图片大小不能超过5MB')
    return false
  }
  return true
}

const handleUploadRequest = async ({ file }) => {
  if (!businessId.value) businessId.value = crypto.randomUUID()
  const fileRes = await uploadFile(file, { businessId: businessId.value })
  imgUrl.value = `${fileBaseUrl}${fileRes.filePath}`
  formData.coverImage = fileRes.filePath
}

const handleRemove = () => {
  imgUrl.value = ''
  formData.coverImage = ''
}

const handelContentChange = (data) => {
  formData.content = data.html
}

const handleEditorCreated = (editor) => {
  editorInstance.value = editor
  if (formData.content && editor) {
    nextTick(() => editor.setHtml(formData.content))
  }
}

const handleSubmit = async () => {
  if (!formRef.value) return
  const valid = await formRef.value.validate().catch(() => false)
  if (!valid) return

  loading.value = true
  // 只提交后端 DTO 认识的白名单字段，不把 id/authorId/readCount 等一并打进去
  const submitData = {
    title: formData.title,
    categoryId: formData.categoryId,
    summary: formData.summary,
    content: formData.content,
    coverImage: formData.coverImage,
    tags: (formData.tagArray || []).join(',')
  }
  try {
    if (!isEdit.value) {
      await createArticle(submitData)
    } else {
      await updateArticle(route.params.id, submitData)
    }
    ElMessage.success(isEdit.value ? '更新成功' : '新增成功')
    router.push('/back/knowledge')
  } catch (e) {
    // 失败提示已由请求拦截器统一弹出
  } finally {
    loading.value = false
  }
}
</script>

<style lang="scss" scoped>
.cover-upload {
  display: flex;
  align-items: flex-end;
  gap: 12px;
}

.cover-placeholder {
  width: 200px;
  height: 120px;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  color: #8b949e;
  background: #f6f8fa;
}

.cover-image {
  width: 200px;
  height: 120px;
  display: block;
}

.preview-block {
  margin-top: 16px;
  padding: 16px;
  border: 1px solid var(--border, #e5e7eb);
  border-radius: var(--radius-lg, 12px);

  h3 {
    margin: 0 0 12px;
    color: var(--text-1, #1f2d29);
    font-size: 16px;
  }
}
</style>