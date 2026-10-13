<script setup lang="ts">
withDefaults(defineProps<{ name: string; size?: number }>(), { size: 20 })
const paths: Record<string, string> = {
  grid: 'M3 3h7v7H3z M14 3h7v7h-7z M3 14h7v7H3z M14 14h7v7h-7z',
  squad:
    'M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2 M13 7a4 4 0 1 1-8 0 4 4 0 0 1 8 0Z M18 3a4 4 0 0 1 0 8 M22 21v-2a4 4 0 0 0-3-3.87',
  ball: 'M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z M9 9l6 0 2 5-5 4-5-4 2-5Z M9 9 7 5 M15 9l2-4 M17 14l4 1 M12 18v3 M7 14l-4 1',
  target: 'M21 12a9 9 0 1 1-9-9 M17 12a5 5 0 1 1-5-5 M12 12l9-9 M16 3h5v5',
  history: 'M3 11a9 9 0 1 1 2.6 7.4 M3 4v7h7 M12 7v5l3 2',
  chart: 'M4 3v18h17 M8 16v-5 M13 16V7 M18 16v-9',
  arrow: 'M5 12h14 M14 7l5 5-5 5',
  chevron: 'm9 5 7 7-7 7',
  down: 'm6 9 6 6 6-6',
  search: 'M20 20l-5-5 M17 10a7 7 0 1 1-14 0 7 7 0 0 1 14 0Z',
  bell: 'M18 8a6 6 0 0 0-12 0c0 7-3 7-3 9h18c0-2-3-2-3-9 M10 21h4',
  calendar:
    'M8 2v4 M16 2v4 M3 10h18 M5 4h14a2 2 0 0 1 2 2v14H3V6a2 2 0 0 1 2-2Z M7 14h2 M15 14h2 M7 17h2',
  pin: 'M19 10c0 5-7 11-7 11S5 15 5 10a7 7 0 1 1 14 0Z M15 10a3 3 0 1 1-6 0 3 3 0 0 1 6 0Z',
  clock: 'M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z M12 7v5l3 2',
  check: 'm5 12 4 4L19 6',
  close: 'm6 6 12 12 M6 18 18 6',
  download: 'M12 3v12 M7 10l5 5 5-5 M4 16v5h16v-5',
  info: 'M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z M12 11v6 M12 7v.2',
  settings:
    'M12 8a4 4 0 1 1 0 8 4 4 0 0 1 0-8Z M9 3h6l1 3 3 1 2 5-2 5-3 1-1 3H9l-1-3-3-1-2-5 2-5 3-1 1-3Z',
  cup: 'M7 3h10v7a5 5 0 0 1-10 0V3Z M7 5H3v3a4 4 0 0 0 4 4 M17 5h4v3a4 4 0 0 1-4 4 M12 15v6 M8 21h8',
  trend: 'm3 17 6-6 4 4 8-10 M15 5h6v6',
  book: 'M12 5C9 2 5 3 3 4v16c3-2 6-2 9 0 3-2 6-2 9 0V4c-2-1-6-2-9 1Z M12 5v15',
  shield: 'm12 2 8 3v6c0 5-8 11-8 11S4 16 4 11V5l8-3Z M8 12l3 3 5-6',
}
</script>
<template>
  <svg
    :width="size"
    :height="size"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    stroke-width="1.65"
    stroke-linecap="round"
    stroke-linejoin="round"
    aria-hidden="true"
  >
    <path :d="paths[name] || paths.ball" />
  </svg>
</template>
