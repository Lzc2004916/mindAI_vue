<template>
  <div>
    <PageHead title="咨询记录" />
    <el-table :data="tableData" style="width: 100%">
      <el-table-column label="会话id" width="100">
        <template #default="scope">
          <el-avatar :size="48">
            {{ scope.row.userNickname }}
          </el-avatar>
        </template>
      </el-table-column>
      <el-table-column  label="情绪日志">
        <template #default="scope">
          <div class="session-title">{{ scope.row.sessionTitle }}</div>
          <div class="session-preview">{{ scope.row.lastMessageContent }}</div>
        </template>
      </el-table-column>
      <el-table-column label="消息数" prop="messageCount" width="100" />
      <el-table-column prop="lastMessageTime" label="时间" width="100" />
       <el-table-column  label="操作" width="100">
        <template #default="scope">
          <el-button type="primary" text @click="viewSeesionDetail(scope.row)">详情</el-button>
                 </template>
      </el-table-column>
    </el-table>
    <el-pagination
      style="margin-top: 20px;"
      :current-page="pagination.currentPage"
      :page-size="pagination.pageSize"
      :total="pagination.total"
      layout="prev, pager, next"
      @current-change="handlePageChange"
    />
    <el-dialog
    v-model="showDetailDialog"
    title="咨询会话详情"
    width="70%"
    :close-on-click-modal="false"
    >
    <div class="session-detail">
      <div class="detail-header">
        <div class="detail-row">
          <div class="detail-label">用户：</div>
          <div class="detail-value">{{ sessionDetail.userNickname }}</div>
        </div>
        <div class="detail-row">
          <div class="detail-label">开始时间：</div>
          <div class="detail-value">{{ sessionDetail.startedAt }}</div>
        </div>
        <div class="detail-row">
          <div class="detail-label">消息数：</div>
          <div class="detail-value">{{ sessionDetail.messageCount }}</div>
        </div>
      </div>
      <div class="messages-container">
        <div class="message-header">
          <h4>对话记录</h4>
        </div>
        <div class="messages-list" v-loading="loadingMessages">
        <div v-for="item in seeionMessages" :key="item.id" class="message-item" 
        :class="item.senderType === 1 ?  'user-message' :  'ai-message'">
        <div class="message-header">
          <span class="sender">{{ item.senderType === 1 ? '用户' : 'AI助手' }}</span>
          <span class="time">{{ item.createdAt }}</span>
        </div>
        <div class="message-content">
          {{ item.content }}
        </div>
        </div>
      </div>
      </div>
    </div>
    <template #footer>
      <el-button @click="showDetailDialog = false">关闭</el-button>
    </template>
    </el-dialog>
  </div>
</template>

<script setup>
import { ref,onMounted, reactive } from "vue"
import PageHead from "@/components/PageHead.vue"
import { getConsultationPage,getSeeionDetail } from "@/api/admin";
const tableData = ref([])
const pagination = reactive({
    currentPage: 1,
    pageSize: 10,
    total: 0,
})
const loadingMessages = ref(false)
const showDetailDialog = ref(false)
const seeionMessages = ref([])
const sessionDetail = ref({})
/**
 * 拉取会话列表。
 *
 * ⚠️ 原来是把整个 `pagination` 对象当查询参数发出去（`getConsultationPage(pagination)`），
 *    于是 URL 上会多出一个毫无意义的 `?total=0`；更麻烦的是它依赖「后端恰好同时认识
 *    currentPage 和 pageNum」这件事，一旦后端收敛成一个页码字段就会静默失效。
 *    这里显式只发后端 DTO（SessionPageQuery）里存在的两个字段。
 *
 * ⚠️ 原来没有 try/catch：接口失败时是 unhandled rejection，表格会停在上一次的数据上，
 *    看起来「点了查询没反应」。现在失败即清空，且不会把 reject 抛到控制台。
 */
const handleSearch = async () => {
    try {
        const res = await getConsultationPage({
            currentPage: pagination.currentPage,
            pageSize: pagination.pageSize
        })
        // res 可能为 null（失败已被拦截器 reject），统一兜底
        tableData.value = res?.records || []
        pagination.total = res?.total || 0
    } catch (e) {
        tableData.value = []
        pagination.total = 0
    }
}
/** 翻页：先同步页码再请求（Element Plus 只给了新页码，不会替我们改这个对象） */
const handlePageChange = (page) => {
    pagination.currentPage = page
    handleSearch()
}
/**
 * 打开会话详情。
 * ⚠️ 原来 loadingMessages 在 await 之前置 true、之后置 false，中间的 await 没有 try ——
 *    消息接口一旦失败（会话被删 / 401 / 500），loading 会永远停在 true，弹窗里一直转圈。
 *    改成 try/finally：无论成败都收掉 loading。
 */
const viewSeesionDetail = async (row) => {
    sessionDetail.value = row
    seeionMessages.value = []
    loadingMessages.value = true
    showDetailDialog.value = true
    try {
        seeionMessages.value = (await getSeeionDetail(row.id)) || []
    } catch (e) {
        seeionMessages.value = []
    } finally {
        loadingMessages.value = false
    }
}
onMounted(()=>{
    handleSearch()
})
//详情
</script>

<style lang="scss" scoped>
 .session-title {
    font-weight: 500;
    color: #333;
    margin-bottom: 4px;
  }
  .session-preview {
    font-size: 13px;
    color: #666;
    margin-bottom: 4px;
    display: -webkit-box;
    -webkit-line-clamp: 2;
    line-clamp: 2;
    -webkit-box-orient: vertical;
    overflow: hidden;
  }
  .session-detail {
    max-height: 70vh;
    overflow-y: auto;
    .detail-header {
      margin-bottom: 20px;
      padding: 16px;
      background: #f8f9fa;
      border-radius: 8px;
      border: 1px solid #e9ecef;
    }

    .detail-row {
      display: flex;
      align-items: center;
      margin-bottom: 8px;
      :last-child {
        margin-bottom: 0;
      }
      .detail-label {
        font-weight: 500;
        color: #495057;
        min-width: 80px;
        margin-right: 8px;
      }

      .detail-value {
        color: #333;
      }
    }
  }
  .messages-container {
    margin-top: 20px;
    .messages-header {
      margin-bottom: 16px;
      h4 {
        margin: 0;
        color: #333;
        font-size: 16px;
        font-weight: 500;
      }
    }
    .messages-list {
      max-height: 400px;
      overflow-y: auto;
      border: 1px solid #e9ecef;
      border-radius: 8px;
      padding: 16px;
      background: #fff;
      .message-item {
        margin-bottom: 12px;
        padding: 12px;
        border-radius: 8px;
        background: #f8f9fa;
        border: 1px solid #e9ecef;
        :last-child {
          margin-bottom: 0;
        }
        &.user-message {
          background: #e8f4fd;
        }

        &.ai-message {
          background: #f0f9f0;
        }
      }
      .message-header {
        display: flex;
        justify-content: space-between;
        align-items: center;
        margin-bottom: 8px;
        .sender {
          font-weight: 500;
          color: #333;
          display: flex;
          align-items: center;
          gap: 4px;
        }

        .time {
          font-size: 12px;
          color: #999;
        }

        .message-content {
          color: #333;
          line-height: 1.6;
          white-space: pre-wrap;
          margin-top: 8px;
          font-size: 14px;
        }
      }
    }
  }
</style>
