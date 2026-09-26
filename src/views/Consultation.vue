<template>
  <div class="consultation">
    <!-- 左侧栏：AI助手信息 / 情绪花园 / 会话列表 -->
    <aside class="sidebar">
      <!-- 1. AI助手信息 -->
      <section class="card ai-info">
        <div class="ai-avatar">
          <img :src="robotImg" alt="AI助手" />
        </div>
        <div class="ai-meta">
          <h3>宁渡AI助手</h3>
          <p class="online"><span class="dot"></span>在线服务中</p>
        </div>
      </section>

      <!-- 2. 情绪花园 -->
      <section class="card emotion-garden">
        <h4 class="card-title">情绪花园</h4>

        <!-- 没有分析结果时给明确空态，不再渲染一份「默认值假装是分析结果」 -->
        <div v-if="!hasEmotion" class="emotion-empty">
          <p class="emotion-empty-title">还没有情绪分析</p>
          <p class="emotion-empty-tip">聊几句后，这里会出现属于你的情绪花园</p>
        </div>

        <template v-else>
        <div class="emotion-main">
          <div class="emotion-circle" :class="{ negative: currentEmotion.isNegative }">
            <span class="emotion-name">{{ currentEmotion.primaryEmotion }}</span>
            <span class="emotion-score">{{ currentEmotion.emotionScore }}</span>
          </div>
          <div class="emotion-status">
            <p class="status-line">
              <span class="status-label">今天感觉</span>
              <span class="status-emotion">{{ currentEmotion.isNegative ? '需要关注' : '很不错' }}</span>
            </p>
            <p class="intensity-line">
              <span class="intensity-dots">
                <span v-for="dot in 3" :key="dot" class="dot"
                  :class="{ active: getIntensityClass(currentEmotion.emotionScore) >= dot }"></span>
              </span>
              <span class="intensity-text">{{ getEiskText(currentEmotion.riskLevel) }}</span>
            </p>
          </div>
        </div>

        <!-- 小建议 -->
        <div class="suggestion" v-if="currentEmotion.suggestion">
          <span class="suggestion-icon">❤</span>
          <div class="suggestion-body">
            <span class="suggestion-label">给你的小建议</span>
            <p class="suggestion-text">{{ currentEmotion.suggestion }}</p>
          </div>
        </div>

        <!-- 治愈小行动 -->
        <div class="actions" v-if="hasImprovements">
          <h5 class="block-title">治愈小行动</h5>
          <ul class="action-list">
            <li v-for="(action, index) in currentEmotion.improvementSuggestions" :key="index">
              <span class="action-icon">👉</span>
              <span class="action-text">{{ action }}</span>
            </li>
          </ul>
        </div>

        <!-- 风险提示 -->
        <div class="risk" v-if="currentEmotion.isNegative && currentEmotion.riskLevel > 1">
          <h5 class="block-title">⚠️ 风险提示</h5>
          <p class="risk-text">{{ currentEmotion.riskDescription }}</p>
        </div>
        </template>
      </section>

      <!-- 3. 会话列表 -->
      <section class="card session-history">
        <h4 class="card-title">会话列表</h4>
        <ul class="session-list" v-loading="sessionLoading">
          <li v-for="session in sessionList" :key="session.id" class="session-item"
            @click="handleSessionClick(session)">
            <div class="session-row">
              <span class="session-title">{{ session.sessionTitle || '未命名会话' }}</span>
              <span class="session-time">{{ formatRelativeTime(session.lastMessageTime || session.startedAt) }}</span>
            </div>
            <div class="session-preview">{{ session.lastMessageContent || '暂无消息' }}</div>
            <div class="session-meta">
              <span v-if="session.messageCount">{{ session.messageCount }} 条消息</span>
            </div>
            <button class="session-delete" @click.stop="handleDeleteSession(session.id)" title="删除会话">×</button>
          </li>
          <li v-if="!sessionLoading && sessionList.length === 0" class="session-empty">
            还没有会话，从右侧开始聊聊吧
          </li>
        </ul>
        <button v-if="hasMoreSessions" class="session-more" :disabled="sessionLoading" @click="loadMoreSessions">
          {{ sessionLoading ? '加载中...' : '加载更多' }}
        </button>
      </section>
    </aside>

    <!-- 右侧聊天窗口 -->
    <main class="chat">
      <header class="chat-header">
        <div class="chat-info">
          <h2>宁渡AI助手</h2>
          <p>您贴心的AI心理助手</p>
        </div>
        <button class="new-session" @click="createNewFrontendSession">＋ 新会话</button>
      </header>

      <div class="chat-messages">
        <!-- 欢迎消息 -->
        <div class="msg ai" v-if="messages.length === 0">
          <div class="avatar"><img :src="robotImg" alt="AI" /></div>
          <div class="bubble">
            <p>欢迎来到宁渡AI助手，我是您的心理助手，我可以帮助您管理您的情绪和压力。</p>
            <span class="time">刚刚</span>
          </div>
        </div>

        <!-- 消息流 -->
        <div v-else class="msg" v-for="item in messages" :key="item.id"
          :class="item.senderType === 1 ? 'user' : 'ai'">
          <div class="avatar">
            <img :src="item.senderType === 1 ? userImg : robotImg" alt="头像" />
          </div>
          <div class="bubble">
            <!-- AI 正在思考 -->
            <div class="typing" v-if="item.senderType === 2 && isAiTyping && !item.content">
              <span class="typing-dot"></span>
              <span class="typing-dot"></span>
              <span class="typing-dot"></span>
            </div>
            <!-- AI 错误提示 -->
            <div class="error" v-else-if="item.isError">{{ item.content }}</div>
            <!-- AI 正常回复 -->
            <MarkdownRenderer v-else-if="item.senderType === 2 && !item.isError" :content="item.content"
              :isAiMessage="true" />
            <!-- 用户输入 -->
            <p v-else-if="item.content" v-html="formatMessageContent(item.content)"></p>
            <span class="time">{{ item.senderType === 2 && isAiTyping ? '正在思考中...' : item.createdAt }}</span>
          </div>
        </div>
      </div>

      <footer class="chat-input">
        <div class="input-box">
          <textarea v-model="userMessage" :disabled="isAiTyping" placeholder="请输入您的问题"
            rows="3" @keydown="handleKeyDown"></textarea>
          <div class="input-meta">
            <span>Enter 发送 · Shift+Enter 换行</span>
            <span :class="{ over: isOverLimit }">{{ userMessage.length }}/500</span>
          </div>
        </div>
        <!-- 生成中给「停止」入口，把 abort 的主动权交给用户 -->
        <button class="stop-btn" v-if="isAiTyping" @click="stopAIResponse">停止</button>
        <button v-else class="send-btn" @click="sendMessage" :disabled="sendDisabled">→</button>
      </footer>
    </main>
  </div>
