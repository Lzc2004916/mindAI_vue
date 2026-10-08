<template>
  <div>
    <PageHead title="用户管理" />
    <TableSearch :formItem="formItem" @search="handleSearch" />

    <el-table :data="tableData" v-loading="loading" style="width: 100%">
      <el-table-column label="用户" min-width="150">
        <template #default="scope">
          <div class="user-cell">
            <el-avatar :size="32" :src="avatarUrl(scope.row.avatar)">
              {{ (scope.row.nickname || scope.row.username || '?').charAt(0) }}
            </el-avatar>
            <div class="user-meta">
              <div class="user-name">{{ scope.row.nickname || scope.row.username || '-' }}</div>
              <div class="user-sub">ID: {{ scope.row.id }}</div>
            </div>
          </div>
        </template>
      </el-table-column>
      <el-table-column prop="username" label="用户名" min-width="110" />
      <el-table-column label="邮箱" min-width="160">
        <template #default="scope">{{ scope.row.email || '-' }}</template>
      </el-table-column>
      <el-table-column label="性别" width="70">
        <template #default="scope">{{ genderText(scope.row.gender) }}</template>
      </el-table-column>
      <el-table-column label="角色" width="90">
        <template #default="scope">
          <el-tag :type="scope.row.userType === 2 ? 'warning' : 'info'" size="small">
            {{ scope.row.userType === 2 ? '管理员' : '用户' }}
          </el-tag>
        </template>
      </el-table-column>
      <el-table-column label="状态" width="80">
        <template #default="scope">
          <el-tag :type="scope.row.status === 1 ? 'success' : 'danger'" size="small">
            {{ scope.row.status === 1 ? '正常' : '禁用' }}
          </el-tag>
        </template>
      </el-table-column>
      <el-table-column label="注册时间" width="110">
        <template #default="scope">{{ formatTime(scope.row.createdAt) }}</template>
      </el-table-column>
      <el-table-column label="操作" width="200" fixed="right">
        <template #default="scope">
          <el-button type="primary" text @click="openDetail(scope.row)">详情</el-button>
          <!-- 后端会拒绝「禁用自己」，这里直接把按钮藏掉，省得用户点了才报错 -->
          <el-button
            v-if="scope.row.id !== auth.userInfo?.id"
            :type="scope.row.status === 1 ? 'danger' : 'success'"
            text
            @click="toggleStatus(scope.row)"
          >
            {{ scope.row.status === 1 ? '禁用' : '启用' }}
          </el-button>
        </template>
      </el-table-column>
    </el-table>

    <el-pagination
      style="margin-top: 20px;"
      :current-page="pagination.pageNum"
      :page-size="pagination.pageSize"
      :total="pagination.total"
      layout="prev, pager, next"
      @current-change="handlePageChange"
    />

    <!-- 用户详情抽屉 -->
    <el-drawer v-model="drawerVisible" title="用户详情" size="420px">
      <div v-loading="detailLoading">
        <div v-if="detail" class="detail-head">
          <el-avatar :size="64" :src="avatarUrl(detail.avatar)">
            {{ (detail.nickname || detail.username || '?').charAt(0) }}
          </el-avatar>
          <div class="detail-title">
            <div class="detail-name">{{ detail.nickname || detail.username }}</div>
            <el-tag :type="detail.status === 1 ? 'success' : 'danger'" size="small">
              {{ detail.status === 1 ? '正常' : '禁用' }}
            </el-tag>
          </div>
        </div>
        <el-descriptions v-if="detail" :column="1" border class="detail-body">
          <el-descriptions-item label="用户ID">{{ detail.id }}</el-descriptions-item>
          <el-descriptions-item label="用户名">{{ detail.username }}</el-descriptions-item>
          <el-descriptions-item label="昵称">{{ detail.nickname || '-' }}</el-descriptions-item>
          <el-descriptions-item label="邮箱">{{ detail.email || '-' }}</el-descriptions-item>
          <el-descriptions-item label="手机号">{{ detail.phone || '-' }}</el-descriptions-item>
          <el-descriptions-item label="性别">{{ genderText(detail.gender) }}</el-descriptions-item>
          <el-descriptions-item label="生日">{{ detail.birthday || '-' }}</el-descriptions-item>
          <el-descriptions-item label="角色">{{ detail.userType === 2 ? '管理员' : '普通用户' }}</el-descriptions-item>
          <el-descriptions-item label="登录失败次数">{{ detail.loginFailCount ?? 0 }}</el-descriptions-item>
          <el-descriptions-item label="锁定至">
            {{ detail.lockedUntil ? formatTime(detail.lockedUntil, true) : '未锁定' }}
          </el-descriptions-item>
          <el-descriptions-item label="注册时间">{{ formatTime(detail.createdAt, true) }}</el-descriptions-item>
          <el-descriptions-item label="更新时间">{{ formatTime(detail.updatedAt, true) }}</el-descriptions-item>
        </el-descriptions>
      </div>
    </el-drawer>
  </div>
