<template>
  <RoutePage :title="sessionTitle">
    <div v-loading="loading" class="session-detail">
      <div class="detail-header">
        <div class="detail-row">
          <span class="detail-label">用户</span>
          <span class="detail-value">{{ detail.userNickname || '-' }}</span>
        </div>
        <div class="detail-row">
          <span class="detail-label">会话标题</span>
          <span class="detail-value">{{ detail.sessionTitle || '-' }}</span>
        </div>
        <div class="detail-row">
          <span class="detail-label">开始时间</span>
          <span class="detail-value">{{ detail.startedAt || '-' }}</span>
        </div>
        <div class="detail-row">
          <span class="detail-label">最近消息</span>
          <span class="detail-value">{{ detail.lastMessageContent || '-' }}</span>
        </div>
        <div class="detail-row">
          <span class="detail-label">消息数</span>
          <span class="detail-value">{{ detail.messageCount ?? '-' }}</span>
        </div>
      </div>

      <div class="messages-container">
        <h4 class="messages-heading">对话记录</h4>
        <div class="messages-list">
          <div v-if="messages.length === 0 && !loading" class="empty-tip">暂无对话记录</div>
          <div
            v-for="item in messages"
            :key="item.id"
            class="message-item"
            :class="item.senderType === 1 ? 'user-message' : 'ai-message'"
          >
            <div class="message-header">
              <span class="sender">{{ item.senderType === 1 ? '用户' : 'AI助手' }}</span>
              <span class="time">{{ item.createdAt }}</span>
            </div>
            <div class="message-content">{{ item.content }}</div>
          </div>
        </div>
      </div>
    </div>
  </RoutePage>
</template>

<script setup>
import { computed, onMounted, ref } from 'vue'
import { useRoute } from 'vue-router'
import RoutePage from '@/views/RoutePage.vue'
import { getSeeionDetail } from '@/api/admin'
import { useDetailStore } from '@/stores/detail'

const route = useRoute()
const detailStore = useDetailStore()

const detail = ref({})
const messages = ref([])
const loading = ref(false)
const sessionTitle = computed(() => detail.value.sessionTitle || '咨询会话详情')

onMounted(async () => {
  // 父列表页跳转前已把整条会话记录塞进 store，这里读取即得全部列表字段
  detail.value = detailStore.current || {}

  const sessionId = route.params.sessionId
  if (!sessionId) return
  loading.value = true
  try {
    messages.value = (await getSeeionDetail(sessionId)) || []
  } catch (e) {
    messages.value = []
  } finally {
    loading.value = false
  }
})
</script>

<style lang="scss" scoped>
.session-detail {
  .detail-header {
    margin-bottom: 20px;
    padding: 16px;
    background: var(--bg-soft, #f8f9fa);
    border-radius: 8px;
    border: 1px solid var(--border, #e9ecef);
  }

  .detail-row {
    display: flex;
    align-items: center;
    margin-bottom: 8px;

    &:last-child {
      margin-bottom: 0;
    }

    .detail-label {
      font-weight: 500;
      color: var(--text-2, #495057);
      min-width: 80px;
      margin-right: 8px;
    }

    .detail-value {
      color: var(--text-1, #333);
    }
  }
}

.messages-container {
  .messages-heading {
    position: relative;
    margin: 0 0 16px;
    padding-left: 12px;
    color: var(--text-1, #333);
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

  .messages-list {
    max-height: 480px;
    overflow-y: auto;
    border: 1px solid var(--border, #e9ecef);
    border-radius: 8px;
    padding: 16px;
    background: var(--bg-card, #fff);

    .empty-tip {
      text-align: center;
      color: var(--text-3, #999);
      padding: 24px 0;
    }

    .message-item {
      margin-bottom: 12px;
      padding: 12px;
      border-radius: 8px;
      background: var(--bg-soft, #f8f9fa);
      border: 1px solid var(--border, #e9ecef);

      &:last-child {
        margin-bottom: 0;
      }

      &.user-message {
        background: #e8f4fd;
      }

      &.ai-message {
        background: #f0f9f0;
      }

      .message-header {
        display: flex;
        justify-content: space-between;
        align-items: center;
        margin-bottom: 8px;

        .sender {
          font-weight: 500;
          color: var(--text-1, #333);
        }

        .time {
          font-size: 12px;
          color: var(--text-3, #999);
        }
      }

      .message-content {
        color: var(--text-1, #333);
        line-height: 1.6;
        white-space: pre-wrap;
        margin-top: 8px;
        font-size: 14px;
      }
    }
  }
}
</style>