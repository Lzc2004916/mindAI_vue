import Backendlayout from "@/components/Backendlayout.vue";
import { createRouter, createWebHistory } from "vue-router";
import AuthLayout from "@/components/AuthLayout.vue";
import FrontendLayou from "@/components/FrontendLayou.vue";
import { useAuthStore } from "@/stores/auth";
const backendRouter = [
  {
    path: "/back",
    redirect: "/back/dashboard",
    component: Backendlayout,
    children: [
      {
        path: "dashboard",
        component: () => import("@/views/Dashboard.vue"),
        meta: {
          title: "数据分析",
          icon: "PieChart",
        },
      },
      {
        path: "knowledge",
        component: () => import("@/views/Knowledge.vue"),
        meta: {
          title: "知识文章",
          icon: "ChatLineRound",
        },
      },
      {
        path: "consultations",
        component: () => import("@/views/Consultations.vue"),
        meta: {
          title: "咨询记录",
          icon: "Message",
        },
      },
      {
        path: "emotional",
        component: () => import("@/views/Emotional.vue"),
        meta: {
          title: "情感日志",
          icon: "User",
        },
      },
      {
        path: "consultations/:sessionId",
        component: () => import("@/views/ConsultationDetail.vue"),
        meta: { title: "咨询会话详情", transition: true },
      },
      {
        path: "emotional/:id",
        component: () => import("@/views/EmotionalDetail.vue"),
        meta: { title: "情绪日志详情", transition: true },
      },
      {
        path: "knowledge/create",
        component: () => import("@/views/ArticleEdit.vue"),
        meta: { title: "新增文章", transition: true },
      },
      {
        path: "knowledge/edit/:id",
        component: () => import("@/views/ArticleEdit.vue"),
        meta: { title: "编辑文章", transition: true },
      },
      {
        path: "change-password",
        component: () => import("@/views/ChangePassword.vue"),
        meta: { title: "修改密码", transition: true },
      },
    ],
  },
  {
    path: "/auth",
    redirect: "/auth/login",
    component: AuthLayout,
    children: [
      {
        path: "login",
        component: () => import("@/views/login.vue"),
        meta: {
          title: "登录",
        },
      },
      {
        path: "register",
        component: () => import("@/views/register.vue"),
        meta: {
          title: "注册",
        },
      },
    ],
  },
];
const frontendRouter = [
  {
    path: "",
    component: FrontendLayou,
    children: [
      {
        path: "",
        component: () => import("@/views/Home.vue"),
        meta: {
          title: "首页",
        },
      },
      {
        path: "consultation",
        component: () => import("@/views/Consultation.vue"),
        meta: {
          title: "AI咨询",
        },
      },
      {
        path: "emotion-diary",
        component: () => import("@/views/EmotionDiary.vue"),
        meta: {
          title: "情感日志",
        },
      },
      {
        path: "knowledge",
        component: () => import("@/views/frontendKnowledge.vue"),
        meta: {
          title: "知识库",
        },
      },
      {
        path: "knowledge/detail/:id",
        component: () => import("@/views/frontendArticleDetail.vue"),
        meta: { title: "文章详情", transition: true },
      },
      {
        path: "change-password",
        component: () => import("@/views/ChangePassword.vue"),
        meta: { title: "修改密码", transition: true },
      }
    ],
  },
];
const router = createRouter({
  history: createWebHistory(),
  routes: [...backendRouter, ...frontendRouter],
});
router.beforeEach((to, from, next) => {
  // 读统一的登录态 store（内部已含「localStorage 损坏时返回 null」的容错），
  // 不再直接 JSON.parse(localStorage.userInfo) —— 原实现遇到脏数据会直接抛异常、路由崩掉。
  const auth = useAuthStore();

  // 这些页面背后的后端接口都要求带 token（@GetToken），未登录直接去登录页，
  // 免得进了页面再收到一串「未登录」的错误提示。
  const needLogin =
    to.path.startsWith("/back") ||
    to.path.startsWith("/consultation") ||
    to.path.startsWith("/emotion-diary");

  if (auth.isLogin) {
    if (auth.isAdmin) {
      // 管理员只能待在管理端
      to.path.startsWith("/back") ? next() : next("/back/dashboard");
    } else {
      // 普通用户不能进管理端和登录注册页
      to.path.startsWith("/back") || to.path.startsWith("/auth") ? next("/") : next();
    }
    return;
  }

  // 未登录：只有首页、知识库等公开页放行
  needLogin ? next("/auth/login") : next();
});
export default router;
