<template>
  <div class="knowledge-page">
    <div class="page-container">
      <header class="page-header">
        <h1 class="page-title">心理健康知识库</h1>
        <p class="page-desc">了解情绪背后的原因，比对抗情绪更有用</p>
      </header>

      <!-- 未登录：后端知识库接口都需要 token，这里给明确引导而不是让它报错 -->
      <section v-if="!auth.isLogin" class="card login-tip">
        <p class="tip-title">登录后即可浏览知识库</p>
        <p class="tip-desc">知识文章需要登录才能查看</p>
        <el-button type="primary" @click="goLogin">去登录</el-button>
      </section>

      <template v-else>
        <!-- 筛选 -->
        <section class="card filter-card">
          <div class="category-bar">
            <span
              class="category-item"
              :class="{ active: categoryId === '' }"
              @click="selectCategory('')"
            >全部</span>
            <span
              v-for="item in categories"
              :key="item.id"
              class="category-item"
              :class="{ active: categoryId === item.id }"
              @click="selectCategory(item.id)"
            >{{ item.categoryName }}</span>
          </div>
          <div class="search-bar">
            <el-input
              v-model="keyword"
              placeholder="搜索文章标题或摘要"
              clearable
              @keyup.enter="handleSearch"
              @clear="handleSearch"
            />
            <el-button type="primary" @click="handleSearch">搜索</el-button>
          </div>
        </section>

        <!-- 列表 -->
        <section class="card">
          <div v-loading="loading" class="article-list">
            <div v-if="!loading && articles.length === 0" class="empty-state">
              <p class="empty-title">没有找到文章</p>
              <p class="empty-tip">换个分类或关键词试试</p>
            </div>

            <article
              v-for="item in articles"
              :key="item.id"
              class="article-item"
              @click="openDetail(item)"
            >
              <div class="article-cover" v-if="item.coverImage">
                <img :src="fileBaseUrl + item.coverImage" :alt="item.title" />
              </div>
              <div class="article-body">
                <h3 class="article-title">{{ item.title }}</h3>
                <p class="article-summary">{{ item.summary || '暂无摘要' }}</p>
                <div class="article-meta">
                  <el-tag v-if="categoryName(item.categoryId)" size="small" type="info">
                    {{ categoryName(item.categoryId) }}
                  </el-tag>
                  <span v-if="item.publishedAt">{{ formatDate(item.publishedAt) }}</span>
                  <span v-if="item.readCount !== undefined && item.readCount !== null">
                    阅读 {{ item.readCount }}
                  </span>
                </div>
              </div>
            </article>
          </div>

          <el-pagination
            v-if="total > pageSize"
            class="pagination-bar"
            :current-page="pageNum"
            :page-size="pageSize"
            layout="prev, pager, next"
            :total="total"
            @current-change="handlePageChange"
          />
        </section>
      </template>
    </div>

    <!-- 文章详情 -->
    <el-dialog v-model="detailVisible" :title="current.title || '文章详情'" width="760px" destroy-on-close>
      <div v-loading="detailLoading" class="detail-body">
        <div class="detail-meta">
          <el-tag v-if="categoryName(current.categoryId)" size="small" type="info">
            {{ categoryName(current.categoryId) }}
          </el-tag>
          <span v-if="current.publishedAt">{{ formatDate(current.publishedAt) }}</span>
          <span v-if="current.readCount !== undefined && current.readCount !== null">
            阅读 {{ current.readCount }}
          </span>
        </div>
        <p v-if="current.summary" class="detail-summary">{{ current.summary }}</p>
        <!-- 后台富文本编辑器产出的 HTML，按 HTML 渲染 -->
        <div class="detail-content" v-html="current.content"></div>
      </div>
      <template #footer>
        <el-button @click="detailVisible = false">关闭</el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup>
import { onMounted, ref } from 'vue'
import { useRouter } from 'vue-router'
import { useAuthStore } from '@/stores/auth'
import { fileBaseUrl } from '@/config'
import { getKnowledgeCategories, getKnowledgeArticlePage, getKnowledgeArticleDetail } from '@/api/frontend'

const router = useRouter()
const auth = useAuthStore()

const categories = ref([])
const articles = ref([])
const loading = ref(false)
const keyword = ref('')
// 后端知识文章列表强制只返回已发布文章，前端不需要传 status
const categoryId = ref('')
const pageNum = ref(1)
const pageSize = ref(9)
const total = ref(0)

const detailVisible = ref(false)
const detailLoading = ref(false)
const current = ref({})

const goLogin = () => router.push('/auth/login')

/** 分类名映射：后端分类接口返回平铺列表 */
const categoryName = (id) => categories.value.find((item) => item.id === id)?.categoryName || ''

