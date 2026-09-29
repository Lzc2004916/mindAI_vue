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
          <h3>聪聆</h3>
          <p class="online"><span class="dot"></span>在线服务中</p>
        </div>
      </section>

      <!-- 2. 情绪花园（可折叠：默认只露「情绪圆环 + 状态」一行，避免挤掉下方会话列表） -->
      <section class="card emotion-garden">
        <h4 class="card-head">
          <button class="head-toggle" type="button" @click="toggleEmotionGarden"
            :aria-expanded="hasEmotion ? emotionExpanded : undefined"
            :aria-controls="hasEmotion ? 'emotion-garden-detail' : undefined">
            <span class="card-title">情绪花园</span>
            <span v-if="hasEmotion" class="head-chevron" :class="{ expanded: emotionExpanded }" aria-hidden="true">
              <svg viewBox="0 0 16 16" width="12" height="12" fill="none">
                <path d="M4 6.5 8 10.5 12 6.5" stroke="currentColor" stroke-width="1.6"
                  stroke-linecap="round" stroke-linejoin="round" />
              </svg>
            </span>
          </button>
        </h4>

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

        <!-- 折叠区：小建议 / 治愈小行动 / 风险提示 -->
        <Transition name="emotion-expand">
          <div class="emotion-detail" id="emotion-garden-detail" v-show="emotionExpanded">
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
          </div>
        </Transition>
        </template>
      </section>

      <!-- 3. 会话列表 -->
      <section class="card session-history">
        <h4 class="card-title">会话列表</h4>
        <ul class="session-list" v-loading="sessionLoading">
          <li v-for="session in sessionList" :key="session.id" class="session-item"
            :class="{ active: currentSession && currentSession.sessionId === `session_${session.id}` }"
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
          <!-- 落实文档 2.1：头部标题跟随当前会话，避免与左栏列表项「各说各话」 -->
          <h2 :title="currentSession?.sessionTitle || '聪聆'">
            {{ currentSession?.sessionTitle || '聪聆' }}
          </h2>
          <p>您贴心的AI心理助手</p>
        </div>
        <button class="new-session" @click="createNewFrontendSession">＋ 新会话</button>
      </header>

      <div class="chat-messages" ref="messagesEl" @scroll.passive="handleMessagesScroll">
        <!-- 落实文档 1.3：内容限宽居中，超宽屏下不让气泡与行长被拉散 -->
        <div class="messages-inner">
          <!-- 欢迎消息 -->
          <div class="msg ai" v-if="messages.length === 0">
            <div class="avatar"><img :src="robotImg" alt="AI" /></div>
            <div class="bubble">
              <p>欢迎来到聪聆，我会在这里听你说，陪你一起梳理情绪和压力。</p>
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
      </div>

      <footer class="chat-input">
        <div class="input-box">
          <textarea v-model="userMessage" :disabled="isAiTyping" placeholder="请输入您的问题"
            rows="3" @keydown="handleKeyDown"></textarea>
          <div class="input-meta">
            <span>Enter 发送 · Shift + Enter 换行</span>
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
import { ref, reactive, computed, nextTick, watch, onMounted } from "vue"
import { startSession, getSessionList, deleteSession, getSessionDetail, getSeeionEmotion } from "@/api/frontend.js"
import { ElMessage, ElMessageBox } from "element-plus"
import MarkdownRenderer from "@/components/MarkdownRenderer.vue"
import { fetchEventSource } from '@microsoft/fetch-event-source';
// SSE 不走 axios，鉴权头得自己带；token/登出处理统一从 utils/auth 取。
// 头名走 authHeaders()（Authorization: Bearer xxx），与 axios 那边共用一份实现，
// 避免「axios 发 Authorization、SSE 发 token」这种两套写法再次出现。
import { getToken, authHeaders, handleUnauthorized } from '@/utils/auth';

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

