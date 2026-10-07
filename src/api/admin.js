import service from "@/utils/request";
import { UPLOAD_TIMEOUT } from "@/config";

export function login(data){
    return service.post('/user/login',data)
}
export function categoryTree(){
    return service.get('/knowledge/category/tree')
}
export function articlePage(params){
    return service.get('/knowledge/article/page',{params})
}
export function uploadFile(file,businessInfo){
    const formData = new FormData()
    formData.append('file',file)
    formData.append('businessType','ARTICLE')
    formData.append('businessId',businessInfo.businessId)
    formData.append('businessField','cover')
    return service.post('/file/upload',formData,{
        headers:{
            'Content-Type':'multipart/form-data'
        },
        // 图片上传在弱网下容易超过全局 10s，这里单独放宽到 30s
        timeout: UPLOAD_TIMEOUT
    })
}
export function createArticle(data){
    return service.post('/knowledge/article',data)
}
export function getArticleDetail(id){
    return service.get('/knowledge/article/'+id)
}
export function updateArticle(id,data){
    return service.put(`/knowledge/article/${id}`,data)
}
export function changeArtocleStatus(id,data){
    return service.put(`/knowledge/article/${id}/status`,data)
}
export function deleteArticle(id){
    return service.delete(`/knowledge/article/${id}`)
}
export function getConsultationPage(params){
    return service.get('/psychological-chat/sessions',{params})
}
export function getSeeionDetail(sessionId){
    return service.get(`/psychological-chat/sessions/${sessionId}/messages`)
}
export function getEmotionalLogPage(params){
    return service.get('/emotion-diary/admin/page',{params})
}
export function deleteEmotionalLog(id){
    return service.delete(`/emotion-diary/admin/${id}`)
}
export function getAnalyticsOverview(){
    return service.get('/data-analytics/overview')
}
export function logout(){
    return service.post('/user/logout')
}
/**
 * 修改密码（当前登录用户）。
 *
 * 路径：POST /api/user/password（后端 UserController @PostMapping("/password")）
 * 请求体：{ password, newPassword, confirmPassword }（对应后端 Dto/ChangePasswordRequest）
 * 成功时 data 是**新签发的 token 字符串**（后端 UserService.changePassword 会顺手把
 * tokenVersion +1 并返回新 token）—— 旧 token 从这一刻起立即失效。
 *
 * 说明：和 login / logout 一样属于「用户级」接口（管理端与用户端共用同一套），
 * 所以放在这里而不是 frontend.js —— 由页面 ChangePassword.vue 统一调用。
 */
export function changePassword(data){
    return service.post('/user/password',data)
}

/* ============ 用户管理（管理端，AdminUserController） ============ */
/**
 * 用户分页列表。
 * 路径：GET /api/admin/users；参数：pageNum / pageSize / keyword（用户名或邮箱模糊）/ status（0禁用 1正常）
 * 返回 data 是 Page 对象（records / total），每行 password 后端已置空。
 */
export function getUserPage(params){
    return service.get('/admin/users',{params})
}
/**
 * 启用/禁用用户。
 * 路径：PUT /api/admin/users/{userId}/status；body：{ status: 0|1 }（0禁用 1正常）
 * 后端会拒绝「禁用自己」，前端也应在操作列对当前登录用户隐藏该按钮。
 */
export function changeUserStatus(userId,status){
    return service.put(`/admin/users/${userId}/status`,{status})
}
/** 用户详情：GET /api/admin/users/{userId}，返回完整 User（password 已置空） */
export function getUserDetail(userId){
    return service.get(`/admin/users/${userId}`)
}

/* ============ 个人资料（用户级接口，与 changePassword 一样放在这里） ============ */
/**
 * 修改当前登录用户资料。
 * 路径：PUT /api/user/profile（后端 UserController.updateProfile）
 * body 四个字段全部可选、局部更新（不传/为 null 的字段后端不动）：
 * { nickname?(≤50字), avatar?, gender?(1男 2女), birthday?('yyyy-MM-dd'，不能是未来日期) }
 * 成功时 data 是最新的 UserDetailResponseDTO —— 直接用它刷新本地登录态（auth.updateUserInfo），
 * 不需要再调一次查询接口。
 * 注意：后端带 @RateLimit(qps=5)，调用方必须防重复点击（loading 禁用提交按钮）。
 */
export function updateProfile(data){
    return service.put('/user/profile',data)
}
/**
 * 上传头像（个人资料页用）。
 * 复用 /api/file/upload，businessType=AVATAR、businessField=avatar；
 * 返回 FileUploadVO，取 filePath（形如 /files/2026-10/xxx.png）：
 * 显示时拼 fileBaseUrl，提交时把 filePath 原样塞进 updateProfile 的 avatar 字段。
 * 后端限制：≤10MB，扩展名白名单（jpg/jpeg/png/gif/webp/bmp 等）。
 */
export function uploadAvatar(file){
    const formData = new FormData()
    formData.append('file',file)
    formData.append('businessType','AVATAR')
    formData.append('businessField','avatar')
    return service.post('/file/upload',formData,{
        headers:{
            'Content-Type':'multipart/form-data'
        },
        timeout: UPLOAD_TIMEOUT
    })
}

