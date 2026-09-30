<template>
  <RoutePage title="情绪日志详情">
    <div v-loading="loading" class="detail-content" v-if="currentDetail">
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
        <div class="ai-analysis-result" v-if="hasAiAnalysis">
          <el-descriptions :column="2" border>
            <el-descriptions-item label="主要情绪">
              <el-tag :type="getAiEmotionTagType(aiData.primaryEmotion)">{{ aiData.primaryEmotion }}</el-tag>
            </el-descriptions-item>
            <el-descriptions-item label="情绪强度">
              <el-progress :percentage="aiData.emotionScore" :color="getEmotionScoreColor(aiData.emotionScore)"
                :stroke-width="8" />
            </el-descriptions-item>
            <el-descriptions-item label="风险等级">
              <el-tag :type="getRiskLevelTagType(aiData.riskLevel)">{{ getRiskLevelText(aiData.riskLevel) }}</el-tag>
            </el-descriptions-item>
            <el-descriptions-item label="情绪性质">
              <el-tag :type="aiData.isNegative ? 'danger' : 'success'">{{ aiData.isNegative ? '负面情绪' : '正面情绪'
                }}</el-tag>
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
    <el-empty v-else-if="!loading" description="未找到该条情绪日志" />
  </RoutePage>
</template>

<script setup>
import { onMounted, ref } from 'vue'
import { useRoute } from 'vue-router'
import RoutePage from '@/views/RoutePage.vue'
import { getEmotionalLogPage } from '@/api/admin'
import { useDetailStore } from '@/stores/detail'

const route = useRoute()
const detailStore = useDetailStore()

const currentDetail = ref(null)
const aiData = ref({})
const hasAiAnalysis = ref(false)
const loading = ref(false)

// —— 标签类型 / 颜色映射（与原弹窗保持一致）——
const getEmotionTagType = (emotion) => {
  const map = {
    '快乐': 'success', '开心': 'success', '平静': 'info', '兴奋': 'warning',
    '愤怒': 'danger', '悲伤': 'info', '焦虑': 'warning'
  }
  return map[emotion] || 'info'
}

const getAiEmotionTagType = (emotion) => {
  const map = {
    '快乐': 'success', '平静': 'success', '兴奋': 'warning', '满足': 'success',
    '愤怒': 'danger', '悲伤': 'info', '焦虑': 'warning', '恐惧': 'danger',
    '沮丧': 'info', '压力': 'warning'
  }
  return map[emotion] || 'info'
}

const getEmotionScoreColor = (score) => {
  if (score >= 80) return '#f56c6c'
  if (score >= 60) return '#e6a23c'
  if (score >= 40) return '#909399'
  return '#67c23a'
}

const getRiskLevelTagType = (riskLevel) => ({ 0: 'success', 1: 'info', 2: 'warning', 3: 'danger' }[riskLevel] || 'info')
const getRiskLevelText = (riskLevel) => ({ 0: '正常', 1: '关注', 2: '预警', 3: '危机' }[riskLevel] || '未知风险等级')

const parseAiAnalysis = (row) => {
  hasAiAnalysis.value = false
  aiData.value = {}
  if (row && row.aiEmotionAnalysis) {
    try {
      const parsed = JSON.parse(row.aiEmotionAnalysis)
      if (parsed && parsed.primaryEmotion) {
        aiData.value = parsed
        hasAiAnalysis.value = true
      }
    } catch (e) {
      // JSON 损坏时按「无分析结果」处理
    }
  }
}

onMounted(async () => {
  let row = detailStore.current
  // 兜底：直接刷新详情页时 store 为空 —— 情绪无独立详情接口，
  // 后端列表接口已改成分页返回全量 List，这里拉一次按 id 匹配即可，字段依旧完整。
  if (!row) {
    loading.value = true
    try {
      const list = (await getEmotionalLogPage({})) || []
      row = list.find((r) => String(r.id) === String(route.params.id)) || null
    } catch (e) {
      row = null
    } finally {
      loading.value = false
    }
  }
  if (row) {
    currentDetail.value = row
    parseAiAnalysis(row)
  }
})
</script>

<style lang="scss" scoped>
.detail-content {
  .detail-section {
    margin-bottom: 24px;

    h4 {
      position: relative;
      margin: 0 0 16px 0;
      padding-left: 12px;
      color: var(--text-1, #303133);
      font-size: 16px;
      font-weight: 600;

      &::before {
        content: '';
        position: absolute;
        left: 0;
        top: 50%;
        transform: translateY(-50%);
        width: 4px;
        height: 15px;
        border-radius: 2px;
        background: var(--brand-grad-135, linear-gradient(135deg, #1d9e75, #0f6e56));
      }
    }
  }
}

.ai-empty {
  padding: 20px 16px;
  background-color: var(--bg-soft, #f8f9fa);
  border-radius: 4px;
  text-align: center;

  .ai-empty-title {
    margin: 0 0 6px;
    font-size: 14px;
    color: var(--text-2, #606266);
  }

  .ai-empty-tip {
    margin: 0;
    font-size: 12px;
    color: var(--text-3, #909399);
  }
}

.ai-analysis-result {
  .ai-suggestion-section,
  .ai-risk-section,
  .ai-improvements-section {
    margin-top: 16px;
    padding: 12px;
    background-color: var(--bg-soft, #f8f9fa);
    border-radius: 4px;

    h5 {
      margin: 0 0 8px 0;
      color: var(--text-2, #606266);
      font-size: 14px;
      font-weight: 600;
    }
  }

  .suggestion-content,
  .risk-content {
    line-height: 1.6;
    color: var(--text-2, #606266);
    background-color: var(--bg-card, #fff);
    padding: 8px;
    border-radius: 4px;
    border: 1px solid var(--border, #ebeef5);
  }

  .improvement-list {
    margin: 0;
    padding-left: 20px;

    li {
      margin-bottom: 4px;
      color: var(--text-2, #606266);
      line-height: 1.5;
    }
  }

  :deep(.el-progress__text) {
    font-size: 12px !important;
  }
}
</style>