/* ============================================================
   消息区滚动跟随
   ------------------------------------------------------------
   聊天窗口的高度本身是弹性的：.chat-messages 用 flex:1 撑满
   视口剩余空间（实测视口 900/700/1100px → 613/413/813px），
   不存在写死的高度。
   真正缺的是「内容溢出后停在最新的那条」——浏览器不会自动做这件事，
   默认把 scrollTop 留在原处（初始为 0，即最顶部），于是新消息和
   流式回复都落在视口外，用户必须手动往下拉。
   实测（视口 700px，6 条消息）：打开会话 overflow 203px 而 scrollTop=0；
   发一条新消息 scrollTop 仍为 0，距底部扩大到 290px；
   AI 流式 10 段后扩大到 467px —— 全程没有一次自动滚动。
   ============================================================ */
const messagesEl = ref(null)

/** 是否跟随到底部。用户主动往上翻历史时置 false，避免被自动滚动拽回去 */
let stickToBottom = true

/** 程序化滚动自己也会触发 scroll 事件，这段时间内的 scroll 不参与「用户是否上翻」的判断 */
let lastAutoScrollAt = 0

/** 判定「贴底」的容差：留一点余量，避免 1px 误差导致跟随反复断掉 */
const NEAR_BOTTOM_PX = 80

const isNearBottom = () => {
  const el = messagesEl.value
  if (!el) return true
  return el.scrollHeight - el.scrollTop - el.clientHeight <= NEAR_BOTTOM_PX
}

/**
 * 滚到最新消息。
 * 用瞬时的 scrollTop 赋值而不是 smooth：流式回复会高频触发（每个片段一次），
 * 平滑滚动在连续触发下会互相打断、出现回弹，反而更乱。
 * 先 await nextTick 是为了等 DOM 把新消息的高度算完，否则读到的是旧的 scrollHeight。
 */
const scrollToBottom = async () => {
  await nextTick()
  const el = messagesEl.value
  if (!el) return
  stickToBottom = true
  lastAutoScrollAt = Date.now()
  el.scrollTop = el.scrollHeight
}

const handleMessagesScroll = () => {
  if (Date.now() - lastAutoScrollAt < 400) return
  stickToBottom = isNearBottom()
}

/**
 * 内容一变就跟随到底部。
 * 依赖取「条数 + 最后一条文本长度」而不是 deep:true：
 * 流式回复是往同一条消息里逐段累加，长度变化正好命中；
 * 若用 deep watch，每个片段都要遍历整个消息数组，长对话下纯属浪费。
 */
watch(
  () => {
    const last = messages.value[messages.value.length - 1]
    return `${messages.value.length}:${last?.content?.length ?? 0}`
  },
  () => {
    if (stickToBottom) scrollToBottom()
  }
)

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
  // 空会话从「跟随底部」重新开始，避免沿用上一个会话「用户正在翻历史」的状态
  stickToBottom = true
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
  // 登录态已失效时不要往下走：用户消息一旦入列，后面无论 startSession 还是 SSE 都会失败，
  // 消息会孤零零留在界面上、看起来像「AI 不理我」。直接走统一登出，语义明确。
  if (!getToken()) {
    handleUnauthorized()
    return
  }
  const content = userMessage.value.trim()
  if (!content) return
  if (content.length > MAX_MESSAGE_LENGTH) {
    ElMessage.error(`单条消息最多 ${MAX_MESSAGE_LENGTH} 字`)
    return
  }
  userMessage.value = ''
  // 用户主动发消息 = 明确要看最新内容：即便此前正在往上翻历史，也强制恢复跟随
  stickToBottom = true
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

/**
 * 新建会话并发起第一轮对话。
 *
 * ⚠️ 必须自己兜住异常：调用方 `sendMessage` 是同步调它的（不 await），
 *    接口一旦失败（401 / 500 / 断网）就是一个 unhandled rejection —— 控制台报错，
 *    而界面上用户那条消息还留着、AI 侧什么都没有，表现为「AI 不理我」。
 *    失败时把乐观插入的那条用户消息撤回、内容还回输入框，用户可以改完直接重发。
 */