</template>

<script setup>
import { ref, reactive, computed, onMounted } from "vue"
import { startSession, getSessionList, deleteSession, getSessionDetail, getSeeionEmotion } from "@/api/frontend.js"
import { ElMessage, ElMessageBox } from "element-plus"
import MarkdownRenderer from "@/components/MarkdownRenderer.vue"
import { fetchEventSource } from '@microsoft/fetch-event-source';
// SSE 不走 axios，鉴权头得自己带；token/登出处理统一从 utils/auth 取
import { getToken, handleUnauthorized } from '@/utils/auth';

const robotImg = new URL('@/assets/images/robot-fill.png', import.meta.url).href
const userImg = new URL('@/assets/images/users.png', import.meta.url).href

const MAX_MESSAGE_LENGTH = 500
const SESSION_PAGE_SIZE = 10

const userMessage = ref("")
const isAiTyping = ref(false)
const currentSession = ref(null)
const sessionList = ref([])
const messages = ref([])
const sessionLoading = ref(false)
const sessionPageNum = ref(1)
const hasMoreSessions = ref(false)

/**
 * 当前这次流式请求的 AbortController。
 * ⚠️ AbortController 是「一次性消耗品」：abort() 之后它的 signal 永久失效，
 *    下次请求再复用它，请求会立刻被判定为已中止 → 第二条消息必然失败。
 *    所以每次发起请求都重新 new 一个，用完置空。
 */
let ctrl = null

// 新建会话
const createNewFrontendSession = () => {
  const newSession = {
    sessionId: `temp_${Date.now()}`,
    status: 'TEMP',
    sessionTitle: '新会话'
  }
  currentSession.value = newSession
  messages.value = []
  currentEmotion.value = null
}

const handleKeyDown = (e) => {
  if (e.key === 'Enter' && !e.shiftKey) {
    e.preventDefault()
    sendMessage()
  }
}

