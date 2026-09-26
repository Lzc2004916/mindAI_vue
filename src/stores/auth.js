import { computed, ref } from 'vue'
import { defineStore } from 'pinia'
import { logout as logoutApi } from '@/api/admin'
import {
  clearAuth,
  getToken,
  getUserInfo,
  setAuth,
  setUserInfo as persistUserInfo
} from '@/utils/auth'

/**
 * 登录态 store —— 全应用唯一的「当前用户」来源。
 *
 * 持久化交给 utils/auth.js（localStorage），本 store 只负责：
 *  - 把持久化的值变成响应式状态（登录/退出后导航、按钮立刻跟着变，不用 F5）
 *  - 提供 isLogin / isAdmin / displayName 这类派生信息，避免各组件重复判断
 *
 * 初始化时就从 localStorage 读，所以刷新页面不会丢登录态。
 */
export const useAuthStore = defineStore('auth', () => {
  const token = ref(getToken())
  const userInfo = ref(getUserInfo())

  /** 是否已登录 */
  const isLogin = computed(() => Boolean(token.value))

  /** 1: 普通用户  2: 管理员  0: 未知 */
  const userType = computed(() => Number(userInfo.value?.userType ?? 0))

  /** 管理员（管理端 /back 的准入依据，与后端 roleType=2 一致） */
  const isAdmin = computed(() => userType.value === 2)

  /** 显示名：后端已算好 displayName（昵称优先、回落用户名），再逐级兜底 */
  const displayName = computed(
    () =>
      userInfo.value?.displayName ||
      userInfo.value?.nickname ||
      userInfo.value?.username ||
      '用户'
  )

  /** 头像地址（可能为空，空时由调用方用 avatarText 兜底） */
  const avatar = computed(() => userInfo.value?.avatar || '')

  /** 无头像时的首字母占位 */
  const avatarText = computed(() => String(displayName.value).trim().charAt(0) || '用')

  /** 登录后的默认落地页（按角色分流） */
  const homePath = computed(() => (isAdmin.value ? '/back/dashboard' : '/'))

  /** 登录成功：写入状态 + 持久化 */
  function login(newToken, newUserInfo) {
    token.value = newToken || ''
    userInfo.value = newUserInfo || null
    setAuth(token.value, userInfo.value)
  }

  /** 只更新用户信息（改昵称/头像后刷新用） */
  function updateUserInfo(newUserInfo) {
    userInfo.value = newUserInfo || null
    persistUserInfo(userInfo.value)
  }

  /** 仅清本地状态（不调接口、不跳转） */
  function clear() {
    token.value = ''
    userInfo.value = null
    clearAuth()
  }

  /**
   * 退出登录：通知后端 → 清本地状态。
   *
   * 后端是「无状态登出」——`POST /user/logout` 只是走个过场，并不会让已签发的 token 失效，
   * 真正的退出动作发生在浏览器（清掉本地 token）。所以接口失败也**不能**阻塞退出流程。
   * 跳转由调用方决定（见 composables/useLogout.js），store 保持无路由依赖。
   */
  async function logout() {
    try {
      await logoutApi()
    } catch (e) {
      // 网络异常 / token 已失效都无所谓，本地照样要清干净
      console.warn('[auth] 通知后端登出失败，已忽略：', e?.msg || e?.message || e)
    }
    clear()
  }

  /**
   * 从 localStorage 重新同步一次。
   * 用于「别的标签页退出登录」这类跨页场景，或拦截器清了 token 后的补救。
   */
  function syncFromStorage() {
    token.value = getToken()
    userInfo.value = getUserInfo()
  }

  return {
    token,
    userInfo,
    isLogin,
    userType,
    isAdmin,
    displayName,
    avatar,
    avatarText,
    homePath,
    login,
    updateUserInfo,
    clear,
    logout,
    syncFromStorage
  }
})
