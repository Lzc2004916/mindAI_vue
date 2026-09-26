import { ElMessage, ElMessageBox } from 'element-plus'
import { useRouter } from 'vue-router'
import { useAuthStore } from '@/stores/auth'

/**
 * 退出登录的统一入口。
 *
 * 原先 `Navbar.vue` 和 `FrontendLayou.vue` 各写了一份「确认框 → 清 localStorage → 跳转」，
 * 两边的提示文案、清空时机、跳转目标都不一致（一处 `router.push('/auth')`、一处 `/auth/login`），
 * 这里收敛成一处，行为统一：
 *   确认 → 通知后端（best-effort） → 清登录态 → 跳登录页
 *
 * @param {object} [options]
 * @param {string} [options.redirect='/auth/login'] 退出后跳转目标
 * @param {string} [options.confirmText='确定退出登录吗？']
 * @param {string} [options.confirmTitle='提示']
 */
export function useLogout(options = {}) {
  const {
    redirect = '/auth/login',
    confirmText = '确定退出登录吗？',
    confirmTitle = '提示'
  } = options

  const router = useRouter()
  const auth = useAuthStore()

  /** 直接退出（不再二次确认，供「登录态已失效」等场景复用） */
  async function doLogout() {
    await auth.logout()
    ElMessage.success('退出登录成功')
    router.replace(redirect)
  }

  /** 带确认框的退出；用户点「取消」返回 false，便于调用方判断 */
  async function confirmLogout() {
    try {
      await ElMessageBox.confirm(confirmText, confirmTitle, {
        confirmButtonText: '确定',
        cancelButtonText: '取消',
        type: 'warning'
      })
    } catch {
      return false // 用户取消
    }
    await doLogout()
    return true
  }

  return { doLogout, confirmLogout }
}