const startNewSession = async (content) => {
  const sessionParams = { initialMessage: content }
  sessionParams.sessionTitle = currentSession.value?.status === 'TEMP'
    ? `聪聆 - ${new Date().toLocaleString()}`
    : currentSession.value.sessionTitle

  try {
    const res = await startSession(sessionParams)
    if (!res?.sessionId) throw new Error('会话创建失败')
    const sessionData = {
      sessionId: res.sessionId,
      status: res.status,
      sessionTitle: sessionParams.sessionTitle
    }
    currentSession.value = sessionData
    refreshSessionList()
    startAIResponse(sessionData.sessionId, content)
  } catch (e) {
    // 撤回乐观插入的用户消息（只在「确实是本次那条」时才撤，防止误删别的）
    const last = messages.value[messages.value.length - 1]
    if (last && last.senderType === 1 && last.content === content) {
      messages.value.pop()
    }
    // 把内容还给输入框，不用用户重新打一遍
    if (!userMessage.value) userMessage.value = content
    // 具体原因（如"参数错误"）已由请求拦截器统一弹窗，这里不再重复提示
  }
}

/**
 * 发起流式对话。
 * 说明：fetchEventSource 返回的 Promise 在「被我们自己 abort」时既不 resolve 也不 reject，
 * 所以这里不能用 await（会一直挂着），改为 .catch 兜住 onerror 里抛出的致命错误。
 */
