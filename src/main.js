import { createApp } from 'vue'
import App from './App.vue'
import ElementPlus from 'element-plus'
import 'element-plus/dist/index.css'
import './style.css'
import router from './router/index.js'
import * as ElementPlusIconsVue from '@element-plus/icons-vue'
import { createPinia } from 'pinia'
import { useAuthStore } from '@/stores/auth'
import { TOKEN_KEY, USER_INFO_KEY } from '@/utils/auth'
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
app.mount('#app')

// 跨标签页同步登录态：在另一个标签页登录/退出后，本页的导航要跟着变。
// storage 事件只在「别的标签页」改了 localStorage 时触发，所以不会自己触发自己。
window.addEventListener('storage', (e) => {
  if (e.key === TOKEN_KEY || e.key === USER_INFO_KEY) {
    useAuthStore().syncFromStorage()
  }
})
