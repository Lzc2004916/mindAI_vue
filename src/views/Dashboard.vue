<template>
  <div class="dashboard-container" v-loading="loading" element-loading-text="加载中...">
    <!-- 概览卡片：响应式 -->
    <el-row :gutter="20">
      <el-col v-for="card in statCards" :key="card.key" :xs="24" :sm="12" :md="6">
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

    <!-- 图表区域：响应式 -->
    <el-row style="margin-top: 20px;" :gutter="20">
      <el-col :xs="24" :sm="12">
        <el-card style="width: 100%">
          <template #header>
            <div class="card-header">情绪趋势分析</div>
          </template>
          <div class="chart-content chart-content-flex">
            <div ref="emotionChartRef" style="width: 100%; height:320px"></div>
          </div>
        </el-card>
      </el-col>
      <el-col :xs="24" :sm="12">
        <el-card style="width: 100%">
          <template #header>
            <div class="card-header">咨询会话统计</div>
          </template>
          <div class="chart-content chart-content-flex">
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
import iconUrl1 from '@/assets/images/users.png'
import iconUrl2 from '@/assets/images/like.png'
import iconUrl3 from '@/assets/images/comments.png'
import iconUrl4 from '@/assets/images/smile.png'

const aiData = ref({})
const loading = ref(true)

const statCards = computed(() => {
  const ov = aiData.value.systemOverview || {}
  return [
    { key: 'users', cls: 'users', icon: iconUrl1, title: '总用户数', value: ov.totalUsers, subtitle: `活跃用户：${ov.activeUsers}` },
    { key: 'diary', cls: 'like', icon: iconUrl2, title: '情绪日志', value: ov.totalDiaries, subtitle: `今日新增：${ov.todayNewDiaries}` },
    { key: 'session', cls: 'comments', icon: iconUrl3, title: '咨询会话', value: ov.totalSessions, subtitle: `今日新增：${ov.todayNewSessions}` },
    { key: 'mood', cls: 'smile', icon: iconUrl4, title: '平均情绪', value: `${ov.avgMoodScore}/10`, subtitle: '情绪健康指数' }
  ]
})

const emotionChartRef = ref(null)
const consultationChartRef = ref(null)
const userActivityChartRef = ref(null)
let emotionChart = null
let consultationChart = null
let userActivityChart = null

const renderChart = (refEl, chartInst, buildOption) => {
  if (!refEl) return null
  chartInst?.dispose()
  const chart = echarts.init(refEl)
  chart.setOption(buildOption())
  return chart
}

const handleResize = () => {
  emotionChart?.resize()
  consultationChart?.resize()
  userActivityChart?.resize()
}

// ResizeObserver：监听容器尺寸变化（侧边栏折叠、窗口缩放都触发）
let resizeObserver = null

// ============ 图表配置（薄荷绿统一配色） ============
const buildEmotionOption = () => {
  const trendData = aiData.value.emotionTrend || []
  return {
    tooltip: { trigger: 'axis', borderColor: '#e3ebe8', textStyle: { color: '#1f2d29' } },
    legend: { data: ['平均情绪评分', '记录数量'], top: 0, textStyle: { color: '#4b5d57' } },
    grid: { left: '3%', right: '4%', top: 40, bottom: '3%' },
    xAxis: {
      type: 'category',
      data: trendData.map(item => item.date),
      axisLine: { lineStyle: { color: '#cfdcd7' } },
      axisLabel: { color: '#8a9a94' }
    },
    yAxis: [
      { type: 'value', name: '情绪评分', position: 'left', axisLine: { lineStyle: { color: '#cfdcd7' } }, axisLabel: { color: '#8a9a94' } },
      { type: 'value', name: '记录数量', position: 'right', axisLine: { lineStyle: { color: '#cfdcd7' } }, axisLabel: { color: '#8a9a94' } }
    ],
    series: [
      { name: '平均情绪评分', type: 'line', data: trendData.map(item => item.avgMoodScore), smooth: true, lineStyle: { width: 3, color: '#0f6e56' }, itemStyle: { color: '#0f6e56' }, areaStyle: { color: { type: 'linear', x:0,y:0,x2:0,y2:1, colorStops:[{offset:0,color:'rgba(15,110,86,0.15)'},{offset:1,color:'rgba(15,110,86,0)'}] } } },
      { name: '记录数量', type: 'line', data: trendData.map(item => item.recordCount), smooth: true, lineStyle: { width: 3, color: '#76c0a8' }, itemStyle: { color: '#76c0a8' } }
    ]
  }
}