const startAIResponse = async (sessionId, content) => {
  if (isAiTyping.value) return
  // 本地登录态已失效时不要建立 SSE 连接：
  // 请求头里的 token 是「连接建立那一刻」取的快照，之后不会再变；此刻若已没 token，
  // 不但这次对话拿不到回复，done 之后自动触发的情绪接口也会连着失败。
  // 放在 isAiTyping / aiMessage 之前，避免留下一个永远转圈的空气泡。
  if (!getToken()) {
    handleUnauthorized()
    return
  }
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
      ...authHeaders(),
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
    // 切进一个会话时直接落到最新的那条；不这么做会停在最早的消息上
    stickToBottom = true
    scrollToBottom()
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

/**
 * 用户消息的展示（走 v-html，所以必须先转义）。
 *
 * ⚠️ 这里原先是 `String(content).replace(/\n/g, '<br>')` —— **完全没有转义**，
 *    而用户输入是自由的：只要打一句 `<img src=x onerror=...>` 就会被当 HTML 执行
 *    （自 XSS；若将来出现「他人可见」的场景就会升级为存储型 XSS），
 *    最小可复现的破坏是输入 `<b>测试` 之后整段气泡排版错乱。
 *    AI 回复走 MarkdownRenderer（那里有转义），但用户消息一直漏着。
 *
 * 顺序不能反：**先转义、再把换行变 <br>**；反过来的话生成的 <br> 也会被转义掉。
 * 只用覆盖 & / < / > 三个字符即可（文本节点内的 " 和 ' 不需要转义）。
 */
const escapeHtml = (str) =>
  String(str ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')

const formatMessageContent = (content) => escapeHtml(content).replace(/\n/g, '<br>')

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

// 情绪花园折叠态：默认收起，只露「情绪圆环 + 状态」一行
// （小建议 + 治愈小行动 + 风险提示全部展开会很长，把下方会话列表挤到只剩一两条）
const emotionExpanded = ref(false)
const toggleEmotionGarden = () => {
  if (!hasEmotion.value) return
  emotionExpanded.value = !emotionExpanded.value
}

const loadSessionEmotion = async (sessionId) => {
  if (!sessionId) return
  // 登录态已失效（别处登出 / token 过期）时不要再发：
  // 本函数的 catch 会把 401 一并吞掉，表现为「情绪花园毫无理由地变空」，
  // 反而掩盖了真正的登录问题。
  if (!getToken()) return

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
/* ============================================================
   设计变量
   圆角四档 / 字号五级 / 语义色 —— 页面内只引用这些变量
   （落实文档 5.1 圆角体系、4.1 字号阶梯、3.5 语义色）
   ============================================================ */
.consultation {
  /* 品牌色：白字对比度 6.2:1，已达 AA，无需加深（文档 3.1 针对的是截图那套偏浅的灰绿） */
  --primary: #0f6e56;
  --primary-weak: #1d9e75;
  --primary-bg: #e1f5ee;
  --primary-hover-bg: #f0faf6;

  /* 文字三档：text-3 由 #9ca3af 加深为 #6b7280
     对比度 2.54:1 → 4.83:1（白底），达到 AA 4.5:1（落实文档 3.3 / 4.6） */
  --text-1: #1f2937;
  --text-2: #4b5563;
  --text-3: #6b7280;

  --border: #e5e7eb;

  /* 语义色：把散落的硬编码色值收拢成变量（文档 3.5） */
  --warn: #b45309;
  --warn-bg: #fef3c7;
  --danger: #dc2626;
  --danger-bg: #fef2f2;
  --danger-border: #fecaca;

  /* 圆角四档（文档 5.1） */
  --radius-pill: 999px;    /* 按钮 / chip / 头像 */
  --radius-card: 16px;     /* 卡片 / 面板 */
  --radius-bubble: 12px;   /* 消息气泡 / 输入框 */
  --radius-item: 8px;      /* 列表项 / 小标签 */

  /* 字号五级，12px 为下限，不再出现 11px（文档 4.1 / 4.6） */
  --fs-l1: 16px;   /* 页面级标题 */
  --fs-l2: 15px;   /* 区块标题 */
  --fs-l3: 14px;   /* 正文 / 会话标题 */
  --fs-l4: 13px;   /* 辅助说明 */
  --fs-l5: 12px;   /* 时间戳 / 标签 */

  /* 消息流内容限宽（文档 1.3 / 8） */
  --content-max: 760px;

  display: flex;
  gap: 16px;
  width: 100%;
  max-width: 1200px;
  margin: 0 auto;
  height: 100%;
  min-height: 0;
  overflow: hidden;
}

.card {
  background: #fff;
  border: 0.5px solid var(--border);
  border-radius: var(--radius-card);
  padding: 16px;

  .card-title {
    font-size: var(--fs-l3);
    font-weight: 500;
    color: var(--text-1);
    margin: 0 0 12px;
  }

  .block-title {
    font-size: var(--fs-l4);
    font-weight: 500;
    color: var(--text-2);
    margin: 14px 0 8px;
  }
}

/* ============ 左侧栏 ============ */
.sidebar {
  /* 固定 300px 会让主区在小屏上被挤扁，改为区间伸缩（文档 1） */
  width: clamp(240px, 22vw, 280px);
  display: flex;
  flex-direction: column;
  gap: 16px;
  overflow: hidden;
  flex-shrink: 0;
  min-height: 0;
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
    border-radius: var(--radius-pill);
    background: var(--primary-bg);
    display: flex;
    align-items: center;
    justify-content: center;
    flex-shrink: 0;

    img { width: 26px; height: 26px; }
  }

  .ai-meta {
    min-width: 0;

    h3 { font-size: var(--fs-l2); font-weight: 500; color: var(--text-1); margin: 0 0 4px; }

    .online {
      font-size: var(--fs-l5);
      color: var(--text-2);
      margin: 0;
      display: flex;
      align-items: center;
      gap: 6px;

      .dot {
        width: 6px;
        height: 6px;
        border-radius: var(--radius-pill);
        background: var(--primary-weak);
        flex-shrink: 0;
      }
    }
  }
}

/* 2. 情绪花园 */
.emotion-garden {
  flex-shrink: 1;
  min-height: 0;
  overflow-y: auto;

  /* 卡片头：整行可点，折叠/展开详情 */
  .card-head {
    margin: 0 0 12px;

    .head-toggle {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 8px;
      width: 100%;
      padding: 0;
      border: 0;
      background: none;
      font: inherit;
      color: inherit;
      text-align: left;
      cursor: pointer;
      border-radius: var(--radius-item);

      /* 标题原本自带 12px 下边距，改由 .card-head 统一控制 */
      .card-title { margin: 0; transition: color .15s ease; }

      &:hover .card-title { color: var(--primary); }
      &:focus-visible { outline: 2px solid var(--primary); outline-offset: 2px; }
    }

    .head-chevron {
      display: inline-flex;
      align-items: center;
      color: var(--text-3);
      transition: transform .2s ease;

      &.expanded { transform: rotate(180deg); }
    }
  }

  .emotion-empty {
    padding: 20px 8px;
    text-align: center;

    .emotion-empty-title {
      margin: 0 0 6px;
      font-size: var(--fs-l4);
      font-weight: 500;
      color: var(--text-2);
    }

    .emotion-empty-tip {
      margin: 0;
      font-size: var(--fs-l5);
      color: var(--text-3);
      line-height: 1.75;
    }
  }

  /* 折叠态可见的一行：情绪圆环 + 状态。分隔线与上间距移交给 .emotion-detail */
  .emotion-main {
    display: flex;
    align-items: center;
    gap: 14px;
  }

  /* 折叠区：分隔线 / 上间距 / 首块边距归零都在这里收口 */
  .emotion-detail {
    margin-top: 14px;
    padding-top: 14px;
    border-top: 0.5px solid var(--border);

    > :first-child { margin-top: 0; }
    > :first-child .block-title { margin-top: 0; }
  }

  /* 展开/收起过渡：纯 CSS，无额外 JS */
  .emotion-expand-enter-active,
  .emotion-expand-leave-active {
    transition: opacity .18s ease, transform .18s ease;
  }
  .emotion-expand-enter-from,
  .emotion-expand-leave-to {
    opacity: 0;
    transform: translateY(-4px);
  }

  .emotion-circle {
    width: 64px;
    height: 64px;
    border-radius: var(--radius-pill);
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

    .emotion-name { font-size: var(--fs-l3); font-weight: 500; line-height: 1.25; }
    .emotion-score {
      font-size: var(--fs-l5);
      opacity: 0.85;
      font-variant-numeric: tabular-nums;
    }
  }

  .emotion-status {
    flex: 1;
    min-width: 0;
    font-size: var(--fs-l4);

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
        border-radius: var(--radius-pill);
        background: #e5e7eb;

        &.active { background: var(--primary); }
      }

      .intensity-text { font-size: var(--fs-l5); color: var(--text-3); }
    }
  }

  .suggestion {
    display: flex;
    gap: 8px;
    margin-top: 14px;

    .suggestion-icon { font-size: 15px; flex-shrink: 0; line-height: 1.4; }

    .suggestion-body {
      min-width: 0;

      .suggestion-label { font-size: var(--fs-l4); font-weight: 500; color: var(--text-2); }
      .suggestion-text {
        font-size: var(--fs-l4);
        color: var(--text-2);
        margin: 4px 0 0;
        line-height: 1.75;
      }
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
      font-size: var(--fs-l4);
      color: var(--text-2);

      &:last-child { border-bottom: none; }

      .action-icon { flex-shrink: 0; line-height: 1.6; }
      .action-text { line-height: 1.6; }
    }
  }

  .risk {
    background: var(--warn-bg);
    border-radius: var(--radius-item);
    padding: 12px;
    margin-top: 14px;

    .block-title { margin: 0 0 6px; color: var(--warn); }
    .risk-text {
      margin: 0;
      font-size: var(--fs-l4);
      color: var(--warn);
      line-height: 1.75;
    }
  }
}

