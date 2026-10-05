<template>
  <div class="emotion-diary-page">
    <div class="page-container">
      <!-- 页头 -->
      <header class="page-header">
        <div>
          <h1 class="page-title">我的情绪花园</h1>
          <p class="page-desc">记录每天的自己和情绪相处的方式，坚持下来会看到变化</p>
        </div>
      </header>

      <!-- 写日记 -->
      <section class="card">
        <h2 class="card-title">
          {{ editingExisting ? '修改这一天的记录' : '记录今天' }}
        </h2>
        <el-form :model="form" :rules="rules" ref="formRef" label-width="90px" class="diary-form">
          <el-row :gutter="20">
            <el-col :xs="24" :sm="12">
              <el-form-item label="记录日期" prop="diaryDate">
                <el-date-picker
                  v-model="form.diaryDate"
                  type="date"
                  value-format="YYYY-MM-DD"
                  placeholder="选择日期"
                  :disabled-date="disabledFuture"
                  style="width: 100%"
                />
              </el-form-item>
            </el-col>
            <el-col :xs="24" :sm="12">
              <el-form-item label="主要情绪" prop="dominantEmotion">
                <el-select v-model="form.dominantEmotion" placeholder="今天整体感觉更像哪种？" style="width: 100%">
                  <el-option v-for="item in emotionOptions" :key="item" :label="item" :value="item" />
                </el-select>
              </el-form-item>
            </el-col>
            <el-col :span="24">
              <el-form-item label="情绪评分" prop="moodScore">
                <div class="slider-row">
                  <el-slider v-model="form.moodScore" :min="1" :max="10" :step="1" show-stops style="flex: 1" />
                  <span class="slider-value">{{ form.moodScore }} / 10</span>
                </div>
              </el-form-item>
            </el-col>
            <el-col :xs="24" :sm="12">
              <el-form-item label="睡眠质量">
                <el-rate v-model="form.sleepQuality" :max="5" />
              </el-form-item>
            </el-col>
            <el-col :xs="24" :sm="12">
              <el-form-item label="压力水平">
                <el-rate v-model="form.stressLevel" :max="5" :colors="stressColors" />
              </el-form-item>
            </el-col>
            <el-col :span="24">
              <el-form-item label="触发因素">
                <el-input v-model="form.emotionTriggers" placeholder="是什么影响了今天的情绪？（可选）" maxlength="200" />
              </el-form-item>
            </el-col>
            <el-col :span="24">
              <el-form-item label="日记内容" prop="diaryContent">
                <el-input
                  v-model="form.diaryContent"
                  type="textarea"
                  :rows="5"
                  maxlength="2000"
                  show-word-limit
                  placeholder="今天发生了什么？当时心里是怎么想的？"
                />
              </el-form-item>
            </el-col>
          </el-row>

          <div class="form-actions">
            <span v-if="editingExisting" class="overwrite-tip">
              这一天已经写过日记，提交会<strong>覆盖</strong>当天记录
            </span>
            <span v-else class="overwrite-tip">同一天只能有一条记录，重复提交会更新它</span>
            <el-button type="primary" :loading="saving" @click="handleSave">保存记录</el-button>
          </div>
        </el-form>
      </section>

      <!-- 历史记录 -->
      <section class="card">
        <div class="list-header">
          <h2 class="card-title">历史记录</h2>
          <div class="list-tools">
            <el-date-picker
              v-model="month"
              type="month"
              value-format="YYYY-MM"
              placeholder="全部月份"
              clearable
              @change="loadMine"
            />
            <el-button :loading="loading" @click="loadMine">刷新</el-button>
          </div>
        </div>

        <div v-loading="loading" class="diary-list">
          <div v-if="!loading && diaries.length === 0" class="empty-state">
            <p class="empty-title">还没有日记</p>
            <p class="empty-tip">在上面写下第一篇吧，AI 会帮你分析当时的情绪状态</p>
          </div>

          <article v-for="item in diaries" :key="item.id" class="diary-item">
            <div class="diary-head">
              <div class="diary-left">
                <span class="diary-date">{{ item.diaryDate }}</span>
                <el-tag size="small" :type="moodTagType(item.moodScore)">{{ item.moodScore }} 分</el-tag>
                <el-tag v-if="item.dominantEmotion" size="small" type="info">{{ item.dominantEmotion }}</el-tag>
              </div>
              <div class="diary-right">
                <span v-if="item.sleepQuality">睡眠 {{ item.sleepQuality }}/5</span>
                <span v-if="item.stressLevel">压力 {{ item.stressLevel }}/5</span>
                <el-button
                  link
                  type="danger"
                  size="small"
                  @click="handleDeleteDiary(item)"
                >删除</el-button>
              </div>
            </div>

            <p v-if="item.emotionTriggers" class="diary-triggers">影响因素：{{ item.emotionTriggers }}</p>
            <p v-if="item.diaryContent" class="diary-content">{{ item.diaryContent }}</p>

            <!-- AI 分析 -->
            <div v-if="analysisOf(item)" class="ai-block">
              <div class="ai-block-head">
                <span class="ai-block-title">AI 情绪分析</span>
                <el-tag size="small" :type="riskTagType(analysisOf(item).riskLevel)">
                  {{ riskText(analysisOf(item).riskLevel) }}
                </el-tag>
              </div>
              <div class="ai-tags">
                <el-tag size="small">主要情绪：{{ analysisOf(item).primaryEmotion || '-' }}</el-tag>
                <el-tag size="small" :type="analysisOf(item).isNegative ? 'danger' : 'success'">
                  {{ analysisOf(item).isNegative ? '负面情绪' : '正面情绪' }}
                </el-tag>
                <el-tag size="small">强度：{{ analysisOf(item).emotionScore }}</el-tag>
              </div>
              <p v-if="analysisOf(item).suggestion" class="ai-text">
                <span class="ai-label">专业建议</span>{{ analysisOf(item).suggestion }}
              </p>
              <p v-if="analysisOf(item).riskDescription" class="ai-text">
                <span class="ai-label">风险描述</span>{{ analysisOf(item).riskDescription }}
              </p>
              <ul
                v-if="analysisOf(item).improvementSuggestions && analysisOf(item).improvementSuggestions.length"
                class="ai-actions"
              >
                <li v-for="(tip, index) in analysisOf(item).improvementSuggestions" :key="index">{{ tip }}</li>
              </ul>
            </div>
            <p v-else class="ai-pending">AI 分析中，稍后刷新即可看到结果</p>
          </article>
        </div>
      </section>
    </div>
  </div>
