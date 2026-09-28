<template>
  <el-dialog
    :title="isEdit ? '编辑文章' : '新增文章'"
    v-model="dialogVisible"
    width="50%"
    destroy-on-close
  >
  <el-form ref="formRef" :model="formData" :rules="rules">
    <el-form-item label="文章标题" prop="title">
      <el-input v-model="formData.title" placeholder="请输入文章标题" :maxlength="200" show-word-limit></el-input>
    </el-form-item>
    <el-form-item label="所属分类" prop="categoryId">
      <el-select v-model="formData.categoryId" placeholder="请选择分类">
        <el-option v-for="item in props.categories" :key="item.value" :label="item.label" :value="item.value"></el-option>
      </el-select>
    </el-form-item>
     <el-form-item label="文章摘要" prop="summary">
      <el-input type="textarea" v-model="formData.summary" placeholder="请输入文章摘要(可选)" :maxlength="1000" show-word-limit :rows="4"></el-input>
    </el-form-item>
     <el-form-item label="标签(非必填)" prop="tags">
      <el-select v-model="formData.tagArray" placeholder="请输入文章标签(可选)" multiple filterable allow-create style="width: 100%;">
        <el-option v-for="item in commonTags" :key="item" :label="item" :value="item" ></el-option>
      </el-select>
    </el-form-item>
     <el-form-item label="封面图片">
     <div class="cover-upload">
        <el-upload
        action=""
        class="#"
        :before-upload="beforeUpload"
        :http-request="handleUploadRequest"
        :show-file-list="false"
        accept="image/*"
        >
        <div v-if="!imgUrl" class="cover-placeholder">
            <p>点击上传封面</p>
        </div>
        <img v-else :src="imgUrl" class="cover-image" alt="封面图片">
        </el-upload>
        <div v-if="imgUrl" class="cover-remo">
            <el-button type="danger" size="small" @click="handleRemove">移除封面</el-button>
        </div>
     </div>
    </el-form-item>
    <el-form-item label="文章内容" prop="content">
      <!-- 内容走单向流：向下用 :model-value 初始化，向上只接 @Change -->
      <RichTextEditor
      :model-value="formData.content"
      placeholder = "请输入文章内容，支持富文本格式"
      :maxCharCount="5000"
      @Change="handelContentChange"
      @created="handleEditorCreated"
      min-height="400px"
      ></RichTextEditor>
    </el-form-item>
  </el-form>
  <div v-if="btnPreview">
    <h3>内容预览</h3>
    <div v-html="formData.content"></div>
  </div>
  <template #footer>
    <el-button type="primary" @click="btnPreview = !btnPreview">{{ btnPreview ? '隐藏预览' : '预览效果' }}</el-button>
    <el-button type="danger" @click="handleClose">取消</el-button>
    <el-button type="primary" @click="handleSubmit" :loading="loading">{{ isEdit ? '更新' : '新增' }}</el-button>
  </template>
  </el-dialog>
</template>

<script setup>
import { computed,reactive,ref,nextTick,watch } from "vue"
import { ElMessage } from 'element-plus'
import { uploadFile,createArticle,updateArticle } from "@/api/admin";
import {fileBaseUrl} from "@/config/index.js"
import RichTextEditor from "@/components/RichTextEditor.vue"
const props = defineProps({
    modelValue: {
        type: Boolean,
        default: false
    },
    categories: {
        type: Array,
        default: ()=>[]
    },
    article :{
        type: Object,
        default: null,
    }
})
const formData = reactive({
    "title": "",
    "content": "",
    "coverImage": "",
    "categoryId": "",
    "summary": "",
    "tags": "",
    "tagArray": [],   // 标签选择器绑定的是它（提交时再 join 成字符串）
    "id": ""
})
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
    ],
})
const imgUrl = ref('')
const businessId = ref(null)
const commonTags = [
'情绪管理', '焦虑', '抑郁', '压力', '睡眠',
'冥想', '正念', '放松', '心理健康', '自我成长',
'人际关系', '工作压力', '学习方法', '生活技巧'
]
const emit = defineEmits(['update:modelValue','success'])
watch(() => props.article,(newVal) => {
    if (newVal) {
        nextTick(()=>{
        Object.assign(formData,newVal)
        // ⚠️ 关键：后端把 tags 存成逗号字符串，而标签选择器绑的是 tagArray（数组）。
        //    原来只 Object.assign 了 formData，tagArray 拿不到值 →
        //    编辑时标签显示不出来，且提交时 `formData.tagArray.join(',')` 会报
        //    "Cannot read properties of undefined (reading 'join')"，更新直接失败。
        formData.tagArray = newVal.tags ? String(newVal.tags).split(',').filter(Boolean) : []
        businessId.value = newVal.id
        // 封面为空时要给空串，否则会拼出 "http://host" 这种无效地址 → 裂图
        imgUrl.value = newVal.coverImage ? `${fileBaseUrl}${newVal.coverImage}` : ''
        })
    } else {
        // 新增模式：清空残留的编辑数据
        Object.assign(formData, { title:'', content:'', coverImage:'', categoryId:'', summary:'', tags:'', id:'' })
        formData.tagArray = []
        businessId.value = null
        imgUrl.value = ''
    }
})
const dialogVisible = computed({
    get() {
        return props.modelValue
    },
    set(val) {
        emit('update:modelValue', val)
    }
})

