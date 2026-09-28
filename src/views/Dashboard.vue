<template>
  <div class="dashboard-container" v-loading="loading" element-loading-text="加载中...">
    <!-- 概览卡片 -->
    <el-row :gutter="20">
      <el-col v-for="card in statCards" :key="card.key" :span="6">
        <el-card v-if="aiData.systemOverview">
          <div class="card-content">
            <div class="avatar" :class="card.cls">
              <el-image style="width: 40px; height: 40px" :src="card.icon" />
            </div>
            <div class="info">
              <p class="title">{{ card.title }}</p>
              <p class="number">{{ card.value }}</p>
              <p class="subtitle-title">{{ card.subtitle }}</p>
            </div>
          </div>
        </el-card>
      </el-col>
    </el-row>

    <!-- 图表区域 -->
    <el-row style="margin-top: 20px;" :gutter="20">
      <el-col :span="12">
        <el-card style="width: 100%">
          <template #header>
            <div class="card-header">情绪趋势分析</div>
          </template>
          <div class="chart-content">
            <div ref="emotionChartRef" style="width: 100%; height:300px"></div>
          </div>
        </el-card>
      </el-col>
      <el-col :span="12">
        <el-card style="width: 100%">
          <template #header>
            <div class="card-header">咨询会话统计</div>
          </template>
          <div class="chart-content">
            <div v-if="aiData.consultationStats" class="consultation-stats">
              <div class="stat-item">
                <div class="stat-label">总会话数</div>
                <div class="stat-value">{{ aiData.consultationStats.totalSessions }}</div>
              </div>
              <div class="stat-item">
                <div class="stat-label">平均时长</div>
                <div class="stat-value">{{ aiData.consultationStats.avgDurationMinutes }}</div>
              </div>
              <div class="stat-item">
                <div class="stat-label">活跃用户</div>
                <div class="stat-value">{{ aiData.systemOverview.activeUsers }}</div>
              </div>
            </div>
            <div ref="consultationChartRef" style="width: 100%; height:260px"></div>
          </div>
        </el-card>
      </el-col>
    </el-row>

    <el-row style="margin-top: 20px;">
      <el-card style="width: 100%">
        <template #header>
          <div class="card-header">用户活跃度趋势</div>
        </template>
        <div class="chart-content">
          <div ref="userActivityChartRef" style="width: 100%; height:300px"></div>
        </div>
      </el-card>
    </el-row>
  </div>
</template>

<script setup>
import { getAnalyticsOverview } from '@/api/admin'
import { onMounted, onUnmounted, ref, computed, nextTick } from 'vue'
import * as echarts from 'echarts'
// 静态导入图片资源（Vite 别名解析更可靠）
import iconUrl1 from '@/assets/images/users.png'
import iconUrl2 from '@/assets/images/like.png'
import iconUrl3 from '@/assets/images/comments.png'
import iconUrl4 from '@/assets/images/smile.png'

const aiData = ref({})
const loading = ref(true)

// 概览卡片配置
const statCards = computed(() => {
  const ov = aiData.value.systemOverview || {}
  return [
    { key: 'users', cls: 'users', icon: iconUrl1, title: '总用户数', value: ov.totalUsers, subtitle: `活跃用户：${ov.activeUsers}` },
    { key: 'diary', cls: 'like', icon: iconUrl2, title: '情绪日志', value: ov.totalDiaries, subtitle: `今日新增：${ov.todayNewDiaries}` },
    { key: 'session', cls: 'comments', icon: iconUrl3, title: '咨询会话', value: ov.totalSessions, subtitle: `今日新增：${ov.todayNewSessions}` },
    { key: 'mood', cls: 'smile', icon: iconUrl4, title: '平均情绪', value: `${ov.avgMoodScore}/10`, subtitle: '情绪健康指数' }
  ]
})

// ============ 图表实例管理 ============
const emotionChartRef = ref(null)
const consultationChartRef = ref(null)
const userActivityChartRef = ref(null)
let emotionChart = null
let consultationChart = null
let userActivityChart = null

