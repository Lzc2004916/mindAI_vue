<template>
  <RoutePage title="文章详情" :back-to="'/knowledge'">
    <div v-loading="loading" class="article-detail" v-if="article.title">
      <div class="detail-cover" v-if="article.coverImage">
        <img :src="fileBaseUrl + article.coverImage" :alt="article.title" />
      </div>

      <h1 class="detail-title">{{ article.title }}</h1>

      <div class="detail-meta">
        <el-tag v-if="categoryName" size="small" type="info">{{ categoryName }}</el-tag>
        <span v-if="article.publishedAt">{{ formatDate(article.publishedAt) }}</span>
        <span v-if="article.readCount !== undefined && article.readCount !== null">
          阅读 {{ article.readCount }}
        </span>
      </div>

      <div class="detail-tags" v-if="tags.length">
        <el-tag v-for="tag in tags" :key="tag" size="small" effect="plain">{{ tag }}</el-tag>
      </div>

      <p v-if="article.summary" class="detail-summary">{{ article.summary }}</p>

      <div class="detail-content" v-html="article.content"></div>
    </div>
    <el-empty v-else-if="!loading" description="未找到该文章" />
  </RoutePage>
</template>

<script setup>
import { computed, onMounted, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import RoutePage from '@/views/RoutePage.vue'
import { getKnowledgeArticleDetail, getKnowledgeCategories } from '@/api/frontend'
import { useDetailStore } from '@/stores/detail'
import { useAuthStore } from '@/stores/auth'
import { fileBaseUrl } from '@/config'

const route = useRoute()
const router = useRouter()
const detailStore = useDetailStore()
const auth = useAuthStore()

const article = ref({})
const categories = ref([])
const loading = ref(false)

const categoryName = computed(() => {
  const item = categories.value.find((c) => c.id === article.value.categoryId)
  return item ? item.categoryName : ''
})

const tags = computed(() => {
  const raw = article.value.tags
  if (!raw) return []
  return String(raw).split(',').map((s) => s.trim()).filter(Boolean)
})

const formatDate = (value) => {
  if (!value) return ''
  return String(value).replace('T', ' ').slice(0, 16)
}

onMounted(async () => {
  if (!auth.isLogin) {
    router.replace('/auth/login')
    return
  }

  // 父列表页跳转前的即时数据（字段零丢失），详情接口返回后再整体覆盖补全 content 等
  article.value = detailStore.current || {}

  const id = route.params.id
  const tasks = []
  tasks.push(
    getKnowledgeCategories().then((data) => { categories.value = data || [] }).catch(() => { categories.value = [] })
  )
  if (id) {
    loading.value = true
    tasks.push(
      getKnowledgeArticleDetail(id)
        .then((detail) => { if (detail) article.value = detail })
        .catch(() => {})
    )
  }
  await Promise.all(tasks)
  loading.value = false
})
</script>

<style lang="scss" scoped>
.article-detail {
  .detail-cover {
    // 沉浸式 Hero：不锁固定比例，容器高度随图片自适应。
    // · 横图 → 自动铺满宽度；竖图 → 按最大高度等比例收缩并水平居中。
    // 两侧留白用品牌渐变底承接，视觉上是有意为之的层次，而不是突兀灰边。
    position: relative;
    display: flex;
    align-items: center;
    justify-content: center;
    width: 100%;
    min-height: 200px;
    margin-bottom: 28px;
    overflow: hidden;
    border-radius: var(--radius-xl, 22px);
    background: linear-gradient(135deg, var(--brand-50, #ecf7f3) 0%, var(--bg-soft, #eef4f1) 100%);
    box-shadow: var(--shadow-lg, 0 12px 32px rgba(15, 110, 86, 0.12));

    img {
      display: block;
      max-width: 100%;
      max-height: 560px;
      width: auto;
      height: auto;
    }
  }

  .detail-title {
    position: relative;
    margin: 0 0 16px;
    padding-left: 16px;
    font-size: 28px;
    line-height: 1.35;
    font-weight: 700;
    letter-spacing: 0.3px;
    color: var(--text-1, #1f2d29);

    // 品牌色竖向强调条，拉强标题视觉层级
    &::before {
      content: '';
      position: absolute;
      left: 0;
      top: 8px;
      bottom: 8px;
      width: 5px;
      border-radius: 3px;
      background: var(--brand-grad-135, linear-gradient(135deg, #1d9e75, #0f6e56));
    }
  }

  .detail-meta {
    display: flex;
    align-items: center;
    flex-wrap: wrap;
    gap: 16px;
    margin-bottom: 16px;
    font-size: 13px;
    color: var(--text-3, #8a9a94);
  }

  .detail-tags {
    display: flex;
    flex-wrap: wrap;
    gap: 8px;
    margin-bottom: 20px;
  }

  .detail-summary {
    margin: 0 0 20px;
    padding: 14px 18px;
    font-size: 14px;
    line-height: 1.8;
    color: var(--text-2, #4b5d57);
    background: var(--brand-50, #ecf7f3);
    border-left: 4px solid var(--brand, #0f6e56);
    border-radius: 10px;
  }

  .detail-content {
    font-size: 15px;
    line-height: 1.9;
    color: var(--text-1, #1f2d29);

    :deep(img) {
      max-width: 100%;
      height: auto;
      display: block;
      margin: 16px auto;
      border-radius: 12px;
    }

    :deep(a) {
      color: var(--brand, #0f6e56);
    }

    :deep(h1),
    :deep(h2),
    :deep(h3) {
      margin: 22px 0 12px;
      color: var(--text-1, #1f2d29);
    }
  }
}
</style>