/* 3. 会话列表 */
.session-history {
  flex: 1;
  display: flex;
  flex-direction: column;
  min-height: 0;
  overflow: hidden;

  .session-list {
    margin: 0;
    padding: 0;
    overflow-y: auto;
    flex: 1;
    min-height: 0;
    list-style: none;
  }

  .session-empty {
    list-style: none;
    padding: 20px 8px;
    text-align: center;
    font-size: var(--fs-l5);
    color: var(--text-3);
  }

  .session-more {
    flex-shrink: 0;
    margin-top: 8px;
    padding: 7px;
    border: 0.5px solid var(--border);
    border-radius: var(--radius-pill);
    background: transparent;
    color: var(--text-2);
    font-size: var(--fs-l5);
    cursor: pointer;
    transition: background 0.15s;

    &:hover:not(:disabled) { background: var(--primary-hover-bg); }
    &:disabled { color: var(--text-3); cursor: not-allowed; }
  }

  .session-item {
    position: relative;
    list-style: none;
    padding: 10px;
    border-radius: var(--radius-item);
    cursor: pointer;
    border-bottom: 0.5px solid var(--border);
    transition: background 0.15s;

    &:hover { background: var(--primary-hover-bg); }

    /* 当前会话：浅绿底 + 左侧 3px 主色竖条（文档 5.5）
       原来点击会话后列表没有任何选中反馈，看不出当前在哪一条 */
    &.active {
      background: var(--primary-bg);
      box-shadow: inset 3px 0 0 var(--primary);
    }

    .session-row {
      display: flex;
      justify-content: space-between;
      align-items: center;
      gap: 8px;
      margin-bottom: 4px;

      .session-title {
        flex: 1;
        min-width: 0;
        font-size: var(--fs-l4);
        font-weight: 500;
        color: var(--text-1);
        white-space: nowrap;
        overflow: hidden;
        text-overflow: ellipsis;
      }

      .session-time {
        flex-shrink: 0;
        font-size: var(--fs-l5);
        color: var(--text-3);
        font-variant-numeric: tabular-nums;
      }
    }

    .session-preview {
      font-size: var(--fs-l5);
      color: var(--text-3);
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
      padding-right: 24px;
    }

    .session-meta {
      margin-top: 2px;
      font-size: var(--fs-l5);
      color: var(--text-3);
      font-variant-numeric: tabular-nums;
    }

    .session-delete {
      position: absolute;
      top: 8px;
      right: 8px;
      width: 24px;
      height: 24px;
      border: none;
      background: #f3f4f6;
      color: var(--text-3);
      border-radius: var(--radius-pill);
      cursor: pointer;
      font-size: var(--fs-l3);
      line-height: 1;
      opacity: 0;
      transition: opacity 0.15s, color 0.15s;

      &:hover { color: var(--danger); }
    }

    &:hover .session-delete,
    &:focus-within .session-delete { opacity: 1; }
  }
}

