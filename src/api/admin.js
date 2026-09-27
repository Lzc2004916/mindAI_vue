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
 * ⚠️ 路径是后端 @PostMapping("Changes")（大写 C），与项目其余 kebab-case 风格不一致；
 *    这里按现状对齐，后端若改成 /change-password，这里同步改即可。
 * 请求体：{ password, newPassword, confirmPassword }（对应后端 ChangesPassword_Username）
 * 成功时 data 是字符串 "修改成功"。
 *
 * 说明：和 login / logout 一样属于「用户级」接口（管理端与用户端共用同一套），
 * 所以放在这里而不是 frontend.js —— 由组件 ChangePasswordDialog.vue 统一调用。
 */
export function changePassword(data){
    return service.post('/user/Changes',data)
}

