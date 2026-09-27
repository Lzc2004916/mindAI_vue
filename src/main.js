import { createApp } from 'vue'
import App from './App.vue'
import ElementPlus from 'element-plus'
import 'element-plus/dist/index.css'
import './style.css'
import router from './router/index.js'
import * as ElementPlusIconsVue from '@element-plus/icons-vue'
import { createPinia } from 'pinia'
import { useAuthStore } from '@/stores/auth'
import { TOKEN_KEY, USER_INFO_KEY, LOGIN_PATH, getToken, onAuthCleared } from '@/utils/auth'

const pinia = createPinia()
const app = createApp(App);
for (const [key, component] of Object.entries(ElementPlusIconsVue)) {
  app.component(key, component)
}
// pinia 必须在 router 之前安装：
// router 首次导航时会执行全局守卫，守卫里调用了 useAuthStore()，
// 若 pinia 还没 install，会报 "getActivePinia() was called but there was no active Pinia"。
app.use(pinia)
app.use(router)
app.use(ElementPlus)

// ⚠️ useAuthStore() 必须放在 app.use(pinia) 之后 —— 它内部要取「当前激活的 pinia 实例」，
//    提前调用会抛同一个 getActivePinia 错误（这里原先就是踩在这个坑上）。
const auth = useAuthStore()

// 拦截器 / SSE 清掉本地 token 时，让响应式的 store 同步跟着登出。
// 否则导航栏仍显示「已登录」，而实际每个请求都被后端拒（A0301）。
onAuthCleared(() => auth.syncFromStorage())

app.mount('#app')

// 跨标签页同步登录态：在另一个标签页登录/退出后，本页要跟着变。
// storage 事件只在「别的标签页」改了 localStorage 时触发，所以不会自己触发自己。
window.addEventListener('storage', (e) => {
  // e.key 为 null 表示对方执行了 localStorage.clear()，同样要处理
  const touched = e.key === null || e.key === TOKEN_KEY || e.key === USER_INFO_KEY
  if (!touched) return

  useAuthStore().syncFromStorage()

  // 只是「在别页登录」（token 还在）→ 同步状态即可，不动当前页面；
  // 若是「别页登出 / 改密」（token 已空）→ 本页也必须回登录页。
  // 否则本页会停在原地看着一切正常（昵称还在、按钮还能点），
  // 但之后所有接口都因为没带 token 返回 A0301 —— 这正是最难排查的那种状态。
  if (!getToken() && !window.location.pathname.startsWith(LOGIN_PATH)) {
    window.location.href = LOGIN_PATH
  }
})