// 发送按钮禁用条件。
// 原写法是 `!userMessage.length > 500`：先算 `!length`（得到 true/false），
// 再和 500 比较，`0 > 500` 恒为 false → 500 字限制从未生效。这里拆开明确表达。
const isOverLimit = computed(() => userMessage.value.trim().length > MAX_MESSAGE_LENGTH)
const sendDisabled = computed(() =>
  userMessage.value.trim().length === 0 || isOverLimit.value || isAiTyping.value
)

const sendMessage = () => {
  if (isAiTyping.value) {
    ElMessage.error('AI助手正在输入中，请稍后。')
    return
  }
  const content = userMessage.value.trim()
  if (!content) return
  if (content.length > MAX_MESSAGE_LENGTH) {
    ElMessage.error(`单条消息最多 ${MAX_MESSAGE_LENGTH} 字`)
    return
  }
  userMessage.value = ''
  messages.value.push({
    id: `user_${Date.now()}`,
    senderType: 1,
    content,
    createdAt: new Date().toLocaleString()
  })
  if (!currentSession.value || currentSession.value.status === 'TEMP') {
    startNewSession(content)
  } else {
    startAIResponse(currentSession.value.sessionId, content)
  }
}

const startNewSession = async (content) => {
  const sessionParams = { initialMessage: content }
  sessionParams.sessionTitle = currentSession.value?.status === 'TEMP'
    ? `宁渡AI助手 - ${new Date().toLocaleString()}`
    : currentSession.value.sessionTitle

  const res = await startSession(sessionParams)
  const sessionData = {
    sessionId: res.sessionId,
    status: res.status,
    sessionTitle: sessionParams.sessionTitle
  }
  currentSession.value = sessionData
  refreshSessionList()
  startAIResponse(sessionData.sessionId, content)
}

/**
 * 发起流式对话。
 * 说明：fetchEventSource 返回的 Promise 在「被我们自己 abort」时既不 resolve 也不 reject，
 * 所以这里不能用 await（会一直挂着），改为 .catch 兜住 onerror 里抛出的致命错误。
 */
const startAIResponse = async (sessionId, content) => {
  if (isAiTyping.value) return
  isAiTyping.value = true
  ctrl = new AbortController()

  // ⚠️ 必须用 reactive() 包一层，否则流式「不流式」：
  //    messages.value.push(obj) 时 Vue 存进去的是**原始对象**（set 陷阱里做的是 toRaw，不是 toReactive），
  //    响应式代理只在"读取数组元素"时才惰性创建。下面 onmessage 里用的是 aiMessage 这个**原始引用**，
  //    直接 `aiMessage.content += 片段` 不会经过代理的 set 陷阱 → 依赖收不到通知 → 组件不重渲染。
  //    现象就是：一直转圈，直到 done 里 isAiTyping 翻转触发那一次渲染，整段回复一次性蹦出来。
  //    包了 reactive() 之后，这个引用本身就是代理，逐片段累加才会逐片段重渲染。
  const aiMessage = reactive({
    id: `ai_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`,
    senderType: 2,
    content: '',
    createdAt: new Date().toLocaleString()
  })
  messages.value.push(aiMessage)

  fetchEventSource("/api/psychological-chat/stream", {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Token': getToken(),
      'Accept': 'text/event-stream'
    },
    body: JSON.stringify({ sessionId: sessionId, userMessage: content }),
    signal: ctrl.signal,
    // 默认行为是「页面切到后台就断开、切回来重连」，聊天场景下容易重复触发，显式关掉
    openWhenHidden: true,
    onopen: async (res) => {
      if (res.status === 401) {
        // token 过期：SSE 不走 axios 拦截器，这里手动做和拦截器一样的登出动作
        handleUnauthorized()
        throw new Error('登录已过期')
      }
      const contentType = res.headers.get('Content-Type') || ''
      if (!contentType.includes('text/event-stream')) {
        // 原来只弹了个提示但没中止，后面会继续按 SSE 解析 → 一堆解析失败。
        // 这里直接抛错，交给 onerror → 被 catch 兜住。
        const text = await res.text().catch(() => '')
        throw new Error(text || '服务器返回的不是流式数据')
      }
    },
    onmessage: (event) => {
      const raw = event.data.trim()
      if (!raw) return
      if (event.event === 'done') {
        isAiTyping.value = false
        // 只在 done 里做一次收尾：
        // 原来 done 和 onclose 各调一次 loadSessionEmotion → 每次回复都打两次情绪分析请求
        loadSessionEmotion(currentSession.value?.sessionId)
        if (ctrl) {
          ctrl.abort()
          ctrl = null
        }
        return
      }
      let payload
      try {
        payload = JSON.parse(raw)
      } catch (error) {
        return
      }
      if (String(payload.code) === '200' && payload.data?.content) {
        aiMessage.content += payload.data.content
      } else {
        handleError(payload.msg || payload.message || 'AI回复失败')
      }
    },
    onerror: (err) => {
      // 抛出去 → 停止重连，并被下面的 .catch 接住
      throw err
    },
    onclose: () => {
      // 正常关闭：复位状态即可（情绪分析只在 done 里刷新，避免重复请求）
      isAiTyping.value = false
      ctrl = null
    }
  }).catch((err) => {
    handleError(err?.message || 'AI回复失败')
  })
}

