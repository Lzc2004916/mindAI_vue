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

    <el-dialog v-model="detailDialogVisible" title="情绪日志详情" width="800px" :close-on-click-modal="false">
      <div class="detail-content" v-if="currentDetail">
        <div class="detail-section">
          <h4>用户信息</h4>
          <el-descriptions :column="2" border>
            <el-descriptions-item label="用户名">{{ currentDetail.username }}</el-descriptions-item>
            <el-descriptions-item label="昵称">{{ currentDetail.nickname }}</el-descriptions-item>
            <el-descriptions-item label="用户ID">{{ currentDetail.userId }}</el-descriptions-item>
            <el-descriptions-item label="记录日期">{{ currentDetail.diaryDate }}</el-descriptions-item>
          </el-descriptions>
        </div>
        <div class="detail-section">
          <h4>情绪状态</h4>
          <el-descriptions :column="2" border>
            <el-descriptions-item label="情绪评分">
              <el-rate :model-value="currentDetail.moodScore" :max="10" disabled />
            </el-descriptions-item>
            <el-descriptions-item label="主要情绪">
              <el-tag :type="getEmotionTagType(currentDetail.dominantEmotion)">{{
                currentDetail.dominantEmotion || '-' }}</el-tag>
            </el-descriptions-item>
            <el-descriptions-item label="睡眠质量">{{ currentDetail.sleepQuality || '-' }}/5</el-descriptions-item>
            <el-descriptions-item label="压力水平">{{ currentDetail.stressLevel || '-' }}/5</el-descriptions-item>
          </el-descriptions>
        </div>
        <div class="detail-section">
          <h4>日记内容</h4>
          <el-descriptions :column="1" border>
            <el-descriptions-item label="情绪触发因素">{{ currentDetail.emotionTriggers || '无' }}</el-descriptions-item>
            <el-descriptions-item label="日记内容">{{ currentDetail.diaryContent || '无' }}</el-descriptions-item>
          </el-descriptions>
        </div>
        <div class="detail-section">
          <h4>AI情绪分析结果</h4>
          <!-- 没有分析结果时给明确空态，而不是渲染一屏「未知风险等级」的空标签 -->
          <div class="ai-analysis-result" v-if="hasAiAnalysis">
            <el-descriptions :column="2" border>
              <el-descriptions-item label="主要情绪">
                <el-tag :type="getAiEmotionTagType(aiData.primaryEmotion)">{{
                  aiData.primaryEmotion }}</el-tag>
              </el-descriptions-item>
              <el-descriptions-item label="情绪强度">
                <el-progress :percentage="aiData.emotionScore"
                  :color="getEmotionScoreColor(aiData.emotionScore)" :stroke-width="8" />
              </el-descriptions-item>
              <el-descriptions-item label="风险等级">
                <el-tag :type="getRiskLevelTagType(aiData.riskLevel)">{{ getRiskLevelText(aiData.riskLevel) }}</el-tag>
              </el-descriptions-item>
              <el-descriptions-item label="情绪性质">
                <el-tag :type="aiData.isNegative ? 'danger' : 'success'">{{ aiData.isNegative ? '负面情绪' :
                  '正面情绪' }}</el-tag>
              </el-descriptions-item>
            </el-descriptions>
            <div class="ai-suggestion-section">
              <h5>专业建议</h5>
              <div class="suggestion-content">{{ aiData.suggestion || '无' }}</div>
            </div>
            <div class="ai-risk-section">
              <h5>风险描述</h5>
              <div class="risk-content">{{ aiData.riskDescription || '无' }}</div>
            </div>
            <div class="ai-improvements-section">
              <h5>改善建议</h5>
              <ul class="improvement-list" v-if="aiData.improvementSuggestions && aiData.improvementSuggestions.length">
                <li v-for="(item, index) in aiData.improvementSuggestions" :key="index">{{ item }}</li>
              </ul>
              <div v-else class="suggestion-content">无</div>
            </div>
          </div>
          <div v-else class="ai-empty">
            <p class="ai-empty-title">该日记还没有 AI 分析结果</p>
            <p class="ai-empty-tip">
              保存日记后系统会自动排队分析，稍等片刻再刷新查看
              （当前状态：{{ currentDetail.hasAiEmotionAnalysis ? '已完成' : '待分析' }}）
            </p>
          </div>
        </div>
        <div class="detail-section">
          <h4>时间信息</h4>
          <el-descriptions :column="2" border>
            <el-descriptions-item label="创建时间">{{ currentDetail.createdAt }}</el-descriptions-item>
            <el-descriptions-item label="更新时间">{{ currentDetail.updatedAt }}</el-descriptions-item>
          </el-descriptions>
        </div>
      </div>
      <template #footer>
        <el-button @click="detailDialogVisible = false">关闭</el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import PageHead from '@/components/PageHead.vue'