</template>

<script setup>
import { computed, onMounted, reactive, ref, watch } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import { getMyEmotionDiaries, saveEmotionDiary, deleteEmotionDiary } from '@/api/frontend'

const emotionOptions = ['开心', '平静', '兴奋', '满足', '好奇', '疲惫', '焦虑', '沮丧', '愤怒', '悲伤', '恐惧', '压力']
const stressColors = ['#67c23a', '#95d475', '#e6a23c', '#f89898', '#f56c6c']

const todayStr = () => {
  const d = new Date()
  const pad = (n) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`
}

const formRef = ref()
const saving = ref(false)
const loading = ref(false)
const month = ref('')
const diaries = ref([])

const form = reactive({
  diaryDate: todayStr(),
  moodScore: 6,
  dominantEmotion: '',
  emotionTriggers: '',
  diaryContent: '',
  sleepQuality: 3,
  stressLevel: 3
})

const rules = {
  diaryDate: [{ required: true, message: '请选择日期', trigger: 'change' }],
  moodScore: [{ required: true, message: '请选择情绪评分', trigger: 'change' }],
  diaryContent: [{ required: true, message: '写点什么吧，AI 需要内容才能分析', trigger: 'blur' }]
}

/** 当天已有记录时，表单变成「修改」语义 */
const editingExisting = computed(() =>
  diaries.value.some((item) => item.diaryDate === form.diaryDate)
)

const disabledFuture = (date) => date.getTime() > Date.now()

const moodTagType = (score) => {
  if (score >= 8) return 'success'
  if (score >= 5) return 'warning'
  return 'danger'
}

const riskText = (level) => {
  const map = { 0: '正常', 1: '关注', 2: '预警', 3: '危机' }
  return map[level] ?? '未知'
}
const riskTagType = (level) => {
  const map = { 0: 'success', 1: 'info', 2: 'warning', 3: 'danger' }
  return map[level] ?? 'info'
}

/**
 * 解析 aiEmotionAnalysis（后端存的是 JSON 字符串）。
 * 必须容错：可能为空、可能是 '{}'、也可能被写坏 —— 直接 JSON.parse 会让整页崩掉。
 */
const analysisCache = new Map()
const analysisOf = (item) => {
  const raw = item?.aiEmotionAnalysis
  if (!raw) return null
  if (analysisCache.has(item.id)) return analysisCache.get(item.id)
  let parsed = null
  try {
    const obj = JSON.parse(raw)
    if (obj && obj.primaryEmotion) parsed = obj
  } catch (e) {
    parsed = null
  }
  analysisCache.set(item.id, parsed)
  return parsed
}

const handleDeleteDiary = async (item) => {
  try {
    await ElMessageBox.confirm(
      `确定删除 ${item.diaryDate} 的日记吗？AI 分析结果也会一起删除，不可恢复。`,
      '删除确认',
      { type: 'warning', confirmButtonText: '删除', cancelButtonText: '取消' }
    )
  } catch {
    return
  }
  try {
    await deleteEmotionDiary(item.id)
    ElMessage.success('日记已删除')
    await loadMine()
  } catch (e) {
    ElMessage.error('删除失败，请重试')
  }
}

const loadMine = async () => {
  loading.value = true
  try {
    const list = await getMyEmotionDiaries(month.value || undefined)
    analysisCache.clear()
    diaries.value = (list || []).slice().sort((a, b) => String(b.diaryDate).localeCompare(String(a.diaryDate)))
    // 切换日期时若已有记录，顺便把表单填上，避免用户以为要重新写
    fillFormFromExisting()
  } catch (e) {
    diaries.value = []
  } finally {
    loading.value = false
  }
}

const fillFormFromExisting = () => {
  const exist = diaries.value.find((item) => item.diaryDate === form.diaryDate)
  if (!exist) return
  form.moodScore = exist.moodScore ?? form.moodScore
  form.dominantEmotion = exist.dominantEmotion || ''
  form.emotionTriggers = exist.emotionTriggers || ''
  form.diaryContent = exist.diaryContent || ''
  form.sleepQuality = exist.sleepQuality ?? form.sleepQuality
  form.stressLevel = exist.stressLevel ?? form.stressLevel
}

const handleSave = async () => {
  const valid = await formRef.value.validate().catch(() => false)
  if (!valid) return
  saving.value = true
  try {
    await saveEmotionDiary({ ...form })
    ElMessage.success(editingExisting.value ? '已更新当天记录' : '记录成功，AI 正在分析中')
    // 保存后重新拉一次：既刷新列表，也确认后端已落库
    await loadMine()
  } catch (e) {
    // 失败提示由请求拦截器统一弹出
  } finally {
    saving.value = false
  }
}

// 用户改日期时，把该日期已有的记录填回表单
watch(
  () => form.diaryDate,
  () => fillFormFromExisting()
)

onMounted(loadMine)
</script>

<style lang="scss" scoped>
.emotion-diary-page {
  height: 100%;
  overflow-y: auto;
  background: transparent;
  padding: 24px;
  animation: fade-up 0.4s var(--ease-out) both;

  .page-container {
    max-width: 1000px;
    margin: 0 auto;
  }

  .page-header {
    margin-bottom: 20px;

    .page-title {
      font-size: 24px;
      font-weight: 700;
      color: var(--text-1);
      margin: 0 0 6px;
    }

    .page-desc {
      font-size: 13px;
      color: var(--text-3);
      margin: 0;
    }
  }

  .card {
    background: var(--bg-card);
    border: 1px solid var(--border);
    border-radius: var(--radius-lg);
    padding: 24px;
    margin-bottom: 20px;
    box-shadow: var(--shadow-card);
    transition: box-shadow var(--transition);

    .card-title {
      font-size: 16px;
      font-weight: 600;
      color: var(--text-1);
      margin: 0 0 16px;
    }
  }

  .slider-row {
    display: flex;
    align-items: center;
    gap: 16px;
    width: 100%;

    .slider-value {
      font-size: 13px;
      color: var(--text-2);
      width: 60px;
      text-align: right;
      flex-shrink: 0;
    }
  }

  .form-actions {
    display: flex;
    align-items: center;
    justify-content: flex-end;
    gap: 16px;

    .overwrite-tip {
      font-size: 12px;
      color: var(--text-3);
    }
  }

  .list-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 12px;
    flex-wrap: wrap;

    .card-title {
      margin: 0;
    }

    .list-tools {
      display: flex;
      gap: 8px;
    }
  }

  .diary-list {
    margin-top: 8px;
    min-height: 120px;
  }

  .empty-state {
    padding: 40px 0;
    text-align: center;

    .empty-title {
      margin: 0 0 6px;
      font-size: 14px;
      color: var(--text-2);
    }

    .empty-tip {
      margin: 0;
      font-size: 12px;
      color: var(--text-3);
    }
  }

  .diary-item {
    padding: 16px 0;
    border-bottom: 0.5px solid var(--border);

    &:last-child {
      border-bottom: none;
    }

    .diary-head {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 12px;
      flex-wrap: wrap;

      .diary-left {
        display: flex;
        align-items: center;
        gap: 8px;

        .diary-date {
          font-size: 14px;
          font-weight: 600;
          color: var(--text-1);
        }
      }

      .diary-right {
        display: flex;
        gap: 12px;
        font-size: 12px;
        color: var(--text-3);
      }
    }

    .diary-triggers {
      margin: 10px 0 0;
      font-size: 12px;
      color: var(--text-2);
    }

    .diary-content {
      margin: 8px 0 0;
      font-size: 13px;
      line-height: 1.7;
      color: var(--text-2);
      white-space: pre-wrap;
    }

    .ai-pending {
      margin: 10px 0 0;
      font-size: 12px;
      color: var(--text-3);
    }
  }

  .ai-block {
    margin-top: 12px;
    padding: 12px;
    background: var(--brand-hover-bg);
    border-radius: 10px;

    .ai-block-head {
      display: flex;
      align-items: center;
      justify-content: space-between;
      margin-bottom: 8px;

      .ai-block-title {
        font-size: 13px;
        font-weight: 600;
        color: var(--brand);
      }
    }

    .ai-tags {
      display: flex;
      gap: 8px;
      flex-wrap: wrap;
      margin-bottom: 8px;
    }

    .ai-text {
      margin: 6px 0 0;
      font-size: 13px;
      line-height: 1.7;
      color: var(--text-2);

      .ai-label {
        display: inline-block;
        margin-right: 6px;
        color: var(--brand);
        font-weight: 500;
      }
    }

    .ai-actions {
      margin: 8px 0 0;
      padding-left: 18px;

      li {
        font-size: 13px;
        line-height: 1.7;
        color: var(--text-2);
        list-style: disc;
      }
    }
  }
}
</style>
