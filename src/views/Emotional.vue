<template>
  <div>
    <PageHead title="情绪日志" />
    <TableSearch :formItem="formItem" @search="handleSearch" />
    <!-- height 固定高度后表头吸顶、内容竖向滚动（后端已改成不分页直接返回 List） -->
    <el-table :data="tableData" v-loading="loading" height="600" style="width: 100%">
      <el-table-column prop="userId" label="用户ID" width="80" />
      <el-table-column label="用户" width="100">
        <template #default="scope">
          <div class="user-cell">
            <el-avatar :size="28">{{ (scope.row.nickname || scope.row.username || '?').charAt(0) }}</el-avatar>
            <span class="user-name">{{ scope.row.nickname || scope.row.username || '-' }}</span>
          </div>
        </template>
      </el-table-column>
      <el-table-column prop="diaryDate" label="记录日期" width="120" />
      <el-table-column label="情绪评分">
        <template #default="scope">
          <el-rate :model-value="scope.row.moodScore" :max="10" disabled />
        </template>
      </el-table-column>
      <el-table-column label="生活指标" width="120">
        <template #default="scope">
          <div>
            <p>睡眠：{{ scope.row.sleepQuality }} / 5</p>
            <p>压力：{{ scope.row.stressLevel }} / 5</p>
          </div>
        </template>
      </el-table-column>
      <el-table-column prop="emotionTriggers" label="情绪触发因素" width="120" />
      <el-table-column label="日记内容" width="250">
        <template #default="scope">
          <span :title="scope.row.diaryContent">{{ scope.row.diaryContentPreview || scope.row.diaryContent || '-' }}</span>
        </template>
      </el-table-column>
      <el-table-column label="操作" width="240" fixed="right">
        <template #default="scope">
          <el-button @click="viewSessionDetail(scope.row)" text type="primary">详情</el-button>
          <el-button @click="handleDelete(scope.row)" text type="danger">删除</el-button>
        </template>
      </el-table-column>
      <template #empty>
        <span>暂无情绪日志记录</span>
      </template>
    </el-table>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import PageHead from '@/components/PageHead.vue'
import TableSearch from '@/components/TableSearch.vue'
import { getEmotionalLogPage, deleteEmotionalLog } from '@/api/admin'
import { useDetailStore } from '@/stores/detail'
import { ElMessageBox, ElMessage } from 'element-plus'

const router = useRouter()
const detailStore = useDetailStore()

const formItem = [
  { comp: 'input', prop: 'userId', label: '用户ID', placeholder: '请输入用户ID' },
  {
    comp: 'select', prop: 'moodScoreRange', label: '情绪评分', placeholder: '请选择评分范围', options: [{
      label: '低分（1-3）',
      value: '1-3'
    }, {
      label: '中分（4-6）',
      value: '4-6'
    }, {
      label: '高分（7-10）',
      value: '7-10'
    }]
  }
]

// 列表
const tableData = ref([])
const loading = ref(false)

const handleSearch = async (formData) => {
  loading.value = true
  try {
    // ⚠️ 后端已改成「不分页、直接返回 List」：data 就是数组，没有 records / total 外壳
    const params = { ...formData }
    // 搜索栏的「情绪评分」下拉值是 "1-3" 这种区间，拆成后端要的 min/max 两个参数
    if (params.moodScoreRange) {
      const [min, max] = params.moodScoreRange.split('-')
      params.minMoodScore = min
      params.maxMoodScore = max
      delete params.moodScoreRange
    }
    const list = await getEmotionalLogPage(params)
    tableData.value = list || []
  } catch (e) {
    tableData.value = []
  } finally {
    loading.value = false
  }
}

// 详情：跳转到独立详情页，整条记录经 store 零丢失传给详情页
const viewSessionDetail = (row) => {
  detailStore.setCurrent(row)
  router.push(`/back/emotional/${row.id}`)
}

// 删除
const handleDelete = (row) => {
  ElMessageBox.confirm('确认删除该条记录吗？', '删除确认', {
    confirmButtonText: '确定',
    cancelButtonText: '取消',
    type: 'danger'
  }).then(async () => {
    await deleteEmotionalLog(row.id)
    ElMessage({ message: '删除成功', type: 'success' })
    handleSearch()
  }).catch(() => {})
}

onMounted(() => {
  handleSearch()
})
</script>

<style lang="scss" scoped>
.user-cell {
  display: flex;
  align-items: center;
  gap: 8px;

  .user-name {
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }
}
</style>