import TableSearch from '@/components/TableSearch.vue'
import { getEmotionalLogPage, deleteEmotionalLog } from '@/api/admin'
import { ElMessageBox, ElMessage } from 'element-plus'

const getEmotionTagType = (emotion) => {
  const emotionTypes = {
    '快乐': 'success',
    '开心': 'success',
    '平静': 'info',
    '兴奋': 'warning',
    '愤怒': 'danger',
    '悲伤': 'info',
    '焦虑': 'warning'
  }
  return emotionTypes[emotion] || 'info'
}

const getAiEmotionTagType = (emotion) => {
  const emotionTagMap = {
    '快乐': 'success',
    '平静': 'success',
    '兴奋': 'warning',
    '满足': 'success',
    '愤怒': 'danger',
    '悲伤': 'info',
    '焦虑': 'warning',
    '恐惧': 'danger',
    '沮丧': 'info',
    '压力': 'warning'
  }
  return emotionTagMap[emotion] || 'info'
}

const getEmotionScoreColor = (score) => {
  if (score >= 80) return '#f56c6c'
  if (score >= 60) return '#e6a23c'
  if (score >= 40) return '#909399'
  return '#67c23a'
}

const getRiskLevelTagType = (riskLevel) => {
  const riskTagMap = {
    0: 'success',
    1: 'info',
    2: 'warning',
    3: 'danger'
  }
  return riskTagMap[riskLevel] || 'info'
}

const getRiskLevelText = (riskLevel) => {
  const riskTextMap = {
    0: '正常',
    1: '关注',
    2: '预警',
    3: '危机'
  }
  return riskTextMap[riskLevel] || '未知风险等级'
}

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

// 详情
const detailDialogVisible = ref(false)
const currentDetail = ref(null)
const aiData = ref(null)
const hasAiAnalysis = ref(false)
const viewSessionDetail = (row) => {
  currentDetail.value = row
  hasAiAnalysis.value = false
  aiData.value = {}
  if (row.aiEmotionAnalysis) {
    try {
      const parsed = JSON.parse(row.aiEmotionAnalysis)
      // 关键字段存在才算「有分析结果」—— 防止库里存着 '{}' 这种坏数据时渲染出一屏空标签
      if (parsed && parsed.primaryEmotion) {
        aiData.value = parsed
        hasAiAnalysis.value = true
      }
    } catch (e) {
      // JSON 损坏时按「无分析结果」处理，而不是让整个弹窗崩掉
      hasAiAnalysis.value = false
    }
  }
  detailDialogVisible.value = true
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

.detail-content {
  .detail-section {
    margin-bottom: 24px;

    h4 {
      margin: 0 0 16px 0;
      color: #303133;
      font-size: 16px;

      i {
        margin-right: 8px;
        color: #409eff;
      }
    }
  }
}

// AI 分析缺失时的空态
.ai-empty {
  padding: 20px 16px;
  background-color: #f8f9fa;
  border-radius: 4px;
  text-align: center;

  .ai-empty-title {
    margin: 0 0 6px;
    font-size: 14px;
    color: #606266;
  }

  .ai-empty-tip {
    margin: 0;
    font-size: 12px;
    color: #909399;
  }
}

.ai-analysis-result {

  .ai-suggestion-section,
  .ai-risk-section,
  .ai-improvements-section {
    margin-top: 16px;
    padding: 12px;
    background-color: #f8f9fa;
    border-radius: 4px;

    h5 {
      margin: 0 0 8px 0;
      color: #606266;
      font-size: 14px;
      font-weight: 600;

      i {
        margin-right: 6px;
        color: #909399;
      }
    }
  }

  .suggestion-content,
  .risk-content {
    line-height: 1.6;
    color: #606266;
    background-color: white;
    padding: 8px;
    border-radius: 4px;
    border: 1px solid #ebeef5;
  }

  .improvement-list {
    margin: 0;
    padding-left: 20px;

    li {
      margin-bottom: 4px;
      color: #606266;
      line-height: 1.5;
    }
  }

  .el-progress {
    .el-progress__text {
      font-size: 12px !important;
    }
  }
}
</style>
