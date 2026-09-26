import vue from '@vitejs/plugin-vue'
import { defineConfig, loadEnv } from 'vite'
import { resolve } from 'path'

// https://vite.dev/config/
export default defineConfig(({ mode }) => {
  // loadEnv 的第三个参数传 '' 表示把「所有」变量都读进来（不只是 VITE_ 前缀的），
  // 这样 target 既能被 .env 里的 VITE_API_TARGET 覆盖，也能被 shell 里的同名变量覆盖。
  const env = loadEnv(mode, process.cwd(), '')
  const apiTarget = env.VITE_API_TARGET || 'http://localhost:1236'

  return {
    plugins: [vue()],
    resolve: {
      alias: {
        '@': resolve(import.meta.dirname, 'src')
      }
    },
    server: {
      proxy: {
        // 业务接口
        '/api': {
          target: apiTarget,
          changeOrigin: true
        },
        // 上传后的静态文件（后端 WebMvcConfig 映射在 /files/**）。
        // 走代理是为了让「同源」也能显示图片 —— 只要 fileBaseUrl 配成空串即可。
        '/files': {
          target: apiTarget,
          changeOrigin: true
        }
      }
    }
  }
})