const buildConsultationOption = () => {
  const dailyTrend = aiData.value.consultationStats?.dailyTrend || []
  return {
    tooltip: { trigger: 'axis', backgroundColor: 'rgba(255,255,255,0.95)', borderColor: '#e3ebe8', textStyle: { color: '#1f2d29' } },
    legend: { data: ['会话数量', '参与用户数'], top: 0, textStyle: { color: '#4b5d57' } },
    grid: { left: '3%', right: '4%', bottom: '3%', top: 40, containLabel: true },
    xAxis: {
      type: 'category',
      data: dailyTrend.map(item => item.date),
      axisLine: { lineStyle: { color: '#cfdcd7' } },
      axisLabel: { color: '#8a9a94' }
    },
    yAxis: {
      type: 'value',
      axisLabel: { color: '#8a9a94' },
      axisLine: { lineStyle: { color: '#cfdcd7' } },
      splitLine: { lineStyle: { color: '#eef4f1' } }
    },
    series: [
      { name: '会话数量', type: 'bar', data: dailyTrend.map(item => item.sessionCount), itemStyle: { color: { type:'linear',x:0,y:0,x2:0,y2:1,colorStops:[{offset:0,color:'#3fa186'},{offset:1,color:'#0f6e56'}] }, borderRadius: [4,4,0,0] }, barWidth: '40%' },
      { name: '参与用户数', type: 'bar', data: dailyTrend.map(item => item.userCount), itemStyle: { color: { type:'linear',x:0,y:0,x2:0,y2:1,colorStops:[{offset:0,color:'#f2a68a'},{offset:1,color:'#e88b6a'}] }, borderRadius: [4,4,0,0] }, barWidth: '40%' }
    ]
  }
}

const buildActivityOption = () => {
  const activityData = aiData.value.userActivity || []
  const lineSeries = (name, color, field, withArea = false) => {
    const s = {
      name, type: 'line', data: activityData.map(item => item[field]),
      smooth: true, lineStyle: { width: 2.5, color }, itemStyle: { color }
    }
    if (withArea) {
      s.areaStyle = {
        color: {
          type: 'linear', x: 0, y: 0, x2: 0, y2: 1,
          colorStops: [{ offset: 0, color: `${color}40` }, { offset: 1, color: `${color}05` }]
        }
      }
    }
    return s
  }
  return {
    tooltip: { trigger: 'axis', backgroundColor: 'rgba(255,255,255,0.95)', borderColor: '#e3ebe8', textStyle: { color: '#1f2d29' } },
    legend: { data: ['活跃用户', '新增用户', '日记用户', '咨询用户'], top: 0, textStyle: { color: '#4b5d57' } },
    grid: { left: '3%', right: '4%', bottom: '3%', top: 40, containLabel: true },
    xAxis: {
      type: 'category',
      data: activityData.map(item => item.date),
      axisLine: { lineStyle: { color: '#cfdcd7' } },
      axisLabel: { color: '#8a9a94' }
    },
    yAxis: {
      type: 'value',
      axisLabel: { color: '#8a9a94' },
      axisLine: { lineStyle: { color: '#cfdcd7' } },
      splitLine: { lineStyle: { color: '#eef4f1' } }
    },
    series: [
      lineSeries('活跃用户', '#0f6e56', 'activeUsers', true),
      lineSeries('新增用户', '#3fa186', 'newUsers'),
      lineSeries('日记用户', '#76c0a8', 'diaryUsers'),
      lineSeries('咨询用户', '#f2a68a', 'consultationUsers')
    ]
  }
}

const initCharts = () => {
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
    // 监听容器尺寸变化（侧边栏折叠等）
    resizeObserver = new ResizeObserver(() => handleResize())
    resizeObserver.observe(document.querySelector('.dashboard-container'))
    window.addEventListener('resize', handleResize)
  } catch (e) {
    console.error('加载分析数据失败', e)
  } finally {
    loading.value = false
  }
})

onUnmounted(() => {
  window.removeEventListener('resize', handleResize)
  resizeObserver?.disconnect()
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

    &.chart-content-flex {
      height: auto;
      min-height: 300px;
    }

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