/** 用户主动停止生成 */
const stopAIResponse = () => {
  if (ctrl) {
    ctrl.abort()
    ctrl = null
  }
  isAiTyping.value = false
  const last = messages.value[messages.value.length - 1]
  if (last && last.senderType === 2 && !last.content) {
    last.content = '已停止生成'
    last.isError = true
  }
}

/**
 * 统一错误处理。
 * 先确认最后一条确实是「AI 占位消息」再改它的内容，
 * 否则会误改到用户自己刚发的那条（原实现就是这个隐患）。
 */
const handleError = (error) => {
  const last = messages.value[messages.value.length - 1]
  if (last && last.senderType === 2 && !last.isError) {
    last.content = typeof error === 'string' ? error : 'AI回复失败,请重试'
    last.isError = true
  }
  isAiTyping.value = false
  ctrl = null
  ElMessage.error(typeof error === 'string' ? error : 'AI回复失败,请重试')
}

/** 拉取会话列表；reset=true 时回到第 1 页 */
const getSessionPage = async (reset = true) => {
  if (sessionLoading.value) return
  sessionLoading.value = true
  try {
    if (reset) sessionPageNum.value = 1
    const res = await getSessionList({ pageNum: sessionPageNum.value, pageSize: SESSION_PAGE_SIZE })
    const records = res?.records || []
    sessionList.value = reset ? records : [...sessionList.value, ...records]
    const total = res?.total ?? sessionList.value.length
    hasMoreSessions.value = sessionList.value.length < total
  } catch (e) {
    if (reset) sessionList.value = []
    hasMoreSessions.value = false
  } finally {
    sessionLoading.value = false
  }
}

/** 只刷新第 1 页：仅在「当前只加载了第 1 页」时使用，避免把已加载的更多页丢掉 */
const refreshSessionList = () => {
  if (sessionPageNum.value === 1) {
    getSessionPage(true)
  }
}

const loadMoreSessions = () => {
  sessionPageNum.value += 1
  getSessionPage(false)
}

const handleSessionClick = async (session) => {
  if (isAiTyping.value) {
    ElMessage.warning('AI 正在回复，请稍候再切换会话')
    return
  }
  sessionLoading.value = true
  try {
    const res = await getSessionDetail(session.id)
    messages.value = res || []
    currentSession.value = {
      sessionId: `session_${session.id}`,
      status: 'ACTIVE',
      sessionTitle: session.sessionTitle
    }
    currentEmotion.value = null
    loadSessionEmotion(session.id)
  } finally {
    sessionLoading.value = false
  }
}

const handleDeleteSession = async (sessionId) => {
  ElMessageBox.confirm('确认删除该会话吗？', '提示', {
    confirmButtonText: '确定',
    cancelButtonText: '取消',
    type: 'warning'
  }).then(async () => {
    await deleteSession(sessionId)
    if (currentSession.value && Number(currentSession.value.sessionId.replace('session_', '')) === Number(sessionId)) {
      createNewFrontendSession()
    }
    getSessionPage()
    ElMessage.success('删除成功')
  }).catch(() => {})
}

const formatMessageContent = (content) => String(content ?? '').replace(/\n/g, '<br>')

/**
 * 相对时间（会话列表比「2026-09-26 21:30:00」更好读）。
 * 注意把 `-` 换成 `/`：Safari/iOS 解析 `2026-09-26 21:30:00` 会得到 Invalid Date。
 */
