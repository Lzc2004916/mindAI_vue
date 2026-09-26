<template>
    <el-form ref="ruleFormRef" :model="formData">
        <el-row :gutter="24">
            <template v-for="item in formItemAttrs" :key="item.prop">
                <el-col v-bind="item.col">
                    <el-form-item :label="item.label" :prop="item.prop">
                        <component v-model="formData[item.prop]" :is="isComp(item.comp)" :placeholder="item.placeholder" clearable>
                            <template v-if="item.comp === 'select'">
                                <el-option label="全部" value="" />
                                <el-option
                                    v-for="opt in item.options"
                                    :key="opt.value"
                                    :label="opt.label"
                                    :value="opt.value"/>
                            </template>
                        </component>
                    </el-form-item>
                </el-col>
            </template>
        </el-row>
        <el-row>
            <el-button type="primary" @click="handleSearch">查询</el-button>
            <el-button @click="handleReset">重置</el-button>
        </el-row>
    </el-form>
</template>
<script setup>
import { ref, reactive, computed } from 'vue'

const props = defineProps({
    formItem: {
        type: Array,
        default: () => []
    }
})
const emit = defineEmits(['search'])

const ruleFormRef = ref()

// 表格栅格占位：映射成新数组，**不要**直接改 props.formItem
//（原实现在 computed 里给 props 的每个元素挂 col，属于「在计算属性里改 props」，
//  父组件的 formItem 会被悄悄改写，属于副作用。）
const formItemAttrs = computed(() =>
    props.formItem.map(item => ({
        ...item,
        col: item.col || { xs: 24, sm: 12, md: 8, lg: 6, xl: 6 }
    }))
)

// 表单数据：以 formItem 的 prop 为 key 初始化，保证每个字段都是「已声明」的响应式键
const formData = reactive({})
props.formItem.forEach(item => {
    formData[item.prop] = undefined
})

const isComp = (comp) => {
    return {
        input: 'elInput',
        select: 'elSelect'
    }[comp]
}

/** 去掉空值，避免发出 `?categoryId=&status=` 这种无意义的空参数 */
const buildParams = () => {
    const params = {}
    Object.keys(formData).forEach((key) => {
        const value = formData[key]
        if (value !== undefined && value !== null && value !== '') {
            params[key] = value
        }
    })
    return params
}

const handleSearch = () => {
    emit('search', buildParams())
}

/**
 * 重置：必须手动清空 formData。
 * `formEl.resetFields()` 只对 el-form-item 通过 prop 注册的字段生效，
 * 而这里的数据是存在独立的 `reactive({})` 里的动态键，resetFields 清不掉，
 * 随后 emit 出去的还是旧值 —— 表现为「点了重置但筛选条件还在」。
 */
const handleReset = () => {
    Object.keys(formData).forEach((key) => {
        formData[key] = undefined
    })
    ruleFormRef.value?.clearValidate()
    emit('search', buildParams())
}
</script>