/**
 * 通用渲染函数：销毁旧实例 → 初始化 → 设置配置项 → **返回新实例**。
 *
 * ⚠️ 原实现第二个参数是「临时对象字面量」（调用处写的 `{ value: emotionChart }`），
 *    函数内部 `chartInstHolder.value = chart` 只写进了那个临时对象，
 *    外层的 `let emotionChart` 永远是 null →
 *    `handleResize()` 里的 `emotionChart?.resize()` 与 `onUnmounted` 里的 `?.dispose()`
 *    全部静默跳过：窗口缩放图表不跟随、组件卸载不释放实例（内存泄漏，切页面多次后明显）。
 *    改成「返回实例、调用方显式赋值」后没有中间对象可以丢。
 */
const renderChart = (refEl, chartInst, buildOption) => {
  if (!refEl) return null
  chartInst?.dispose()   // dispose 幂等：实例为 null/已销毁都不会报错
  const chart = echarts.init(refEl)
  chart.setOption(buildOption())
  return chart
}

// 监听窗口缩放，自适应图表
const handleResize = () => {
  emotionChart?.resize()
  consultationChart?.resize()
  userActivityChart?.resize()
}

// ============ 图表配置项构建（纯函数） ============
const buildEmotionOption = () => {
  const trendData = aiData.value.emotionTrend || []
  return {
    title: { text: '情绪趋势分析', textStyle: { color: '#2d3436', fontSize: 16, fontWeight: 600 }, left: 'center', top: 10 },
    tooltip: { trigger: 'axis', borderColor: '#fab1a0', borderWidth: 1, textStyle: { color: '#2d3436' } },
    legend: { data: ['平均情绪评分', '记录数量'], top: 40 },
    grid: { left: '3%', right: '4%', top: 80, bottom: '3%' },
    xAxis: {
      type: 'category',
      data: trendData.map(item => item.date),
      axisLine: { lineStyle: { color: '#2d3436' } }
    },
    yAxis: [
      { type: 'value', name: '情绪评分', position: 'left', axisLine: { lineStyle: { color: '#2d3436' } } },
      { type: 'value', name: '记录数量', position: 'right', axisLine: { lineStyle: { color: '#2d3436' } } }
    ],
    series: [
      { name: '平均情绪评分', type: 'line', data: trendData.map(item => item.avgMoodScore), smooth: true, lineStyle: { width: 3, color: '#faebaf' }, itemStyle: { color: '#faebaf' } },
      { name: '记录数量', type: 'line', data: trendData.map(item => item.recordCount), smooth: true, lineStyle: { width: 3, color: '#eeb5a3' }, itemStyle: { color: '#eeb5a3' } }
    ]
  }
}

const buildConsultationOption = () => {
  const dailyTrend = aiData.value.consultationStats?.dailyTrend || []
  const linear = (c1, c2) => ({
    type: 'linear', x: 0, y: 0, x2: 0, y2: 1,
    colorStops: [{ offset: 0, color: c1 }, { offset: 1, color: c2 }]
  })
  return {
    title: { text: '咨询活动统计', textStyle: { fontSize: 16, fontWeight: 600, color: '#2d3436' }, left: 'center', top: 10 },
    tooltip: { trigger: 'axis', backgroundColor: 'rgba(255, 255, 255, 0.95)', borderColor: '#fab1a0', borderWidth: 1, textStyle: { color: '#2d3436' } },
    legend: { data: ['会话数量', '参与用户数'], top: 40, textStyle: { color: '#636e72' } },
    grid: { left: '3%', right: '4%', bottom: '3%', top: 80, containLabel: true },
    xAxis: {
      type: 'category',
      data: dailyTrend.map(item => item.date),
      axisLine: { lineStyle: { color: 'rgba(244, 162, 97, 0.3)' } },
      axisLabel: { color: '#636e72' }
    },
    yAxis: {
      type: 'value',
      axisLabel: { color: '#636e72' },
      axisLine: { lineStyle: { color: 'rgba(244, 162, 97, 0.3)' } },
      splitLine: { lineStyle: { color: 'rgba(244, 162, 97, 0.1)' } }
    },
    series: [
      { name: '会话数量', type: 'bar', data: dailyTrend.map(item => item.sessionCount), itemStyle: { color: linear('#74b9ff', '#0984e3') }, barWidth: '40%' },
      { name: '参与用户数', type: 'bar', data: dailyTrend.map(item => item.userCount), itemStyle: { color: linear('#fdcb6e', '#f39c12') }, barWidth: '40%' }
    ]
  }
}