const beforeUpload = (file)=>{
    if(!file.type.startsWith('image/')){
        ElMessage.error('请上传图片文件')
        return false
    }
    const isLt5M = file.size / 1024 / 1024 < 5
    if(!isLt5M){
        ElMessage.error('图片大小不能超过5MB')
        return false
    }
    return true
}
const handleUploadRequest = async({file})=>{
    // 复用已有 businessId：编辑时用文章 id，新增时首次上传生成一次后一直复用。
    // 原来每次都 crypto.randomUUID() → 一篇文章多次换封面会散落多个孤儿文件。
    if (!businessId.value) {
        businessId.value = crypto.randomUUID()
    }
    const fileRes = await uploadFile(file,{
        businessId: businessId.value,
    })
    imgUrl.value = `${fileBaseUrl}${fileRes.filePath}`
    formData.coverImage = fileRes.filePath
}
const handleRemove = ()=>{
    imgUrl.value = ''
    formData.coverImage = ''
}
//富文本
const handelContentChange = (data)=>{
    formData.content = data.html;
}
const editorInstance = ref(null)
const handleEditorCreated = (editor)=>{
    editorInstance.value = editor
    if(formData.content && editor){
        nextTick(()=>{
        editor.setHtml(formData.content)
        })
    }
}
const formRef = ref()
const btnPreview = ref(false);
const loading = ref(false)
const handleClose = ()=>{
    formRef.value?.resetFields()
    businessId.value = null
    handleRemove()
    formData.tagArray = []
    emit('update:modelValue',false)
}
const handleSubmit = async ()=>{
    // formRef 可能还没挂上（destroy-on-close 场景下刚打开就点提交）
    if (!formRef.value) return
    const valid = await formRef.value.validate().catch(() => false)
    if (!valid) return
    loading.value = true
    /**
     * ⚠️ 只提交后端 DTO 认识的字段（白名单），不要 `...formData` 一把梭。
     * 编辑模式下 watch 里做过 `Object.assign(formData, 整行实体)`，于是 formData 里
     * 还混着 id / authorId / readCount / status / publishedAt / createdAt / updatedAt —— 
     * 这些都会被打进请求体。后端目前靠 Jackson 忽略未知字段才没报错，
     * 等于把「能不能提交」这件事故意挂在了框架的默认配置上，属于不该留的隐患。
     * 顺带：tagArray 只是选择器的中间态，提交时拼成 tags 字符串。
     */
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
            // 新增：后端 create() 自己用 UUID 生成主键、并按 status 缺省为「已发布」
            await createArticle(submitData)
        } else {
            await updateArticle(props.article.id, submitData)
        }
        ElMessage.success(isEdit.value ? '更新成功' : '新增成功')
        emit('success')
    } catch (e) {
        // 失败提示已由请求拦截器统一弹出；这里只负责把 loading 复位（原实现无 catch，失败会一直转圈）
    } finally {
        loading.value = false
    }
}
const isEdit = computed(()=>{
    return !!props.article?.id
})
</script>

<style lang="scss" scoped>
.cover-placeholder{
    width: 200px;
height: 120px;
display:flex;
flex-direction: column;
align-items: center;
justify-content: center;
color:#8b949e;
background:#f6f8fa;
}
.cover-image{
   width: 200px;
height: 120px;
display: block;
}
</style>
