import service from "@/utils/request";
export function addUser(data){
    return service.post('/user/add',data)
}
export function startSession(data){
    return service.post('/psychological-chat/session/start',data)
}
export function getSessionList(params){
    return service.get('/psychological-chat/sessions',{params})
}
export function deleteSession(sessionId){
    return service.delete(`/psychological-chat/sessions/${sessionId}`)
}
export function getSessionDetail(sessionId){
    return service.get(`/psychological-chat/sessions/${sessionId}/messages`)
}
export function getSeeionEmotion(sessionId){
    return service.get(`/psychological-chat/session/${sessionId}/emotion`)
}

/* ============ 情绪日志（用户端） ============ */
/** 保存/更新当天日记：同一天重复提交是「更新」，不是新增 */
export function saveEmotionDiary(data){
    return service.post('/emotion-diary',data)
}
/**
 * 查看自己的日记。
 * ⚠️ 后端已改成不分页，直接返回 List（没有 records / total 外壳）。
 * @param {string} [month] 形如 2026-09，不传则返回全部
 */
export function getMyEmotionDiaries(month){
    return service.get('/emotion-diary/mine',{ params: month ? { month } : {} })
}

/* ============ 知识库（用户端，均为登录后可见） ============ */
/** 分类：后端返回的是平铺列表（不是树） */
export function getKnowledgeCategories(){
    return service.get('/knowledge/categories')
}
/** 文章分页：参数名是 pageNum / pageSize（不是 currentPage / size） */
export function getKnowledgeArticlePage(params){
    return service.get('/knowledge/article/page',{params})
}
export function getKnowledgeArticleDetail(id){
    return service.get(`/knowledge/article/${id}`)
}