/* ============ 右侧聊天 ============ */
.chat {
  flex: 1;
  display: flex;
  flex-direction: column;
  background: #fff;
  border: 0.5px solid var(--border);
  border-radius: var(--radius-card);
  overflow: hidden;
  min-width: 0;
}

.chat-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  padding: 14px 20px;
  border-bottom: 0.5px solid var(--border);
  flex-shrink: 0;

  .chat-info {
    min-width: 0;

    h2 {
      font-size: var(--fs-l1);
      font-weight: 500;
      color: var(--text-1);
      margin: 0 0 2px;
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
    }

    p { font-size: var(--fs-l5); color: var(--text-3); margin: 0; }
  }

  .new-session {
    flex-shrink: 0;
    min-height: 32px;
    border: 0.5px solid var(--primary);
    color: var(--primary);
    background: transparent;
    border-radius: var(--radius-pill);
    padding: 6px 16px;
    font-size: var(--fs-l4);
    cursor: pointer;
    transition: background 0.15s;

    &:hover { background: var(--primary-hover-bg); }
  }
}

.chat-messages {
  flex: 1;
  min-height: 0;
  overflow-y: auto;
  padding: 20px;
  background: #fafbfa;
}

/* 内容限宽居中：大屏下气泡不会被推到两侧、行长也不会失控（文档 1.3） */
.messages-inner {
  display: flex;
  flex-direction: column;
  gap: 16px;
  width: 100%;
  max-width: var(--content-max);
  margin: 0 auto;
}

