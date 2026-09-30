<template>
  <div class="content-container">
    <PageHead>
      <template #buttons>
        <el-button type="primary" size="default" @click="handleEdit(null)">新增知识文章</el-button>
      </template>
    </PageHead>
    <TableSearch :formItem="formItem" @search="handleSearch">
    </TableSearch>
      <el-table :data="tableData" v-loading="loading" style="margin-top: 25px;">
        <el-table-column  label="文章标题" min-width="200">
          <template #default="scope">
            <div style="display: flex;align-items: center;">
              <el-icon>
                <document  />
              </el-icon>
                <span>{{scope.row.title}}</span>
            </div>
          </template>
        </el-table-column>
        <el-table-column  label="分类" min-width="200">
          <template #default="scope">
            <div style="display: flex;align-items: center;">
              <el-icon>
                <collection  />
              </el-icon>
              <span>{{ categoryMap[scope.row.categoryId] || '-' }}</span>
            </div>
          </template>
        </el-table-column>
        <el-table-column  label="状态" width="100">
          <template #default="scope">
            <el-tag :type="scope.row.status === 1 ? 'success' : 'info'" size="small">
              {{ scope.row.status === 1 ? '已发布' : '草稿' }}
            </el-tag>
          </template>
        </el-table-column>
        <el-table-column prop="readCount"  label="阅读量" width="100" />
        <el-table-column label="发布时间" width="180">
          <template #default="scope">
            <!-- 原来绑的是 updatedAt（最后修改时间），不是发布时间 -->
            <span>{{ scope.row.publishedAt || '-' }}</span>
          </template>
        </el-table-column>
        <el-table-column  label="操作" width="240" fixed="right">
          <template #default="scope">
           <el-button type="primary" text @click="handleEdit(scope.row)">编辑</el-button>
           <el-button @click="handlePublish(scope.row)" v-if="scope.row.status !== 1" type="success" text >发布</el-button>
           <el-button @click="handleUnpublish(scope.row)" v-else type="warning" text >下线</el-button>
           <el-button text @click="handleDelete(scope.row)" type="danger">删除</el-button>
          </template>
        </el-table-column>
        <template #empty>
          <span>暂无知识文章</span>
        </template>
      </el-table>
       <el-pagination
       class="pagination-bar"
       :current-page="pagination.pageNum"
       :page-size="pagination.pageSize"
        layout="prev, pager, next"
         :total="pagination.total"
         @current-change="handleChange"
         />
       </div>
</template>

<script setup>
import { onMounted,reactive,ref } from "vue"
import { useRouter } from "vue-router"
import PageHead from '@/components/PageHead.vue'
import TableSearch from '@/components/TableSearch.vue';
import { categoryTree,articlePage,changeArtocleStatus,deleteArticle } from "@/api/admin";
import { useDetailStore } from "@/stores/detail";
import { ElMessageBox,ElMessage } from "element-plus";

// 用 reactive：TableSearch 内部会按 formItem 映射渲染，
// onMounted 里给它补 options 时需要是响应式的，否则下拉选项拿不到数据。
const formItem = reactive([
    {
        comp: 'input',
        prop: 'keyword',
        label: '标题/摘要',
        placeholder: '请输入标题或摘要关键词'
    },
    {
        comp: 'select',
        prop: 'categoryId',
        label: '分类',
        placeholder: '请选择分类',
        options: []
    },
    {
        comp: 'select',
        prop: 'status',
        label: '状态',
        placeholder: '请选择状态',
        options: [
            {
                label: '草稿',
                value: '0'
            },
            {
                label: '已发布',
                value: '1'
            }
        ]
    }
])

// 分页参数：字段名必须和后端 KnowledgeArticlePageQuery 对齐（pageNum / pageSize）
const pagination = reactive({
    pageNum: 1,
    pageSize: 10,
    total: 0,
})

const tableData = ref([])
const loading = ref(false)
const router = useRouter()
const detailStore = useDetailStore()