const formatRelativeTime = (time) => {
  if (!time) return ''
  const date = new Date(String(time).replace(/-/g, '/'))
  if (Number.isNaN(date.getTime())) return String(time)
  const diff = Date.now() - date.getTime()
  if (diff < 60 * 1000) return '刚刚'
  if (diff < 60 * 60 * 1000) return `${Math.floor(diff / 60000)} 分钟前`
  if (diff < 24 * 60 * 60 * 1000) return `${Math.floor(diff / 3600000)} 小时前`
  if (diff < 7 * 24 * 60 * 60 * 1000) return `${Math.floor(diff / 86400000)} 天前`
  return `${date.getMonth() + 1}月${date.getDate()}日`
}

// 情绪花园：初始为 null（表示「还没有分析结果」），不再用一份默认值假装是分析结果
const currentEmotion = ref(null)
const hasEmotion = computed(() => Boolean(currentEmotion.value?.primaryEmotion))
const hasImprovements = computed(() =>
  Array.isArray(currentEmotion.value?.improvementSuggestions) &&
  currentEmotion.value.improvementSuggestions.length > 0
)

const loadSessionEmotion = async (sessionId) => {
  if (!sessionId) return
  const id = String(sessionId).startsWith('session_') ? sessionId : `session_${sessionId}`
  try {
    const res = await getSeeionEmotion(id)
    currentEmotion.value = res && res.primaryEmotion !== undefined ? res : null
  } catch (e) {
    // 分析失败不影响聊天，保持/回到空态即可
    currentEmotion.value = null
  }
}

const getIntensityClass = (score) => {
  if (score >= 61) return 3
  if (score >= 31) return 2
  return 1
}

const getEiskText = (level) => {
  switch (level) {
    case 0: return '正常'
    case 1: return '关注'
    case 2: return '预警'
    case 3: return '危机'
    default: return '正常'
  }
}

onMounted(() => {
  createNewFrontendSession()
  getSessionPage()
})
</script>

<style lang="scss" scoped>
.consultation {
  --primary: #0f6e56;
  --primary-weak: #1d9e75;
  --primary-bg: #e1f5ee;
  --primary-hover-bg: #f0faf6;
  --text-1: #1f2937;
  --text-2: #4b5563;
  --text-3: #9ca3af;
  --border: #e5e7eb;
  --warn: #b45309;
  --warn-bg: #fef3c7;
  --radius: 12px;
  display: flex;
  gap: 16px;
  max-width: 1200px;
  margin: 0 auto;
  height: 100%;
  overflow: hidden;
}

.card {
  background: #fff;
  border: 0.5px solid var(--border);
  border-radius: var(--radius);
  padding: 16px;

  .card-title {
    font-size: 14px;
    font-weight: 500;
    color: var(--text-1);
    margin: 0 0 12px;
  }

  .block-title {
    font-size: 13px;
    font-weight: 500;
    color: var(--text-2);
    margin: 14px 0 8px;
  }
}

/* ============ 左侧栏 ============ */
.sidebar {
  width: 300px;
  display: flex;
  flex-direction: column;
  gap: 16px;
  overflow: hidden;
  flex-shrink: 0;
}

/* 1. AI助手信息 */
.ai-info {
  display: flex;
  align-items: center;
  gap: 12px;
  flex-shrink: 0;

  .ai-avatar {
    width: 44px;
    height: 44px;
    border-radius: 50%;
    background: var(--primary-bg);
    display: flex;
    align-items: center;
    justify-content: center;
    flex-shrink: 0;

    img { width: 26px; height: 26px; }
  }

  .ai-meta {
    h3 { font-size: 15px; font-weight: 500; color: var(--text-1); margin: 0 0 4px; }

    .online {
      font-size: 12px;
      color: var(--text-2);
      margin: 0;
      display: flex;
      align-items: center;
      gap: 6px;

      .dot {
        width: 6px;
        height: 6px;
        border-radius: 50%;
        background: var(--primary-weak);
      }
    }
  }
}

