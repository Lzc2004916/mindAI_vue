import { defineStore } from 'pinia'
import { ref } from 'vue'

/**
 * 详情页的「父传子」数据载体。
 *
 * 列表页在跳转详情前把整条记录存入 current（对象引用，字段零丢失），
 * 详情路由组件先从 store 读 current 做即时展示；
 * 有独立详情接口的页面再按 id 拉全量补充字段（如消息列表、富文本正文）。
 */
export const useDetailStore = defineStore('detail', () => {
  const current = ref(null)
  const setCurrent = (data) => {
    current.value = data
  }
  const clear = () => {
    current.value = null
  }
  return { current, setCurrent, clear }
})