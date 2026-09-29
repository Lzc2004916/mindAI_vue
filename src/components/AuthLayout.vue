<template>
    <div class="auth-layout">
        <div class="left-section">
            <div class="content">
                <h2 class="title">聪聆</h2>
                <p class="text">每个深夜，每个焦虑时刻，我们都在这里，不必独自承受，让心与心连接温暖你的每一天</p>
                <div class="robot">
                    <el-image :src="robotImg" style="width: 90px; height: 90px;" alt="聪聆"></el-image>
                </div>
            </div>
        </div>
  <div class="right-section">
    <router-view></router-view>
  </div>
</div>
</template>

<script setup>
const robotImg = new URL('@/assets/images/robot-fill.png', import.meta.url).href
</script>

<style lang="scss" scoped>
.auth-layout {
    display: flex;
    .left-section {
        display: flex;
        justify-content: center;
        align-items: center;
        flex: 1;
        position: relative;
        overflow: hidden;
        background:
            radial-gradient(circle at 30% 20%, rgba(255, 255, 255, 0.18) 0%, transparent 45%),
            radial-gradient(circle at 80% 85%, rgba(167, 217, 200, 0.25) 0%, transparent 50%),
            var(--brand-grad-135);
        height: 100vh;
        .content {
            display: flex;
            flex-direction: column;
            justify-content: center;
            align-items: center;
            padding: 0 40px;
            animation: fade-up 0.6s var(--ease-out) both;
            .title {
                margin-bottom: 20px;
                font-size: 40px;
                font-weight: 700;
                color: #fff;
                letter-spacing: 2px;
            }
            .text {
                margin-bottom: 32px;
                width: 440px;
                font-size: 17px;
                line-height: 1.8;
                color: rgba(255, 255, 255, 0.92);
                text-align: center;
            }
            .robot {
                display: flex;
                justify-content: center;
                align-items: center;
                width: 160px;
                height: 160px;
                border-radius: 50%;
                border: 1.5px solid rgba(255, 255, 255, 0.3);
                background: linear-gradient(135deg, rgba(255, 255, 255, 0.2) 0%, rgba(255, 255, 255, 0.05) 100%);
                box-shadow: 0 20px 40px rgba(0, 0, 0, 0.15), inset 0 1px 0 rgba(255, 255, 255, 0.3);
                backdrop-filter: blur(8px);
                animation: breathe 4s ease-in-out infinite;
            }
        }
    }
    .right-section {
        display: flex;
        justify-content: center;
        align-items: center;
        flex: 1;
        height: 100vh;
        background-color: #fff;
    }
}

@keyframes breathe {
    0%, 100% { transform: scale(1); }
    50% { transform: scale(1.04); }
}
</style>