/* 2. 情绪花园 */
.emotion-garden {
  flex-shrink: 1;
  min-height: 0;
  overflow-y: auto;

  .emotion-empty {
    padding: 20px 8px;
    text-align: center;

    .emotion-empty-title {
      margin: 0 0 6px;
      font-size: 13px;
      font-weight: 500;
      color: var(--text-2);
    }

    .emotion-empty-tip {
      margin: 0;
      font-size: 12px;
      color: var(--text-3);
      line-height: 1.6;
    }
  }

  .emotion-main {
    display: flex;
    align-items: center;
    gap: 14px;
    padding-bottom: 14px;
    border-bottom: 0.5px solid var(--border);
  }

  .emotion-circle {
    width: 64px;
    height: 64px;
    border-radius: 50%;
    background: var(--primary-bg);
    color: var(--primary);
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    flex-shrink: 0;

    &.negative {
      background: var(--warn-bg);
      color: var(--warn);
    }

    .emotion-name { font-size: 14px; font-weight: 500; line-height: 1.2; }
    .emotion-score { font-size: 12px; opacity: 0.85; }
  }

  .emotion-status {
    flex: 1;
    font-size: 13px;

    .status-line {
      margin: 0 0 10px;

      .status-label { color: var(--text-3); margin-right: 6px; }
      .status-emotion { color: var(--text-1); font-weight: 500; }
    }

    .intensity-line {
      margin: 0;
      display: flex;
      align-items: center;
      gap: 8px;

      .intensity-dots { display: flex; gap: 4px; }

      .dot {
        width: 7px;
        height: 7px;
        border-radius: 50%;
        background: #e5e7eb;

        &.active { background: var(--primary); }
      }

      .intensity-text { font-size: 12px; color: var(--text-3); }
    }
  }

  .suggestion {
    display: flex;
    gap: 8px;
    margin-top: 14px;

    .suggestion-icon { font-size: 15px; flex-shrink: 0; }

    .suggestion-body {
      .suggestion-label { font-size: 13px; font-weight: 500; color: var(--text-2); }
      .suggestion-text { font-size: 13px; color: var(--text-2); margin: 4px 0 0; line-height: 1.6; }
    }
  }

  .actions .action-list {
    margin: 0;
    padding: 0;

    li {
      list-style: none;
      display: flex;
      gap: 8px;
      padding: 8px 0;
      border-bottom: 0.5px solid var(--border);
      font-size: 13px;
      color: var(--text-2);

      &:last-child { border-bottom: none; }

      .action-icon { flex-shrink: 0; }
      .action-text { line-height: 1.5; }
    }
  }

  .risk {
    background: var(--warn-bg);
    border-radius: 8px;
    padding: 12px;
    margin-top: 14px;

    .block-title { margin: 0 0 6px; color: var(--warn); }
    .risk-text { margin: 0; font-size: 13px; color: var(--warn); line-height: 1.6; }
  }
}

/* 3. 会话列表 */
.session-history {
  flex: 1;
  display: flex;
  flex-direction: column;
  min-height: 0;

  .session-list {
    margin: 0;
    padding: 0;
    overflow-y: auto;
    flex: 1;
    min-height: 0;
  }

  .session-empty {
    list-style: none;
    padding: 20px 8px;
    text-align: center;
    font-size: 12px;
    color: var(--text-3);
  }

  .session-more {
    flex-shrink: 0;
    margin-top: 8px;
    padding: 6px;
    border: 0.5px solid var(--border);
    border-radius: 8px;
    background: transparent;
    color: var(--text-2);
    font-size: 12px;
    cursor: pointer;

    &:hover:not(:disabled) { background: var(--primary-hover-bg); }
    &:disabled { color: var(--text-3); cursor: not-allowed; }
  }

  .session-item {
    position: relative;
    list-style: none;
    padding: 10px;
    border-radius: 8px;
    cursor: pointer;
    border-bottom: 0.5px solid var(--border);

    &:hover { background: var(--primary-hover-bg); }

    .session-row {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 4px;

      .session-title {
        font-size: 13px;
        font-weight: 500;
        color: var(--text-1);
        white-space: nowrap;
        overflow: hidden;
        text-overflow: ellipsis;
        max-width: 190px;
      }

      .session-time { font-size: 11px; color: var(--text-3); flex-shrink: 0; }
    }

    .session-preview {
      font-size: 12px;
      color: var(--text-3);
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
    }

    .session-meta {
      margin-top: 2px;
      font-size: 11px;
      color: var(--text-3);
    }

    .session-delete {
      position: absolute;
      top: 8px;
      right: 8px;
      width: 20px;
      height: 20px;
      border: none;
      background: #f3f4f6;
      color: var(--text-3);
      border-radius: 6px;
      cursor: pointer;
      opacity: 0;
      transition: opacity 0.15s;

      &:hover { color: #dc2626; }
    }

    &:hover .session-delete { opacity: 1; }
  }
}

/* ============ 右侧聊天 ============ */
.chat {
  flex: 1;
  display: flex;
  flex-direction: column;
  background: #fff;
  border: 0.5px solid var(--border);
  border-radius: var(--radius);
  overflow: hidden;
  min-width: 0;
}

.chat-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 14px 20px;
  border-bottom: 0.5px solid var(--border);
  flex-shrink: 0;

  .chat-info {
    h2 { font-size: 16px; font-weight: 500; color: var(--text-1); margin: 0 0 2px; }
    p { font-size: 12px; color: var(--text-3); margin: 0; }
  }

  .new-session {
    border: 0.5px solid var(--primary);
    color: var(--primary);
    background: transparent;
    border-radius: 8px;
    padding: 6px 14px;
    font-size: 13px;
    cursor: pointer;

    &:hover { background: var(--primary-hover-bg); }
  }
}