const formatDate = (value) => {
  if (!value) return ''
  return String(value).replace('T', ' ').slice(0, 16)
}

const loadCategories = async () => {
  try {
    const data = await getKnowledgeCategories()
    categories.value = data || []
  } catch (e) {
    categories.value = []
  }
}

/** 参数名必须用 pageNum / pageSize（后端 KnowledgeArticlePageQuery 是这两个） */
const loadArticles = async () => {
  loading.value = true
  try {
    const params = { pageNum: pageNum.value, pageSize: pageSize.value }
    if (categoryId.value !== '') params.categoryId = categoryId.value
    if (keyword.value.trim()) params.keyword = keyword.value.trim()
    const res = await getKnowledgeArticlePage(params)
    articles.value = res?.records || []
    total.value = res?.total || 0
  } catch (e) {
    articles.value = []
    total.value = 0
  } finally {
    loading.value = false
  }
}

const handleSearch = () => {
  pageNum.value = 1
  loadArticles()
}

const selectCategory = (id) => {
  categoryId.value = id
  pageNum.value = 1
  loadArticles()
}

const handlePageChange = (page) => {
  pageNum.value = page
  loadArticles()
}

const openDetail = async (item) => {
  current.value = { ...item }
  detailVisible.value = true
  detailLoading.value = true
  try {
    // 列表里已有 title/summary，详情接口主要是为了拿完整 content
    const detail = await getKnowledgeArticleDetail(item.id)
    if (detail) current.value = detail
  } catch (e) {
    // 失败时退回用列表数据展示
  } finally {
    detailLoading.value = false
  }
}

onMounted(async () => {
  if (!auth.isLogin) return
  await loadCategories()
  loadArticles()
})
</script>

<style lang="scss" scoped>
.knowledge-page {
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
  }

  .login-tip {
    text-align: center;
    padding: 48px 20px;

    .tip-title {
      margin: 0 0 8px;
      font-size: 15px;
      font-weight: 600;
      color: var(--text-1);
    }

    .tip-desc {
      margin: 0 0 16px;
      font-size: 13px;
      color: var(--text-3);
    }
  }

  .filter-card {
    .category-bar {
      display: flex;
      flex-wrap: wrap;
      gap: 8px;
      margin-bottom: 16px;

      .category-item {
        padding: 4px 12px;
        font-size: 13px;
        color: var(--text-2);
        background: #f3f4f6;
        border-radius: 14px;
        cursor: pointer;
        transition: all 0.15s;

        &:hover {
          color: var(--brand);
        }

        &.active {
          background: var(--brand);
          color: #fff;
        }
      }
    }

    .search-bar {
      display: flex;
      gap: 10px;
    }
  }

  .article-list {
    min-height: 160px;
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

  .article-item {
    display: flex;
    gap: 14px;
    padding: 16px 0;
    border-bottom: 0.5px solid var(--border);
    cursor: pointer;

    &:last-child {
      border-bottom: none;
    }

    &:hover .article-title {
      color: var(--brand);
    }

    .article-cover {
      width: 120px;
      height: 80px;
      flex-shrink: 0;
      border-radius: 8px;
      overflow: hidden;
      background: #f3f4f6;

      img {
        width: 100%;
        height: 100%;
        object-fit: cover;
        display: block;
      }
    }

    .article-body {
      flex: 1;
      min-width: 0;
    }

    .article-title {
      margin: 0 0 6px;
      font-size: 15px;
      font-weight: 600;
      color: var(--text-1);
      transition: color 0.15s;
    }

    .article-summary {
      margin: 0 0 8px;
      font-size: 13px;
      line-height: 1.6;
      color: var(--text-2);
      display: -webkit-box;
      -webkit-line-clamp: 2;
      -webkit-box-orient: vertical;
      overflow: hidden;
    }

    .article-meta {
      display: flex;
      align-items: center;
      gap: 12px;
      font-size: 12px;
      color: var(--text-3);
    }
  }

  .pagination-bar {
    margin-top: 16px;
    display: flex;
    justify-content: flex-end;
  }

  .detail-body {
    min-height: 120px;

    .detail-meta {
      display: flex;
      align-items: center;
      gap: 12px;
      font-size: 12px;
      color: var(--text-3);
      margin-bottom: 12px;
    }

    .detail-summary {
      margin: 0 0 16px;
      padding: 10px 12px;
      font-size: 13px;
      line-height: 1.7;
      color: var(--text-2);
      background: var(--brand-hover-bg);
      border-radius: 8px;
    }

    .detail-content {
      font-size: 14px;
      line-height: 1.8;
      color: var(--text-1);

      :deep(img) {
        max-width: 100%;
      }
    }
  }
}
</style>
