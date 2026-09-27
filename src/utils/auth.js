/**
 * 登录态基础设施 —— token / userInfo 的唯一读写入口
 *
 * 为什么单独抽一个模块（而不是直接用 Pinia store）：
 *  1. `utils/request.js` 在「请求发出前」就要拿 token，而 store 属于应用层、且
 *     `stores/auth.js → api/admin.js → utils/request.js` 已经构成一条依赖链，
 *     若 request.js 反过来 import store 就会出现循环依赖。
 *  2. 路由守卫、SSE 请求、拦截器这些「非组件环境」不该依赖 Pinia 是否已安装。
 * 所以这里只做纯粹的「存取 + 401 统一处理」，不持有响应式状态；
 * 响应式的那一层由 `stores/auth.js` 包在它外面。
 */
import { ElMessage } from 'element-plus'

export const TOKEN_KEY = 'token'
export const USER_INFO_KEY = 'userInfo'

/** 登录页路径（统一跳转目标） */
export const LOGIN_PATH = '/auth/login'

/** 读取 token；隐私模式下 localStorage 可能不可用，故用 try 兜底 */
export function getToken() {
  try {
    return localStorage.getItem(TOKEN_KEY) || ''
  } catch {
    return ''
  }
}

/**
 * 读取 userInfo。
 * 这里必须容错：本地值可能被手工改坏 / 是旧版本残留的非法 JSON，
 * 直接 JSON.parse 抛异常会把路由守卫带崩（原实现就是这个问题）。
 */
export function getUserInfo() {
  try {
    const raw = localStorage.getItem(USER_INFO_KEY)
    if (!raw) return null
    const parsed = JSON.parse(raw)
    return parsed && typeof parsed === 'object' ? parsed : null
  } catch {
    return null
  }
}

/** 写入登录态（登录成功时调用） */
export function setAuth(token, userInfo) {
  try {
    if (token) localStorage.setItem(TOKEN_KEY, token)
    if (userInfo) localStorage.setItem(USER_INFO_KEY, JSON.stringify(userInfo))
  } catch (e) {
    console.warn('[auth] 写入本地登录态失败：', e)
  }
}

/** 只更新用户信息（未来改昵称/换头像后刷新用） */
export function setUserInfo(userInfo) {
  try {
    if (userInfo) localStorage.setItem(USER_INFO_KEY, JSON.stringify(userInfo))
  } catch (e) {
    console.warn('[auth] 写入用户信息失败：', e)
  }
}

/** 清空登录态 */
export function clearAuth() {
  try {
    localStorage.removeItem(TOKEN_KEY)
    localStorage.removeItem(USER_INFO_KEY)
  } catch {
    /* 忽略 */
  }
}

/** 是否已登录（只代表「本地有 token」，不代表 token 仍然有效） */
export function isLoggedIn() {
  return Boolean(getToken())
}

/** 并发请求同时 401 时，避免弹出多条提示、跳转多次 */
let redirecting = false

/**
 * 「登录态被清空」的观察者机制。
 *
 * 为什么需要：本模块只读写 localStorage，是纯粹的函数式实现、不持有响应式状态；
 * 但应用里另有一层 Pinia store（stores/auth）缓存着 token / userInfo，供导航栏等组件响应式使用。
 * 过去 handleUnauthorized() 只清 localStorage、不动 store，于是出现
 * 「localStorage 已空、store 却仍认为已登录」的分裂状态：路由守卫读的是 store，
 * 于是继续放行，用户看到页面一切正常（昵称还在、还能点），
 * 但之后每个请求都因为没带 token 被后端拒绝（后端返回 A0301 访问未授权）。
 *
 * 这里做一个极简的观察者：清登录态后广播一次，由 main.js 注册回调把 store 同步过去。
 */
const clearHandlers = []

/**
 * 注册「登录态被清空」回调。
 * @param {Function} fn 无参回调
 * @returns {Function} 取消注册的函数
 */
export function onAuthCleared(fn) {
  if (typeof fn !== 'function') return () => {}
  clearHandlers.push(fn)
  return () => {
    const i = clearHandlers.indexOf(fn)
    if (i > -1) clearHandlers.splice(i, 1)
  }
}

function notifyAuthCleared() {
  // 先复制再遍历：回调内部若又触发注册/注销，不会打乱本次遍历
  clearHandlers.slice().forEach((fn) => {
    try {
      fn()
    } catch (e) {
      // 单个回调出错不能影响「清登录态 + 跳登录页」这条主流程
      console.warn('[auth] onAuthCleared 回调执行失败：', e)
    }
  })
}
/**
 * 401 的统一处理动作：清登录态 → 提示 → 回登录页。
 *
 * 用 `window.location.href` 而不是 router：这个函数会被 axios 拦截器 / SSE 调用，
 * 那些地方拿不到组件实例，硬跳转还顺带把内存里的脏状态一起清掉了。
 * 加 150ms 延迟是为了让 ElMessage 有时间渲染出来（否则提示还没画就跳走了）。
 */
export function handleUnauthorized(message = '登录已过期，请重新登录') {
  clearAuth()
  notifyAuthCleared()
  // 已经在登录页（例如登录接口本身返回 401）就不用再跳，避免死循环刷新
  if (redirecting || window.location.pathname.startsWith(LOGIN_PATH)) return
  redirecting = true
  ElMessage.error(message)
  setTimeout(() => {
    window.location.href = LOGIN_PATH
  }, 150)
}