.msg {
  display: flex;
  gap: 10px;
  align-items: flex-start;

  .avatar {
    width: 32px;
    height: 32px;
    border-radius: var(--radius-pill);
    background: var(--primary-bg);
    display: flex;
    align-items: center;
    justify-content: center;
    flex-shrink: 0;

    img { width: 18px; height: 18px; }
  }

  .bubble {
    /* 560px ≈ 14px 下 34 个汉字，落在舒适行长区间（文档 4.3） */
    max-width: min(72%, 560px);
    font-size: var(--fs-l3);
    line-height: 1.75;
    padding: 10px 14px;
    border-radius: var(--radius-bubble);
    overflow-wrap: anywhere;

    .time {
      display: block;
      font-size: var(--fs-l5);
      color: var(--text-3);
      margin-top: 6px;
      font-variant-numeric: tabular-nums;
    }
  }

  &.ai .bubble { background: #fff; border: 0.5px solid var(--border); color: var(--text-1); }

  &.user {
    flex-direction: row-reverse;

    .avatar { background: #e5e7eb; }

    .bubble {
      background: var(--primary);
      color: #fff;
      text-align: left;
    }

    /* 深绿底上的时间戳：原 #9ca3af 只有 2.44:1，几乎看不见。
       改用 85% 白，对比度约 4.98:1（文档 2.3） */
    .bubble .time { color: rgba(255, 255, 255, 0.85); }
  }
}

.typing {
  display: flex;
  gap: 4px;
  padding: 4px 0;

  .typing-dot {
    width: 7px;
    height: 7px;
    border-radius: var(--radius-pill);
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
  color: var(--danger);
  background: var(--danger-bg);
  border: 0.5px solid var(--danger-border);
  border-radius: var(--radius-item);
  padding: 10px 12px;
}

.chat-input {
  display: flex;
  gap: 10px;
  align-items: flex-end;
  padding: 14px 20px calc(14px + env(safe-area-inset-bottom));
  border-top: 0.5px solid var(--border);
  background: #fff;
  flex-shrink: 0;

  .input-box { flex: 1; min-width: 0; }

  textarea {
    width: 100%;
    border: 0.5px solid var(--border);
    border-radius: var(--radius-bubble);
    padding: 10px 12px;
    font-size: var(--fs-l3);
    line-height: 1.5;
    resize: none;
    outline: none;
    font-family: inherit;
    color: var(--text-1);
    background: #fff;
    transition: border-color 0.15s, box-shadow 0.15s;

    &::placeholder { color: var(--text-3); }

    /* 聚焦态：描边 + 浅色光圈（文档 6.7） */
    &:focus {
      border-color: var(--primary);
      box-shadow: 0 0 0 3px var(--primary-hover-bg);
    }

    &:disabled { background: #f9fafb; cursor: not-allowed; }
  }

  .input-meta {
    display: flex;
    justify-content: space-between;
    gap: 8px;
    font-size: var(--fs-l5);
    color: var(--text-3);
    margin-top: 6px;

    .over { color: var(--danger); }
    span:last-child { font-variant-numeric: tabular-nums; }
  }

  .send-btn {
    width: 44px;
    height: 44px;
    border: none;
    border-radius: var(--radius-pill);
    background: var(--primary);
    color: #fff;
    font-size: 20px;
    cursor: pointer;
    flex-shrink: 0;
    transition: background 0.15s, opacity 0.15s;

    &:hover:not(:disabled) { background: var(--primary-weak); }

    /* 禁用态改为「主色 + 40% 不透明度」：比原来的灰块更能表达
       「功能还在，只是还不能点」（文档 6.2） */
    &:disabled { opacity: 0.4; cursor: not-allowed; }
  }

  .stop-btn {
    height: 44px;
    padding: 0 18px;
    border: 0.5px solid var(--border);
    border-radius: var(--radius-pill);
    background: #fff;
    color: var(--text-2);
    font-size: var(--fs-l4);
    cursor: pointer;
    flex-shrink: 0;
    transition: background 0.15s;

    &:hover { background: #f3f4f6; }
  }
}

/* ============ 响应式 ============ */
/* ≥1440：内容区 760px 居中（默认值） */
/* 1024–1439：收窄内容限宽，避免行长过长（用 1439 排除 1440 这个边界点，避免两档重叠） */
@media (max-width: 1439px) {
  .consultation { --content-max: 680px; }
}

/* 768–1024：左栏进一步收窄 */
@media (max-width: 1024px) {
  .sidebar { width: 220px; }
}

/* <768：左栏改为顶部横向滚动（保持原交互方式，不引入需要 JS 的 Drawer），
   同时补齐移动端触控目标与安全区（文档 8） */
@media (max-width: 768px) {
  .consultation {
    flex-direction: column;
    height: auto;
    gap: 12px;
    --content-max: 100%;
  }

  .sidebar {
    width: 100%;
    flex-direction: row;
    overflow-x: auto;
    overflow-y: hidden;
    flex-shrink: 0;
    padding-bottom: 4px;
    scroll-snap-type: x proximity;
  }

  .sidebar .card {
    min-width: 260px;
    flex-shrink: 0;
    scroll-snap-align: start;
  }

  .session-history { max-height: 240px; }

  .msg .bubble { max-width: 84%; }

  .chat-header .new-session {
    min-height: 44px;
    padding: 0 18px;
  }

  .session-history {
    .session-item { padding: 12px 10px; }
    .session-delete { width: 28px; height: 28px; opacity: 1; }
  }

  .chat-input { padding: 12px 14px calc(12px + env(safe-area-inset-bottom)); }
}
</style>
