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
    </div>
</template>

<script setup>
import { ref,onMounted, reactive } from "vue"
import { useRouter } from "vue-router"
import PageHead from "@/components/PageHead.vue"
import { getConsultationPage } from "@/api/admin";
import { useDetailStore } from "@/stores/detail";
const tableData = ref([])
const pagination = reactive({
    currentPage: 1,
    pageSize: 10,
    total: 0,
})
const router = useRouter()
const detailStore = useDetailStore()
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
// 详情：跳转到独立详情页，整条记录经 store 零丢失传过去
const viewSeesionDetail = (row) => {
    detailStore.setCurrent(row)
    router.push(`/back/consultations/${row.id}`)
}
onMounted(()=>{
    handleSearch()
})
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
</style>
