/**
 * 密码强度与口令策略（纯函数，无副作用）
 *
 * 为什么单独抽成一个模块：
 *  1. 强度计算是纯字符串逻辑，放在组件里既不好测、也容易被复制成两三份；
 *  2. 「长度上下限」必须和后端 DTO 对齐，集中定义可以避免前后端各写一个数字、
 *     日后改了一处忘另一处（后端见 common/Dto/ChangesPassword_Username.java）。
 *
 * 边界说明：后端只校验「非空 + 长度 6-50」，并不校验复杂度。
 * 也就是说前端这份策略是**比后端更严**的（见 meetsPasswordPolicy），
 * 目的是拦住 123456 / abcdef 这类弱口令；若哪天想放宽，只需要删掉
 * meetsPasswordPolicy 里的那两条正则判断，其余不用动。
 */

/** 与后端 @Size(min = 6, max = 50) 保持一致 */
export const PASSWORD_MIN = 6
export const PASSWORD_MAX = 50

/** 给用户看的口令规则文案（表单提示、报错信息共用一份，避免文案不一致） */
export const PASSWORD_POLICY_TEXT = `${PASSWORD_MIN}-${PASSWORD_MAX} 个字符，且同时包含字母和数字`

/**
 * 强度分档。level 从 0 开始，正好可以当作「点亮几格进度条」的索引
 * （level 0 → 1 格，level 1 → 2 格，level 2 → 3 格）。
 * color 用 Element Plus 的语义色 + 品牌绿，和全站配色一致。
 */
export const STRENGTH_LEVELS = [
  { level: 0, label: '弱', color: '#f56c6c' },
  { level: 1, label: '中', color: '#e6a23c' },
  { level: 2, label: '强', color: '#0f6e56' }
]

/** 是否含字母 */
const HAS_LETTER = /[a-zA-Z]/
/** 是否含数字 */
const HAS_DIGIT = /\d/
/** 是否含字母数字以外的字符（视为特殊字符） */
const HAS_SPECIAL = /[^a-zA-Z0-9]/

/**
 * 计算密码强度。
 *
 * 打分维度（满分 5）：
 *   长度达标(>=PASSWORD_MIN) +1；长度 >= 10 再 +1；含字母 +1；含数字 +1；含特殊字符 +1
 * 映射：score <= 2 → 弱；score == 3 → 中；score >= 4 → 强
 *
 * 分档边界是刻意这么定的：
 *  - 「弱」必须兜住 123456 / abcdef 这类典型弱口令（它们都是 2 分），
 *    所以弱的上界只能是 2；
 *  - 反过来，9 位的 Abc123!@# 已经是 4 分（字母+数字+特殊字符齐全），
 *    如果卡的 5 分才算「强」，它会被判成「中」，与直觉不符 ——
 *    所以强的下界取 4 分。
 *
 * 实测几档结果：
 *   '123456'      → score 2 → 弱
 *   'abcdef'      → score 2 → 弱
 *   'abc123'      → score 3 → 中
 *   'Abc123!@#'   → score 4 → 强
 *   'a1b2c3d4e5'  → score 4 → 强
 *   'a1b2c3d4e5!' → score 5 → 强
 *
 * @param {string} password 待评估的密码（空值返回「弱、0 分」）
 * @returns {{level:number,label:string,color:string,score:number,tips:string[]}}
 *          tips 是「还差什么才能更强」的提示，已达标项不会出现
 */
export function evaluatePasswordStrength(password = '') {
  const pwd = String(password)
  if (!pwd) {
    return { ...STRENGTH_LEVELS[0], score: 0, tips: [] }
  }

  let score = 0
  const tips = []

  if (pwd.length >= PASSWORD_MIN) score += 1
  else tips.push(`长度至少 ${PASSWORD_MIN} 位`)
  if (pwd.length >= 10) score += 1

  if (HAS_LETTER.test(pwd)) score += 1
  else tips.push('字母')

  if (HAS_DIGIT.test(pwd)) score += 1
  else tips.push('数字')

  if (HAS_SPECIAL.test(pwd)) score += 1
  else tips.push('特殊字符')

  const level = score <= 2 ? 0 : score === 3 ? 1 : 2
  return { ...STRENGTH_LEVELS[level], score, tips }
}

/**
 * 是否满足前端口令策略：长度达标 + 同时包含字母和数字。
 * 与 evaluatePasswordStrength 的区别：这个返回 true/false，用于表单校验（硬拦截）；
 * 强度条只做视觉提示，不参与拦截。
 */
export function meetsPasswordPolicy(password = '') {
  const pwd = String(password)
  return (
    pwd.length >= PASSWORD_MIN &&
    pwd.length <= PASSWORD_MAX &&
    HAS_LETTER.test(pwd) &&
    HAS_DIGIT.test(pwd)
  )
}