const buildActivityOption = () => {
  const activityData = aiData.value.userActivity || []
  const lineSeries = (name, color, field, withArea = false) => {
    const s = {
      name, type: 'line', data: activityData.map(item => item[field]),
      smooth: true, lineStyle: { width: 3, color }, itemStyle: { color }
    }
    if (withArea) {
      s.areaStyle = {
        color: {
          type: 'linear', x: 0, y: 0, x2: 0, y2: 1,
          colorStops: [{ offset: 0, color: `${color}66` }, { offset: 1, color: `${color}1a` }]
        }
      }
    }
    return s
  }
  return {
    title: { text: '用户活跃度趋势', textStyle: { fontSize: 16, fontWeight: 600, color: '#2d3436' }, left: 'center', top: 10 },
    tooltip: { trigger: 'axis', backgroundColor: 'rgba(255, 255, 255, 0.95)', borderColor: '#fab1a0', borderWidth: 1, textStyle: { color: '#2d3436' } },
    legend: { data: ['活跃用户', '新增用户', '日记用户', '咨询用户'], top: 40, textStyle: { color: '#636e72' } },
    grid: { left: '3%', right: '4%', bottom: '3%', top: 80, containLabel: true },
    xAxis: {
      type: 'category',
      data: activityData.map(item => item.date),
      axisLine: { lineStyle: { color: 'rgba(244, 162, 97, 0.3)' } },
      axisLabel: { color: '#636e72' }
    },
    yAxis: {
      type: 'value',
      axisLabel: { color: '#636e72' },
      axisLine: { lineStyle: { color: 'rgba(244, 162, 97, 0.3)' } },
      splitLine: { lineStyle: { color: 'rgba(244, 162, 97, 0.1)' } }
    },
    series: [
      lineSeries('活跃用户', '#a29bfe', 'activeUsers', true),
      lineSeries('新增用户', '#fdcb6e', 'newUsers'),
      lineSeries('日记用户', '#00b894', 'diaryUsers'),
      lineSeries('咨询用户', '#fab1a0', 'consultationUsers')
    ]
  }
}

// 初始化所有图表
const initCharts = () => {
  // 必须把返回值显式赋回外层变量：resize / dispose 依赖它们
  emotionChart = renderChart(emotionChartRef.value, emotionChart, buildEmotionOption)
  consultationChart = renderChart(consultationChartRef.value, consultationChart, buildConsultationOption)
  userActivityChart = renderChart(userActivityChartRef.value, userActivityChart, buildActivityOption)
}

onMounted(async () => {
  try {
    const res = await getAnalyticsOverview()
    aiData.value = res || {}
    await nextTick()
    initCharts()
    window.addEventListener('resize', handleResize)
  } catch (e) {
    console.error('加载分析数据失败', e)
  } finally {
    loading.value = false
  }
})

onUnmounted(() => {
  window.removeEventListener('resize', handleResize)
  emotionChart?.dispose()
  consultationChart?.dispose()
  userActivityChart?.dispose()
})
</script>

<style lang="scss" scoped>
.dashboard-container {
  .card-content {
    display: flex;
    align-items: center;

    .avatar {
      margin-right: 12px;
      width: 60px;
      height: 60px;
      border-radius: 12px;
      display: flex;
      align-items: center;
      justify-content: center;

      &.users {
        background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      }

      &.like {
        background: linear-gradient(135deg, #f093fb 0%, #f5576c 100%);
      }

      &.comments {
        background: linear-gradient(135deg, #4facfe 0%, #00f2fe 100%);
      }

      &.smile {
        background: linear-gradient(135deg, #43e97b 0%, #38f9d7 100%);
      }
    }

    .info {
      .title {
        font-size: 14px;
        color: #7f8c8d;
        margin-bottom: 4px;
      }

      .number {
        font-size: 24px;
        font-weight: 700;
        color: #2c3e50;
        margin-bottom: 4px;
      }

      .subtitle-title {
        font-size: 12px;
        color: #95a5a6;
      }
    }
  }

  .chart-content {
    padding: 20px;
    height: 300px;
    position: relative;

    canvas {
      width: 100% !important;
      height: 100% !important;
    }

    .consultation-stats {
      display: flex;
      justify-content: space-around;
      margin-bottom: 20px;

      .stat-item {
        text-align: center;

        .stat-label {
          font-size: 12px;
          color: #7f8c8d;
          margin-bottom: 4px;
        }

        .stat-value {
          font-size: 18px;
          font-weight: 600;
          color: #2c3e50;
        }
      }
    }
  }
}
</style>
