<script setup lang="ts" generic="T extends string">
import { useTemplateRef } from 'vue'
import { useLiquidGlassNav } from '@/composables/useLiquidGlassNav'

const props = defineProps<{
  modelValue: T
  items: readonly { value: T; label: string }[]
  label: string
  variant?: 'compact' | 'toolbar' | 'wrap'
}>()
defineEmits<{ 'update:modelValue': [value: T] }>()
const tabs = useTemplateRef<HTMLElement>('tabs')

// 创建时间：2026-10-28；调用记录：GPT-20261028-002
// 用途与逻辑：读取父级选中值供玻璃底板测量，选项状态仍由父组件保存。
function selectedValue() {
  return props.modelValue
}
const { activeRect, activeStyle, hoverStyle, enterPointer, movePointer, focusButton, clearHover } =
  useLiquidGlassNav(tabs, selectedValue)
</script>

<template>
  <div
    ref="tabs"
    class="glass-tabs"
    :class="variant"
    role="group"
    :aria-label="label"
    @pointerleave="clearHover"
  >
    <span
      v-if="activeRect"
      class="nav-glass nav-glass-active"
      :style="activeStyle"
      aria-hidden="true"
      ><span class="nav-glass-lens"></span
    ></span>
    <span class="nav-glass nav-glass-hover" :style="hoverStyle" aria-hidden="true"
      ><span class="nav-glass-lens"></span
    ></span>
    <button
      v-for="item in items"
      :key="item.value"
      type="button"
      :data-nav-id="item.value"
      :aria-pressed="modelValue === item.value"
      @click="$emit('update:modelValue', item.value)"
      @pointerenter="enterPointer"
      @pointermove="movePointer"
      @focus="focusButton"
      @blur="clearHover"
    >
      {{ item.label }}
    </button>
  </div>
</template>