// 记住上一次的查询条件：翻页时不带条件会把筛选「翻丢」
const lastFormData = ref({})

const loadList = async () => {
    loading.value = true
    try {
        const { records, total } = await articlePage({
            pageNum: pagination.pageNum,
            pageSize: pagination.pageSize,
            ...lastFormData.value
        })
        tableData.value = records || []
        pagination.total = total || 0
    } catch (e) {
        tableData.value = []
        pagination.total = 0
    } finally {
        loading.value = false
    }
}

const handleSearch = (formData) => {
    lastFormData.value = formData || {}
    pagination.pageNum = 1 // 改条件后回到第 1 页，否则可能停在一个已不存在的页码上
    loadList()
}

const handleChange = (val) => {
    pagination.pageNum = val
    loadList()
}

const categoryMap = reactive({})
const categories = ref([])

/**
 * 后端 /knowledge/category/tree 返回的是**嵌套树**（CategoryTreeVO 带 children）。
 * 原实现直接 `data.map(...)` 只取到一级分类 → 子分类既不出现在下拉里，也不在 categoryMap 里
 * （列表里子分类的文章会显示成 '-'）。这里递归拍平成「id → 名称」和一个带缩进的下拉选项列表。
 */
const flattenTree = (nodes, depth = 0, out = []) => {
    (nodes || []).forEach((node) => {
        categoryMap[node.id] = node.categoryName
        out.push({
            label: depth > 0 ? `${'　'.repeat(depth)}└ ${node.categoryName}` : node.categoryName,
            value: node.id
        })
        if (node.children && node.children.length) {
            flattenTree(node.children, depth + 1, out)
        }
    })
    return out
}

onMounted(async () => {
    try {
        const data = await categoryTree()
        categories.value = flattenTree(data)
        formItem[1].options = categories.value
    } catch (e) {
        // 分类拉取失败不影响文章列表本身
    }
    loadList()
})

/**
 * 新增/编辑：跳转到独立文章编辑页。
 * 编辑时把列表整行实体经 store 零丢失传过去（列表接口已含 content / coverImage / tags 等完整字段），
 * 新增走 /create 空表单，不再依赖 ArticleDialog 弹窗。
 */
const handleEdit = (row) => {
  if (row?.id) {
    detailStore.setCurrent({ ...row })
    router.push(`/back/knowledge/edit/${row.id}`)
  } else {
    router.push('/back/knowledge/create')
  }
}

const handlePublish = (row)=>{
  ElMessageBox.confirm(`确认发布文章${row.title}吗？`, {
    confirmButtonText: '确定',
    cancelButtonText: '取消',
    type: 'warning'
  }).then(() => {
    // 1 = 已发布
    changeArtocleStatus(row.id,{status:1}).then(()=>{
        ElMessage.success('发布成功')
        loadList()
    })
  }).catch(() => {})
}

/**
 * 下线：后端只接受 0(下架) / 1(发布) 两个值，
 * 传 2 会被 `updateStatus` 拒绝（"状态值不合法"）。
 * 所以「下线」= 置为 0，用户端只会看到 status=1 的文章，效果一致。
 */
const handleUnpublish = (row)=>{
  ElMessageBox.confirm(`确认下线文章${row.title}吗？`, {
    confirmButtonText: '确定',
    cancelButtonText: '取消',
    type: 'warning'
  }).then(() => {
    changeArtocleStatus(row.id,{status:0}).then(()=>{
        ElMessage.info('下线成功')
        loadList()
    })
  }).catch(() => {})
}

const handleDelete = (row)=>{
  ElMessageBox.confirm(`确认删除文章${row.title}吗？`, {
    confirmButtonText: '确定',
    cancelButtonText: '取消',
    type: 'warning'
  }).then(() => {
    deleteArticle(row.id).then(()=>{
        ElMessage.success('删除成功')
        loadList()
    })
  }).catch(() => {})
}
</script>

<style lang="scss" scoped>
.pagination-bar {
  margin-top: 25px;
  display: flex;
  justify-content: flex-end;
}
</style>