</template>

<script setup>
import { ref, reactive, onMounted } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import PageHead from '@/components/PageHead.vue'
import TableSearch from '@/components/TableSearch.vue'
import { getUserPage, changeUserStatus, getUserDetail } from '@/api/admin'
import { useAuthStore } from '@/stores/auth'
import { fileBaseUrl } from '@/config'

const auth = useAuthStore()

const formItem = [
  { comp: 'input', prop: 'keyword', label: '关键词', placeholder: '用户名 / 邮箱' },
  {
    comp: 'select', prop: 'status', label: '状态', placeholder: '请选择状态',
    options: [
      { label: '正常', value: 1 },
      { label: '禁用', value: 0 }
    ]
  }
]

const tableData = ref([])
const loading = ref(false)
// 当前生效的筛选条件（TableSearch 触发时更新，翻页时复用）
const filters = reactive({ keyword: undefined, status: undefined })
const pagination = reactive({ pageNum: 1, pageSize: 10, total: 0 })

const genderText = (g) => (g === 1 ? '男' : g === 2 ? '女' : '未知')
/** filePath 是后端存的相对路径（/files/...），显示时要拼 fileBaseUrl */
const avatarUrl = (path) => (path ? fileBaseUrl + path : undefined)
/** 后端返回 ISO 字符串（2026-10-07T15:00:00），withTime 时显示到分钟 */
const formatTime = (t, withTime = false) => {
  if (!t) return '-'
  return String(t).replace('T', ' ').slice(0, withTime ? 16 : 10)
}

const fetchList = async () => {
  loading.value = true
  try {
    const res = await getUserPage({
      pageNum: pagination.pageNum,
      pageSize: pagination.pageSize,
      keyword: filters.keyword || undefined,
      status: filters.status ?? undefined
    })
    tableData.value = res?.records || []
    pagination.total = res?.total || 0
  } catch (e) {
    // 失败提示已由拦截器统一弹出，这里兜底清空，避免表格停在上次数据上
    tableData.value = []
    pagination.total = 0
  } finally {
    loading.value = false
  }
}

/** TableSearch 查询/重置都会带着最新条件走这里：回到第一页再查 */
const handleSearch = (params) => {
  filters.keyword = params.keyword
  filters.status = params.status
  pagination.pageNum = 1
  fetchList()
}

const handlePageChange = (page) => {
  pagination.pageNum = page
  fetchList()
}

/** 禁用/启用：二次确认 → 调接口 → 局部刷新该行状态 */
const toggleStatus = async (row) => {
  const target = row.status === 1 ? 0 : 1
  const actionText = target === 0 ? '禁用' : '启用'
  try {
    await ElMessageBox.confirm(
      target === 0
        ? `禁用后「${row.nickname || row.username}」将立即无法登录，确定禁用？`
        : `确定恢复「${row.nickname || row.username}」的登录权限？`,
      `${actionText}确认`,
      { confirmButtonText: `确定${actionText}`, cancelButtonText: '取消', type: 'warning' }
    )
  } catch (e) {
    return // 用户点了取消
  }
  try {
    await changeUserStatus(row.id, target)
    ElMessage.success(`${actionText}成功`)
    row.status = target
  } catch (e) {
    // 失败提示已由拦截器统一弹出
  }
}

/* ---- 详情抽屉 ---- */
const drawerVisible = ref(false)
const detailLoading = ref(false)
const detail = ref(null)

const openDetail = async (row) => {
  drawerVisible.value = true
  detailLoading.value = true
  detail.value = null
  try {
    detail.value = await getUserDetail(row.id)
  } catch (e) {
    drawerVisible.value = false
  } finally {
    detailLoading.value = false
  }
}

onMounted(fetchList)
</script>

<style lang="scss" scoped>
.user-cell {
  display: flex;
  align-items: center;
  gap: 10px;

  .user-name {
    font-weight: 500;
    color: #333;
  }

  .user-sub {
    font-size: 12px;
    color: #999;
  }
}

.detail-head {
  display: flex;
  align-items: center;
  gap: 14px;
  margin-bottom: 20px;

  .detail-name {
    font-size: 17px;
    font-weight: 600;
    color: #2d3748;
    margin-bottom: 6px;
  }
}
</style>
