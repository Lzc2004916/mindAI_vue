<template>
  <div class="home-container">
    <!-- 顶部光晕装饰 -->
    <div class="bg-glow"></div>

    <div class="content">
      <!-- 机器人头像（顶部，带光晕与浮动动画） -->
      <div class="robot">
        <div class="robot-ring"></div>
        <el-image :src="robotImg" class="robot-img" alt="心理Ai助手"></el-image>
      </div>

      <!-- 标题 -->
      <h2 class="title">
        一次温暖的对话<br />
        <span class="highlight-text">化孤独为慰藉</span>
      </h2>

      <!-- 描述 -->
      <p class="description">
        每个深夜，每个焦虑时刻，我们都在这里，不必独自承受，让心与心连接温暖你的每一天
      </p>

      <!-- 操作按钮 -->
      <div class="hero-actions">
        <el-button size="large" @click="router.push('/consultation')">开始倾诉,获得陪伴</el-button>
        <el-button size="large" @click="router.push('/emotion-diary')">记录心情,释放情绪</el-button>
      </div>
    </div>
  </div>
</template>

<script setup>
import { useRouter } from 'vue-router'
const router = useRouter()
const robotImg = new URL('@/assets/images/robot-fill.png',import.meta.url).href
</script>

<style lang="scss" scoped>
.home-container {
  position: relative;
  background: var(--brand-grad-135);
  color: #fff;
  height: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
  overflow: hidden;

  // 顶部柔光装饰
  .bg-glow {
    position: absolute;
    top: -120px;
    left: 50%;
    transform: translateX(-50%);
    width: 600px;
    height: 600px;
    background: radial-gradient(circle, rgba(255, 255, 255, 0.18) 0%, rgba(255, 255, 255, 0) 60%);
    pointer-events: none;
  }

  .content {
    position: relative;
    z-index: 1;
    display: flex;
    flex-direction: column;
    align-items: center;
    text-align: center;
    padding: 0 20px;

    // 机器人头像
    .robot {
      position: relative;
      width: 220px;
      height: 220px;
      display: flex;
      align-items: center;
      justify-content: center;
      margin-bottom: 36px;

      // 外圈光晕环
      .robot-ring {
        position: absolute;
        inset: 0;
        border-radius: 50%;
        border: 2px solid rgba(255, 255, 255, 0.25);
        background: linear-gradient(135deg, rgba(255, 255, 255, 0.15) 0%, rgba(255, 255, 255, 0.05) 100%);
        box-shadow: 0 15px 35px rgba(0, 0, 0, 0.12), inset 0 1px 0 rgba(255, 255, 255, 0.3);
        animation: float 4s ease-in-out infinite;
      }

      .robot-img {
        position: relative;
        width: 140px;
        height: 140px;
        z-index: 1;
        animation: float 4s ease-in-out infinite;
      }
    }

    // 标题
    .title {
      font-size: 42px;
      font-weight: bold;
      line-height: 1.3;
      margin: 0 0 20px 0;

      .highlight-text {
        color: #ffd700;
      }
    }

    // 描述
    .description {
      max-width: 560px;
      font-size: 16px;
      line-height: 1.8;
      color: rgba(255, 255, 255, 0.88);
      margin: 0 0 36px 0;
    }

    // 按钮
    .hero-actions {
      display: flex;
      gap: 20px;

      :deep(.el-button) {
        --el-button-bg-color: rgba(255, 255, 255, 0.15);
        --el-button-border-color: rgba(255, 255, 255, 0.4);
        --el-button-text-color: #fff;
        --el-button-hover-bg-color: rgba(255, 255, 255, 0.25);
        --el-button-hover-border-color: rgba(255, 255, 255, 0.6);
        --el-button-hover-text-color: #fff;
        padding: 12px 28px;
      }
    }
  }
}

// 浮动动画
@keyframes float {
  0%, 100% {
    transform: translateY(0);
  }
  50% {
    transform: translateY(-10px);
  }
}
</style>
