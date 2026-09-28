/**
 * 密码强度与口令策略（纯函数，无副作用）
 *
 * 为什么单独抽成一个模块：
 *  1. 强度计算是纯字符串逻辑，放在组件里既不好测、也容易被复制成两三份；
 *  2. 「长度上下限 + 复杂度」必须和后端校验规则**逐字对齐**，集中定义可以避免前后端各写一套、
 *     日后改了一处忘另一处。
 *
 * ⚠️ 规则的唯一权威在**后端**：`service/UserService.java` 的
 *      `PWD_PATTERN = ^(?=.*[a-zA-Z])(?=.*\d)[a-zA-Z\d]{8,20}$`
 *      （8-20 位、必须同时含字母和数字、不允许特殊字符）。
 *      后端不满足时报 `BusionessException("新密码需 8-50 位，且同时包含字母和数字")`。
 *      这里曾经是 6-50（前端比后端松），会出现「前端放行、后端拒绝」的割裂，已按后端对齐。
 *      后端若调整规则，改这两行 + 端到端验证一次即可。
 */

/** 与后端 UserService.PWD_PATTERN 的 {8,20} 保持一致 */
export const PASSWORD_MIN = 8
export const PASSWORD_MAX = 20

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
 * 打分维度（满分 4）：
 *   长度达标(>=PASSWORD_MIN) +1；长度 >= 10 再 +1；含字母 +1；含数字 +1
 * 映射：score <= 2 → 弱；score == 3 → 中；score >= 4 → 强
 *
 * ⚠️ 特殊字符**不是加分项**：后端正则的字符集是 `[a-zA-Z\d]`，
 * 含特殊字符的密码会被后端直接拒绝，所以这里只把它作为「违规提示」列出来，不给分。
 * （早先的版本会给特殊字符 +1 并显示「强」，与后端规则相反，属于误导。）
 *
 * 实测几档结果：
 *   '123456'     → score 1（只有数字）      → 弱
 *   'abcdef'     → score 1（只有字母）      → 弱
 *   'abc123'     → score 2（长度不足 8）    → 弱   ← 与 meetsPasswordPolicy 一致地拒绝
 *   'abc12345'   → score 3                  → 中
 *   'a1b2c3d4e5' → score 4                  → 强
 *   'Abc123!@#'  → score 3 + tips 提示「不能包含特殊字符」→ 中，且表单校验会拦下
 *
 * @param {string} password 待评估的密码（空值返回「弱、0 分」）
 * @returns {{level:number,label:string,color:string,score:number,tips:string[]}}
 *          tips 是「还差什么」的提示，已达标项不会出现
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

  // 特殊字符是「违规」而不是「加分」：后端只接受字母和数字
  if (HAS_SPECIAL.test(pwd)) {
    tips.push('不能包含特殊字符（只能用字母和数字）')
  }

  const level = score <= 2 ? 0 : score === 3 ? 1 : 2
  return { ...STRENGTH_LEVELS[level], score, tips }
}

/**
 * 是否满足口令策略 —— 必须与后端 UserService.PWD_PATTERN 完全一致：
 *   长度 8-20、同时含字母和数字、**只允许字母和数字**（含特殊字符一律不通过）。
 *
 * 与 evaluatePasswordStrength 的区别：这个返回 true/false，用于表单校验（硬拦截）；
 * 强度条只做视觉提示，不参与拦截。
 *
 * 为什么要在这里也拦特殊字符：后端正则是 `^(?=.*[a-zA-Z])(?=.*\d)[a-zA-Z\d]{8,20}$`，
 * 字符集里没有特殊字符，所以 `Abc123!@` 这种在前端放行、到后端必被拒。
 */
export function meetsPasswordPolicy(password = '') {
  const pwd = String(password)
  return (
    pwd.length >= PASSWORD_MIN &&
    pwd.length <= PASSWORD_MAX &&
    HAS_LETTER.test(pwd) &&
    HAS_DIGIT.test(pwd) &&
    !HAS_SPECIAL.test(pwd)
  )
}
