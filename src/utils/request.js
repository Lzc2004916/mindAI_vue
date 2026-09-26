import axios from 'axios'
import { ElMessage } from 'element-plus'
import { getToken, handleUnauthorized } from '@/utils/auth'

/**
 * 后端用它表达「token 层面不可用」的 code（对应后端 ResultCode.java）。
 * 正常情况下网关会直接以 HTTP 401 返回，走不到成功拦截器；
 * 这里留一手，是为了防「某个接口把 token 失效包在 HTTP 200 里」的漏网情况。
 */
const TOKEN_ERROR_CODES = ['401', 'A0230', 'A0231', 'A0232', 'A0233', 'A0300', 'A0301']

const service = axios.create({
    baseURL: '/api',
    // 10s：原 5s 对弱网/上传偏紧。图片上传另外单独放宽到 30s（见 api/admin.js 的 uploadFile）
    timeout: 10000
})

service.interceptors.request.use(
    config => {
        // token 统一从 utils/auth 取，不再各处直接读 localStorage
        const token = getToken()
        if (token) {
            config.headers['token'] = token
        }
        return config
    },
    error => {
        return Promise.reject(error)
    }
)

service.interceptors.response.use(
    response => {
        const { data } = response
        // 成功：后端约定 code 为 '200'（宽松比较，兼容数字/字符串），只向业务层暴露 data
        if (data.code == 200) {
            return data.data
        }
        // token 类错误（防御性分支，正常由过滤器以 HTTP 401 返回）
        if (TOKEN_ERROR_CODES.includes(String(data.code))) {
            handleUnauthorized(data.msg || data.message)
            return Promise.reject(data)
        }
        // 业务/系统错误（HTTP 200 但 code != 200，如登录失败 6000）：弹出后端提示并 reject
        ElMessage.error(data.msg || data.message || '请求失败')
        return Promise.reject(data)
    },
    error => {
        // 主动取消（AbortController / 路由切换中断）不该弹提示
        if (axios.isCancel(error)) {
            return Promise.reject(error)
        }

        const status = error.response?.status
        const body = error.response?.data

        if (status === 401) {
            // token 无效 / 过期 —— 清登录态并回登录页
            handleUnauthorized(body?.msg)
        } else if (status === 403) {
            // token 有效但无权限（如普通用户打管理端接口）
            ElMessage.error(body?.msg || '没有权限访问')
        } else if (!error.response) {
            // 请求没到达服务端：后端没启动 / 断网 / 代理配置错误
            ElMessage.error('网络异常，请检查网络连接后重试')
        } else if (error.code === 'ECONNABORTED') {
            ElMessage.error('请求超时，请稍后重试')
        } else {
            ElMessage.error(body?.msg || body?.message || `请求失败（${status}）`)
        }
        return Promise.reject(error)
    }
)
export default service
