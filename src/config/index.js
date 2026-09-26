/**
 * 全局接口地址配置（单一来源）
 *
 * 取值优先级：项目根目录的 .env 文件（VITE_* 变量） > 下面这些默认值。
 * 默认值面向「本地后端」—— 后端 application.yml 是 server.port: 1236。
 *
 * 想切回远端/线上后端，在项目根建一个 .env.local（已被 .gitignore 忽略）写：
 *   VITE_API_TARGET=http://159.75.169.224:1235
 *   VITE_FILE_BASE=http://159.75.169.224:1235
 * 改完重启 dev server 生效（vite.config.js 的 proxy 只在启动时读一次）。
 *
 * 说明：`VITE_API_TARGET` 只被 vite.config.js 的 dev proxy 使用（浏览器不感知它）；
 *       `VITE_FILE_BASE` 会打进前端产物，用于拼上传文件的完整访问地址。
 */
const DEFAULT_BACKEND = 'http://localhost:1236'

/** 后端服务地址（dev server 代理目标） */
export const apiTarget = import.meta.env.VITE_API_TARGET || DEFAULT_BACKEND

/**
 * 上传文件访问前缀。
 * 后端 FileService 存库的路径形如 `/files/2026-09/xxx.png`，所以完整地址 = fileBaseUrl + filePath。
 * 用 `??` 而非 `||`：允许显式配成空串，走同源（配合 vite 的 `/files` 代理），
 * 这样部署时前后端同域就完全不需要写主机名。
 */
export const fileBaseUrl =
  import.meta.env.VITE_FILE_BASE !== undefined ? import.meta.env.VITE_FILE_BASE : DEFAULT_BACKEND

/** 上传接口单独放宽的超时（弱网传图用，见 api/admin.js） */
export const UPLOAD_TIMEOUT = 30000