.chat-messages {
  flex: 1;
  min-height: 0;
  overflow-y: auto;
  padding: 20px;
  display: flex;
  flex-direction: column;
  gap: 16px;
  background: #fafbfa;
}

.msg {
  display: flex;
  gap: 10px;
  align-items: flex-start;

  .avatar {
    width: 30px;
    height: 30px;
    border-radius: 50%;
    background: var(--primary-bg);
    display: flex;
    align-items: center;
    justify-content: center;
    flex-shrink: 0;

    img { width: 17px; height: 17px; }
  }

  .bubble {
    max-width: 72%;
    font-size: 14px;
    line-height: 1.6;
    padding: 10px 14px;
    border-radius: 10px;

    .time {
      display: block;
      font-size: 11px;
      color: var(--text-3);
      margin-top: 4px;
    }
  }

  &.ai .bubble { background: #fff; border: 0.5px solid var(--border); color: var(--text-1); }

  &.user {
    flex-direction: row-reverse;

    .avatar { background: #e5e7eb; }

    .bubble { background: var(--primary); color: #fff; text-align: left; }
  }
}

.typing {
  display: flex;
  gap: 4px;
  padding: 4px 0;

  .typing-dot {
    width: 7px;
    height: 7px;
    border-radius: 50%;
    background: #cbd5e1;
    animation: blink 1.2s infinite;

    &:nth-child(2) { animation-delay: 0.2s; }
    &:nth-child(3) { animation-delay: 0.4s; }
  }
}

@keyframes blink {
  0%, 80%, 100% { opacity: 0.3; }
  40% { opacity: 1; }
}

.error {
  color: #dc2626;
  background: #fef2f2;
  border: 0.5px solid #fecaca;
  border-radius: 8px;
  padding: 10px 12px;
}

.chat-input {
  display: flex;
  gap: 10px;
  align-items: flex-end;
  padding: 14px 20px;
  border-top: 0.5px solid var(--border);
  flex-shrink: 0;

  .input-box { flex: 1; }

  textarea {
    width: 100%;
    border: 0.5px solid var(--border);
    border-radius: 10px;
    padding: 10px 12px;
    font-size: 14px;
    line-height: 1.5;
    resize: none;
    outline: none;
    font-family: inherit;
    color: var(--text-1);

    &:focus { border-color: var(--primary); }

    &:disabled { background: #f9fafb; }
  }

  .input-meta {
    display: flex;
    justify-content: space-between;
    font-size: 11px;
    color: var(--text-3);
    margin-top: 6px;

    .over { color: #dc2626; }
  }

  .send-btn {
    width: 42px;
    height: 42px;
    border: none;
    border-radius: 10px;
    background: var(--primary);
    color: #fff;
    font-size: 20px;
    cursor: pointer;
    flex-shrink: 0;

    &:hover:not(:disabled) { background: var(--primary-weak); }

    &:disabled { background: #d1d5db; cursor: not-allowed; }
  }

  .stop-btn {
    height: 42px;
    padding: 0 16px;
    border: 0.5px solid var(--border);
    border-radius: 10px;
    background: #fff;
    color: var(--text-2);
    font-size: 13px;
    cursor: pointer;
    flex-shrink: 0;

    &:hover { background: #f3f4f6; }
  }
}

/* 移动端：收起左侧栏 */
@media (max-width: 900px) {
  .consultation {
    flex-direction: column;
    height: auto;
  }

  .sidebar { width: 100%; flex-direction: row; overflow-x: auto; }

  .sidebar .card { min-width: 260px; }
}
</style>
