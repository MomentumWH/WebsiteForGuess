<script setup lang="ts">
import { computed, defineAsyncComponent, onUnmounted, shallowRef, useTemplateRef, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useAppStore } from '@/stores/modules/app'
import {
  teams,
  summarize,
  isMatchLocked,
  type League,
  type Match,
  type Prediction,
} from '@/data/matches'
import { usePredictions } from '@/composables/usePredictions'
import { useFootballMatches } from '@/composables/useFootballMatches'
import FixtureSyncStatus from './FixtureSyncStatus.vue'
import AppIcon from './AppIcon.vue'
import TeamBadge from './TeamBadge.vue'
import MatchHero from './MatchHero.vue'
import MatchList from './MatchList.vue'
import StatsPanel from './StatsPanel.vue'
import ReviewTable from './ReviewTable.vue'
import PredictionDialog from './PredictionDialog.vue'
import LeagueFilter from './LeagueFilter.vue'
import BackgroundSparkles from './BackgroundSparkles.vue'

const SquadWorkspace = defineAsyncComponent(() => import('@/components/squad/SquadWorkspace.vue'))
const MatchDetailsWorkspace = defineAsyncComponent(
  () => import('@/components/match-details/MatchDetailsWorkspace.vue'),
)
type Section = 'overview' | 'predict' | 'review' | 'stats' | 'squad' | 'match'
const route = useRoute()
const router = useRouter()
const appStore = useAppStore()
const isDark = computed(() => appStore.theme === 'dark')
// Document-level tokens also reach the sync dialog and player drag preview teleported to body.
watch(
  () => appStore.theme,
  (theme) => {
    document.documentElement.dataset.matchdayTheme = theme
  },
  { immediate: true, flush: 'sync' },
)
onUnmounted(() => {
  delete document.documentElement.dataset.matchdayTheme
})
const section = shallowRef<Section>(
  route.name === 'MatchDetails' ? 'match' : route.path === '/squad' ? 'squad' : 'overview',
)
const previousSection = shallowRef<Section>('overview')
const detailId = computed(() =>
  typeof route.params.matchId === 'string' ? route.params.matchId : '',
)
watch(
  () => route.path,
  (path) => {
    if (route.name === 'MatchDetails') section.value = 'match'
    else if (path === '/squad') section.value = 'squad'
    else if (section.value === 'match') section.value = previousSection.value
    else if (section.value === 'squad') section.value = 'overview'
  },
)
const league = shallowRef<League>('all')
const onlyArsenal = shallowRef(true)
const query = shallowRef('')
const selected = shallowRef<Match | null>(null)
const error = shallowRef('')
const toast = shallowRef('')
const infoKind = shallowRef<'settings' | 'guide' | 'notifications'>('guide')
const infoDialog = useTemplateRef<HTMLDialogElement>('infoDialog')
const {
  matches,
  sources,
  seasonLabel,
  loading: syncing,
  error: syncError,
  refresh,
} = useFootballMatches()
const { predictions, personal, storageMessage, now, save, remove, exportRecords } =
  usePredictions(matches)
const selectedMatch = computed(() =>
  selected.value
    ? (matches.value.find((m) => m.id === selected.value!.id) ?? selected.value)
    : null,
)
const navigation: { id: Section; name: string; icon: string }[] = [
  { id: 'overview', name: '赛事总览', icon: 'grid' },
  { id: 'predict', name: '比分预测', icon: 'target' },
  { id: 'squad', name: '球队阵容', icon: 'squad' },
  { id: 'review', name: '预测复盘', icon: 'history' },
  { id: 'stats', name: '数据统计', icon: 'chart' },
]
const titles = {
  overview: ['赛事总览', '每一份预测，都值得被认真对待。'],
  predict: ['比分预测', '在哨声响起前，把你的直觉变成答案。'],
  review: ['预测复盘', '回看当时的判断，发现下一次的可能。'],
  stats: ['数据统计', '用比赛的答案，看见自己的判断力。'],
  squad: ['球队阵容', '认识每一位枪手，读懂每一场表现。'],
  match: ['比赛详情', '从赛前的走势，到终场的答案。'],
}
const scopedMatches = computed(() =>
  matches.value.filter(
    (match) =>
      (league.value === 'all' || match.league === league.value) &&
      (!onlyArsenal.value || [match.home.id, match.away.id].includes('arsenal')) &&
      `${match.home.name} ${match.away.name} ${match.home.short} ${match.away.short} ${match.venue}`
        .toLowerCase()
        .includes(query.value.trim().toLowerCase()),
  ),
)
const upcoming = computed(() =>
  scopedMatches.value
    .filter((m) => !m.actual)
    .sort((a, b) => (Date.parse(a.kickoff) || Infinity) - (Date.parse(b.kickoff) || Infinity)),
)
const completed = computed(() =>
  scopedMatches.value
    .filter((m) => m.actual)
    .sort((a, b) => Date.parse(b.kickoff) - Date.parse(a.kickoff)),
)
const stats = computed(() => summarize(scopedMatches.value, predictions.value))
const plStats = computed(() =>
  summarize(
    scopedMatches.value.filter((m) => m.league === 'pl'),
    predictions.value,
  ),
)
const uclStats = computed(() =>
  summarize(
    scopedMatches.value.filter((m) => m.league === 'ucl'),
    predictions.value,
  ),
)
const focusMatch = computed(
  () =>
    upcoming.value.find((m) => !isMatchLocked(m, now.value)) ??
    upcoming.value.find((m) => m.status === 'live') ??
    completed.value[0] ??
    upcoming.value[0],
)
const pendingCount = computed(
  () => matches.value.filter((m) => !isMatchLocked(m, now.value)).length,
)
const date = computed(() =>
  new Intl.DateTimeFormat('zh-CN', {
    timeZone: 'Asia/Shanghai',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    weekday: 'long',
  }).format(new Date(now.value)),
)
const statCards = computed(() => [
  {
    title: '已记录预测',
    value: stats.value.total,
    unit: '场',
    icon: 'target',
    caption: `${stats.value.completed} 场已结算`,
    tone: 'green',
  },
  {
    title: '胜平负命中率',
    value: stats.value.completed ? stats.value.rate : '—',
    unit: stats.value.completed ? '%' : '',
    icon: 'trend',
    caption: `${stats.value.correct} / ${stats.value.completed} 场方向命中`,
    tone: 'olive',
  },
  {
    title: '比分完全命中',
    value: stats.value.exact,
    unit: '场',
    icon: 'cup',
    caption: `精确命中率 ${stats.value.completed ? stats.value.exactRate + '%' : '暂无'}`,
    tone: 'orange',
  },
  {
    title: '待开赛预测',
    value: stats.value.pending,
    unit: '场',
    icon: 'clock',
    caption: '期待下一次哨响',
    tone: 'blue',
  },
])
function navigate(id: Section) {
  if (section.value !== id && (id === 'squad' || section.value === 'squad')) query.value = ''
  section.value = id
  const path = id === 'squad' ? '/squad' : '/'
  if (route.path !== path) void router.push(path)
  window.scrollTo({
    top: 0,
    behavior: window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth',
  })
}
function openPrediction(match: Match) {
  selected.value = match
  error.value = ''
}
function openMatchDetails(match: Match) {
  if (section.value !== 'match') previousSection.value = section.value
  void router.push({ name: 'MatchDetails', params: { matchId: match.id } })
  window.scrollTo({ top: 0, behavior: 'instant' })
}
function closeMatchDetails() {
  navigate(previousSection.value)
}
function showArsenal() {
  onlyArsenal.value = true
  league.value = 'all'
  query.value = ''
  navigate('overview')
}
function selectCompetition(value: League) {
  league.value = value
  query.value = ''
  navigate('predict')
}
function showUpcoming() {
  infoDialog.value?.close()
  navigate('predict')
}
function savePrediction(value: Omit<Prediction, 'savedAt'>) {
  if (!selected.value) return
  const message = save(selected.value.id, value)
  if (message) {
    error.value = message
    return
  }
  selected.value = null
  toast.value = '预测已保存，期待终场的答案。'
}
function openInfo(kind: typeof infoKind.value) {
  infoKind.value = kind
  infoDialog.value?.showModal()
}
function removePrediction() {
  if (!selected.value) return
  const message = remove(selected.value.id)
  if (message) {
    error.value = message
    return
  }
  selected.value = null
  toast.value = '已撤回本场预测，可以在开赛前重新填写。'
}
function download() {
  exportRecords()
  toast.value = `已导出 ${Object.keys(personal.value).length} 条个人预测记录。`
}
</script>
<template>
  <div class="matchday-app">
    <BackgroundSparkles />
    <aside class="sidebar" aria-label="主导航">
      <a class="brand" href="/" aria-label="MATCHDAY 首页"
        ><span class="brand-mark"
          ><svg viewBox="0 0 32 32" fill="none">
            <path
              d="M7 23V9l9 9 9-9v14"
              stroke="currentColor"
              stroke-width="3.5"
              stroke-linecap="round"
              stroke-linejoin="round"
            /></svg></span
        ><span>MATCHDAY<small>让热爱，有迹可循</small></span></a
      >
      <div class="workspace-label">我的工作台<span>PERSONAL</span></div>
      <nav class="nav-list">
        <button
          v-for="item in navigation"
          :key="item.id"
          :class="{ active: section === item.id }"
          :aria-current="section === item.id ? 'page' : undefined"
          @click="navigate(item.id)"
        >
          <AppIcon :name="item.icon" :size="19" /><span>{{ item.name }}</span
          ><span v-if="item.id === 'predict'" class="nav-count">{{ pendingCount }}</span
          ><span v-if="section === item.id" class="nav-active-dot"></span>
        </button>
      </nav>
      <div class="sidebar-divider"></div>
      <div class="following-label">我的关注<span>01</span></div>
      <button class="followed-team" @click="showArsenal">
        <TeamBadge :team="teams.arsenal!" :size="31" /><span>阿森纳<small>Arsenal FC</small></span
        ><span class="following-dot"></span>
      </button>
      <div class="competition-links">
        <button @click="selectCompetition('pl')">
          <i class="league-dot purple"></i>英格兰超级联赛<AppIcon
            name="chevron"
            :size="12"
          /></button
        ><button @click="selectCompetition('ucl')">
          <i class="league-dot blue"></i>欧洲冠军联赛<AppIcon name="chevron" :size="12" />
        </button>
      </div>
      <div class="sidebar-bottom">
        <div class="fan-card">
          <span class="fan-card-icon"><AppIcon name="shield" :size="18" /></span
          ><strong>Once a Gunner,<br />always a Gunner.</strong>
          <p>每一场，与你的主队同在。</p>
          <span class="fan-card-tag">NORTH LONDON · EST. 1886</span
          ><svg class="cannon" viewBox="0 0 100 60" fill="none" aria-hidden="true">
            <path
              d="M8 17h75l10 5-10 5H8z M15 15v14 M26 27l-9 20h62"
              stroke="currentColor"
              stroke-width="4"
            />
            <circle cx="54" cy="40" r="14" stroke="currentColor" stroke-width="3" />
            <circle cx="54" cy="40" r="3" fill="currentColor" />
          </svg>
        </div>
        <button class="sidebar-help" @click="openInfo('guide')">
          <AppIcon name="book" :size="17" />使用指南<AppIcon name="chevron" :size="13" /></button
        ><button class="profile-button" @click="openInfo('settings')">
          <span class="avatar">G<span></span></span
          ><span><strong>Gunner</strong><small>我的个人空间</small></span
          ><AppIcon name="settings" :size="17" />
        </button>
      </div>
    </aside>
    <div class="workspace">
      <header class="topbar">
        <div class="breadcrumb">
          <span class="breadcrumb-root">我的工作台</span
          ><AppIcon name="chevron" :size="12" /><strong>{{ titles[section][0] }}</strong>
        </div>
        <div class="header-actions">
          <label v-if="section !== 'match'" class="search-box"
            ><AppIcon name="search" :size="16" /><input
              v-model="query"
              type="search"
              :placeholder="section === 'squad' ? '搜索球员、号码…' : '搜索球队、比赛…'"
              :aria-label="section === 'squad' ? '搜索球员姓名或号码' : '搜索球队或比赛'"
            /><span>/</span></label
          >
          <button
            class="theme-toggle"
            type="button"
            :aria-pressed="isDark"
            aria-label="深色模式"
            :title="isDark ? '切换到日间模式' : '切换到深色模式'"
            @click="appStore.toggleTheme()"
          >
            <AppIcon :name="isDark ? 'sun' : 'moon'" :size="18" />
            <span>{{ isDark ? '日间模式' : '深色模式' }}</span>
          </button>
          <span class="header-divider"></span
          ><button
            class="notification-button icon-button"
            aria-label="查看消息"
            @click="openInfo('notifications')"
          >
            <AppIcon name="bell" :size="19" /></button
          ><button class="header-avatar" aria-label="打开个人设置" @click="openInfo('settings')">
            G
          </button>
        </div>
      </header>
      <main class="main-content">
        <div class="page-heading">
          <div>
            <div class="title-line">
              <h1>{{ titles[section][0] }}</h1>
              <span class="season-pill">{{ seasonLabel }}</span>
            </div>
            <p>{{ titles[section][1] }}</p>
          </div>
          <div class="page-date"><AppIcon name="calendar" :size="15" />{{ date }}</div>
        </div>
        <FixtureSyncStatus
          v-if="section !== 'squad'"
          :sources="sources"
          :loading="syncing"
          :error="syncError"
          @refresh="refresh"
        />
        <SquadWorkspace v-if="section === 'squad'" :query="query" />
        <MatchDetailsWorkspace
          v-if="section === 'match'"
          :match-id="detailId"
          :matches="matches"
          :feed-loading="syncing"
          :feed-error="syncError"
          :predictions="predictions"
          :now="now"
          @back="closeMatchDetails"
          @predict="openPrediction"
        />
        <p v-if="storageMessage" class="storage-warning" role="alert">{{ storageMessage }}</p>
        <MatchHero
          v-if="section === 'overview'"
          :match="focusMatch"
          :prediction="focusMatch ? predictions[focusMatch.id] : undefined"
          :locked="focusMatch ? isMatchLocked(focusMatch, now) : false"
          @predict="openPrediction"
          @detail="openMatchDetails"
          @navigate="navigate"
        />
        <section
          v-if="section === 'overview' || section === 'stats'"
          class="summary-grid"
          aria-label="预测统计"
        >
          <article v-for="card in statCards" :key="card.title" class="summary-card panel">
            <div class="summary-label">
              {{ card.title
              }}<span class="summary-icon" :class="card.tone"
                ><AppIcon :name="card.icon" :size="17"
              /></span>
            </div>
            <div class="summary-value">
              {{ card.value }}<small>{{ card.unit }}</small>
            </div>
            <div class="summary-caption">
              <span>{{ card.caption }}</span
              ><span class="sample-indicator">个人记录</span>
            </div>
          </article>
        </section>
        <div
          v-if="section === 'overview' || section === 'predict'"
          class="content-columns"
          :class="{ 'predict-columns': section === 'predict' }"
        >
          <MatchList
            v-model:league="league"
            v-model:only-arsenal="onlyArsenal"
            :matches="scopedMatches"
            :preview="section === 'overview'"
            :query="query"
            :predictions="predictions"
            :now="now"
            :loading="syncing"
            @predict="openPrediction"
            @detail="openMatchDetails"
            @view-all="navigate('predict')"
          /><StatsPanel
            :stats="stats"
            :pl="plStats"
            :ucl="uclStats"
            @navigate="navigate('stats')"
          />
        </div>
        <div v-if="section === 'review' || section === 'stats'" class="view-toolbar">
          <LeagueFilter v-model="league" variant="toolbar" />
          <button class="export-button" @click="download">
            <AppIcon name="download" :size="15" />导出我的预测
          </button>
        </div>
        <StatsPanel
          v-if="section === 'stats'"
          :stats="stats"
          :pl="plStats"
          :ucl="uclStats"
          expanded
        />
        <ReviewTable
          v-if="section === 'overview' || section === 'review'"
          :league="league"
          :matches="section === 'overview' ? completed.slice(0, 3) : completed"
          :predictions="predictions"
          :full="section === 'review'"
          :scope="`${onlyArsenal}:${query}`"
          @detail="openMatchDetails"
          @navigate="navigate('review')"
        />
        <div v-if="section === 'predict'" class="prediction-explainer">
          <AppIcon name="info" :size="19" />
          <div>
            <h3>留下判断，再等比赛揭晓。</h3>
            <p>
              选择一场比赛，输入主客队比分。你的预测会保存在当前浏览器，开赛前可以修改，开赛后锁定。赛后以常规时间比分进行复盘。
            </p>
          </div>
        </div>
        <footer class="page-footer">
          <span><span class="footer-brand">MATCHDAY</span>记录判断，也记录热爱。</span
          ><span
            >{{ section === 'squad' ? '官方球员数据 · 球队近五场' : '官网数据 · 常规时间赛果' }}
            <i>·</i> 北京时间 <i v-if="section !== 'squad'">·</i
            ><button v-if="section !== 'squad'" @click="openInfo('guide')">
              关于预测规则<AppIcon name="arrow" :size="11" /></button
          ></span>
        </footer>
      </main>
    </div>
    <PredictionDialog
      v-if="selectedMatch"
      :key="selectedMatch.id"
      :match="selectedMatch"
      :prediction="predictions[selectedMatch.id]"
      :now="now"
      :error="error"
      @save="savePrediction"
      @remove="removePrediction"
      @close="selected = null"
    />
    <div v-if="toast" class="toast" role="status">
      <AppIcon name="check" :size="17" />{{ toast
      }}<button aria-label="关闭提示" @click="toast = ''">
        <AppIcon name="close" :size="14" />
      </button>
    </div>
    <dialog
      ref="infoDialog"
      class="info-dialog"
      aria-labelledby="info-title"
      @click="$event.target === infoDialog && infoDialog?.close()"
    >
      <div class="info-heading">
        <h2 id="info-title">
          {{
            infoKind === 'guide'
              ? '让每一次预测都有迹可循'
              : infoKind === 'settings'
                ? '我的个人空间'
                : '比赛消息'
          }}
        </h2>
        <button class="icon-button" aria-label="关闭" @click="infoDialog?.close()">
          <AppIcon name="close" />
        </button>
      </div>
      <template v-if="infoKind === 'guide'"
        ><p class="info-intro">MATCHDAY 是你的英超与欧冠预测手账，重点关注阿森纳。</p>
        <ol class="guide-steps">
          <li>
            <b>赛前 · 留下判断</b>
            <p>选择比赛，填写主客队整数比分、信心程度和预测理由。</p>
          </li>
          <li>
            <b>开赛 · 预测锁定</b>
            <p>开赛前可修改；开球时间到达后不可补录或修改。</p>
          </li>
          <li>
            <b>赛后 · 对比答案</b>
            <p>
              按常规时间（含补时，不含加时及点球）结算。比分相同为比分命中；仅胜平负相同为方向命中。
            </p>
          </li>
          <li>
            <b>长期 · 看见进步</b>
            <p>命中率只计入有预测且已完赛的比赛，比分命中同时计入方向命中。</p>
          </li>
        </ol>
        <p class="info-notice">
          赛程与赛果来自英超和 UEFA
          官网，后台定期同步；同步失败时显示最近成功的数据及更新时间。个人预测保存在本机，清除浏览器数据将移除记录。原有演示预测保留在导出中，不参与真实赛事统计。
        </p></template
      ><template v-else-if="infoKind === 'settings'"
        ><div class="settings-profile">
          <span class="avatar">G</span>
          <div>
            <strong>Gunner</strong>
            <p>阿森纳 · 英超 / 欧冠</p>
          </div>
        </div>
        <div class="settings-row">
          <span
            ><b>我的预测记录</b
            ><small>当前浏览器已保存 {{ Object.keys(personal).length }} 条</small></span
          ><button class="export-button" @click="download">
            <AppIcon name="download" :size="15" />导出
          </button>
        </div>
        <p class="info-notice">
          本版无需登录，个人预测仅存储在当前浏览器。真实赛事使用独立比赛编号，数据同步不会覆盖个人预测；旧演示记录仍可导出。
        </p></template
      ><template v-else
        ><div class="notification-empty">
          <AppIcon name="bell" :size="36" />
          <h3>这里会记录比赛的消息</h3>
          <p>赛程与赛果会自动同步，暂未提供比赛推送通知。</p>
          <button class="primary-button" @click="showUpcoming">
            看看待预测的比赛<AppIcon name="arrow" :size="16" />
          </button></div
      ></template>
    </dialog>
  </div>
</template>
<style scoped>
.matchday-app {
  position: relative;
  isolation: isolate;
  --ink: var(--md-text, #283f32);
  --green: var(--md-accent, #2d6548);
  --muted: var(--md-muted, #929d91);
  --border: var(--md-border, #e8ede5);
  --canvas: var(--md-canvas, #f6f8f4);
  min-height: 100vh;
  color: var(--ink);
  background: var(--canvas);
  font-family: 'Segoe UI', 'PingFang SC', 'Microsoft YaHei', sans-serif;
  font-size: 17px;
  line-height: 1.5;
}
.sidebar {
  position: fixed;
  inset: 0 auto 0 0;
  width: 216px;
  background: var(--md-surface, #fff);
  border-right: 1px solid var(--border);
  z-index: 20;
  padding: 28px 19px 0;
  display: flex;
  flex-direction: column;
}
.brand {
  display: flex;
  align-items: center;
  gap: 10px;
  padding-left: 8px;
  margin-bottom: 38px;
}
.brand-mark {
  width: 33px;
  height: 33px;
  background: #285b40;
  color: #d8f6ad;
  border-radius: 9px;
  display: grid;
  place-items: center;
}
.brand-mark svg {
  width: 26px;
  height: 26px;
}
.brand > span:last-child {
  font-family: Bahnschrift, 'Arial Narrow', sans-serif;
  letter-spacing: 1.7px;
  font-size: 23px;
  line-height: 1.1;
  font-weight: 650;
}
.brand small {
  display: block;
  font-family: 'Microsoft YaHei', sans-serif;
  font-weight: 400;
  font-size: 12px;
  letter-spacing: 2.5px;
  margin-top: 7px;
  color: var(--md-muted, #a0a79b);
}
.workspace-label {
  display: flex;
  justify-content: space-between;
  align-items: center;
  font-size: 13px;
  color: var(--md-muted, #a4ada0);
  padding: 0 12px;
  margin-bottom: 15px;
}
.workspace-label > span {
  font-size: 11px;
  letter-spacing: 1px;
  color: var(--md-muted, #b5bcb1);
}
.nav-list {
  display: flex;
  flex-direction: column;
  gap: 7px;
}
.nav-list > button {
  display: flex;
  gap: 12px;
  align-items: center;
  border: 0;
  background: transparent;
  min-height: 43px;
  border-radius: 7px;
  padding: 0 13px;
  color: var(--md-secondary, #87917f);
  font-family: inherit;
  font-size: 16px;
  text-align: left;
  position: relative;
}
.nav-list > button:hover {
  background: var(--md-soft, #f5f8ef);
  color: var(--md-text, #3a6340);
}
.nav-list > button.active {
  background: var(--md-soft, #eaf2df);
  color: var(--md-text, #446b37);
  font-weight: 650;
}
.nav-active-dot {
  margin-left: auto;
  width: 5px;
  height: 5px;
  border-radius: 50%;
  background: #5c823f;
}
.nav-count {
  margin-left: auto;
  font-size: 13px;
  background: var(--md-soft, #f0f3eb);
  padding: 1px 6px;
  border-radius: 4px;
  color: var(--md-muted, #9fa88f);
}
.nav-list > button.active .nav-count {
  display: none;
}
.sidebar-divider {
  height: 1px;
  background: var(--md-soft, #edf0e8);
  margin: 23px 12px;
}
.following-label {
  display: flex;
  justify-content: space-between;
  font-size: 13px;
  color: var(--md-muted, #a6ae9d);
  padding: 0 12px;
}
.following-label > span {
  font-size: 12px;
}
.followed-team {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 17px 12px 11px;
  border: 0;
  background: transparent;
  text-align: left;
  width: 100%;
}
.followed-team > span:nth-child(2) {
  color: var(--md-secondary, #5c6b51);
  font-size: 15px;
  line-height: 1.4;
}
.followed-team small {
  display: block;
  font-size: 12px;
  color: var(--md-muted, #a8af9d);
  margin-top: 3px;
  letter-spacing: 0.3px;
}
.following-dot {
  width: 5px;
  height: 5px;
  border-radius: 50%;
  background: #ba4145;
  margin-left: auto;
}
.competition-links {
  display: flex;
  flex-direction: column;
  padding: 4px 9px;
  gap: 12px;
}
.competition-links > button {
  display: flex;
  align-items: center;
  gap: 9px;
  font-size: 13px;
  color: var(--md-muted, #98a18c);
  border: 0;
  background: transparent;
  text-align: left;
  padding: 3px;
}
.competition-links svg {
  margin-left: auto;
}
.league-dot {
  height: 5px;
  width: 5px;
  border-radius: 50%;
  display: inline-block;
}
.league-dot.purple {
  background: #a18ba5;
}
.league-dot.blue {
  background: #91a5be;
}
.sidebar-bottom {
  margin-top: auto;
  padding-top: 30px;
}
.fan-card {
  position: relative;
  overflow: hidden;
  border-radius: 10px;
  padding: 17px 15px 14px;
  background: var(--md-soft, #f4f7ed);
  margin-bottom: 16px;
}
.fan-card-icon {
  color: var(--md-secondary, #648153);
  display: block;
  margin-bottom: 9px;
}
.fan-card strong {
  font-family: Georgia, serif;
  font-size: 19px;
  line-height: 1.45;
  color: var(--md-secondary, #5d7950);
  font-weight: 400;
}
.fan-card p {
  font-size: 12px;
  color: var(--md-muted, #a1ac91);
  margin: 7px 0 15px;
}
.fan-card-tag {
  font-size: 10px;
  color: var(--md-muted, #b0ba9e);
  letter-spacing: 1px;
}
.cannon {
  position: absolute;
  width: 85px;
  height: 55px;
  right: -11px;
  bottom: 27px;
  color: #dce5cc;
  transform: rotate(-17deg);
}
.sidebar-help {
  display: flex;
  align-items: center;
  gap: 11px;
  padding: 10px 11px;
  border: 0;
  background: transparent;
  color: var(--md-muted, #9aa58d);
  font-size: 14px;
  width: 100%;
}
.sidebar-help > svg:last-child {
  margin-left: auto;
}
.profile-button {
  display: flex;
  align-items: center;
  gap: 9px;
  text-align: left;
  border: 0;
  border-top: 1px solid var(--border);
  background: var(--md-surface, white);
  padding: 19px 8px;
  width: 100%;
  margin-top: 12px;
}
.avatar {
  width: 31px;
  height: 31px;
  display: grid;
  place-items: center;
  background: var(--md-soft, #e3ebd7);
  color: var(--md-secondary, #65814d);
  border-radius: 50%;
  font-family: Georgia, serif;
  font-size: 20px;
  position: relative;
}
.avatar > span {
  position: absolute;
  bottom: 0;
  right: 0;
  border: 2px solid var(--md-border, white);
  width: 8px;
  height: 8px;
  background: #5e9956;
  border-radius: 50%;
}
.profile-button strong {
  font-size: 14px;
  color: var(--md-secondary, #647158);
  font-weight: 500;
}
.profile-button small {
  display: block;
  font-size: 12px;
  color: var(--md-muted, #a7af9b);
  margin-top: 2px;
}
.profile-button > svg {
  color: var(--md-muted, #a3ad96);
  margin-left: auto;
}
.workspace {
  margin-left: 216px;
  min-height: 100vh;
}
.topbar {
  height: 73px;
  border-bottom: 1px solid var(--border);
  background: var(--md-glass, #ffffffd9);
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0 32px;
  gap: 15px;
}
.breadcrumb {
  display: flex;
  align-items: center;
  gap: 12px;
  font-size: 14px;
  color: var(--md-muted, #a8b09e);
  white-space: nowrap;
}
.breadcrumb strong {
  font-weight: 500;
  color: var(--md-secondary, #65765a);
}
.header-actions {
  display: flex;
  align-items: center;
  gap: 21px;
}
.search-box {
  display: flex;
  align-items: center;
  gap: 7px;
  color: var(--md-muted, #a5b099);
}
.search-box input {
  border: 0;
  outline: 0;
  background: transparent;
  width: 148px;
  font-size: 14px;
  color: var(--md-secondary, #5a7150);
  font-family: inherit;
}
.search-box input::placeholder {
  color: var(--md-muted, #adb7a2);
}
.search-box > span {
  border: 1px solid var(--md-border, #e8ede0);
  border-radius: 3px;
  font-size: 13px;
  padding: 0 5px;
  color: var(--md-muted, #bdc4b3);
}
.search-box:focus-within {
  outline: 2px solid var(--md-border, #d6e4c8);
  outline-offset: 6px;
  border-radius: 3px;
}
.header-divider {
  height: 20px;
  width: 1px;
  background: var(--md-soft, #e9ede3);
}
.notification-button {
  color: var(--md-secondary, #8b997e) !important;
  position: relative;
}
.header-avatar {
  border: 3px solid var(--md-border, white);
  outline: 1px solid var(--md-border, #e7ebde);
  width: 31px;
  height: 31px;
  border-radius: 50%;
  background: var(--md-soft, #edf1e2);
  color: var(--md-secondary, #7c8f60);
  font-family: Georgia, serif;
  font-size: 19px;
}
.main-content {
  max-width: 1510px;
  margin: 0 auto;
  padding: 27px 32px 18px;
}
.page-heading {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  margin-bottom: 17px;
}
.title-line {
  display: flex;
  align-items: center;
  gap: 13px;
}
.title-line h1 {
  font-size: 29px;
  letter-spacing: 1px;
  font-weight: 650;
  line-height: 1.4;
}
.season-pill {
  font-family: Bahnschrift, sans-serif;
  font-size: 13px;
  letter-spacing: 0.3px;
  border: 1px solid var(--md-border, #e1e7da);
  padding: 3px 8px;
  border-radius: 5px;
  color: var(--md-secondary, #88987c);
  background: var(--md-soft, #fcfdf9);
}
.page-heading p {
  font-size: 14px;
  color: var(--md-muted, #a0aa96);
  margin-top: 6px;
  letter-spacing: 0.3px;
}
.page-date {
  font-size: 13px;
  display: flex;
  gap: 7px;
  align-items: center;
  color: var(--md-muted, #97a38c);
  white-space: nowrap;
}
.data-status {
  display: flex;
  align-items: center;
  justify-content: space-between;
  font-size: 12px;
  color: var(--md-muted, #9aa58f);
  margin-bottom: 17px;
}
.data-status > span {
  display: flex;
  align-items: center;
  gap: 6px;
}
.data-status i {
  width: 4px;
  height: 4px;
  border-radius: 50%;
  background: #9fb286;
}
.status-separator {
  color: var(--md-muted, #c9d1be);
  margin: 0 3px;
}
.data-status > button {
  background: transparent;
  border: 0;
  display: flex;
  align-items: center;
  gap: 6px;
  color: var(--md-secondary, #8a9d7b);
  font-size: 13px;
  padding: 2px 0;
}
.summary-grid {
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  gap: 17px;
  margin: 22px 0;
}
.summary-card {
  padding: 16px 20px 14px;
  position: relative;
}
.summary-label {
  display: flex;
  align-items: center;
  justify-content: space-between;
  font-size: 14px;
  color: var(--md-secondary, #8c9a81);
}
.summary-icon {
  width: 29px;
  height: 29px;
  border-radius: 7px;
  display: grid;
  place-items: center;
  color: var(--md-secondary, #769164);
  background: var(--md-soft, #f1f6e9);
  position: absolute;
  top: 17px;
  right: 16px;
}
.summary-icon.olive {
  background: var(--md-soft, #f1f3e6);
  color: var(--md-secondary, #909e61);
}
.summary-icon.orange {
  background: var(--md-warning-soft, #fbf3e9);
  color: var(--md-warning, #c3a371);
}
.summary-icon.blue {
  background: var(--md-blue-soft, #eef3f5);
  color: var(--md-blue, #91a5b0);
}
.summary-value {
  font-family: Bahnschrift, 'DIN Alternate', sans-serif;
  font-size: 34px;
  font-weight: 500;
  line-height: 1.4;
  margin: 5px 0 4px;
  letter-spacing: -1px;
}
.summary-value small {
  font-family: inherit;
  font-size: 16px;
  margin-left: 5px;
  font-weight: 400;
  color: var(--md-secondary, #8e9a83);
  letter-spacing: 0;
}
.summary-caption {
  display: flex;
  justify-content: space-between;
  align-items: center;
  font-size: 12px;
  color: var(--md-muted, #a4ad9b);
  gap: 4px;
}
.sample-indicator {
  font-size: 11px;
  color: var(--md-muted, #b4bca9);
}
.content-columns {
  display: grid;
  grid-template-columns: minmax(0, 1.85fr) minmax(290px, 1fr);
  gap: 22px;
  margin-bottom: 22px;
}
.predict-columns {
  margin-top: 22px;
}
.page-footer {
  display: flex;
  justify-content: space-between;
  align-items: center;
  color: var(--md-muted, #b0baa1);
  font-size: 12px;
  padding-top: 23px;
  gap: 15px;
}
.page-footer > span {
  display: flex;
  align-items: center;
  gap: 9px;
}
.footer-brand {
  font-family: Bahnschrift, sans-serif;
  font-weight: 600;
  letter-spacing: 1px;
  font-size: 13px;
  color: var(--md-muted, #9eac8f);
}
.page-footer i {
  font-style: normal;
  color: var(--md-muted, #bac4ae);
}
.page-footer button {
  background: transparent;
  border: 0;
  font-size: 12px;
  color: var(--md-muted, #9eae8b);
  display: flex;
  align-items: center;
  gap: 4px;
}
.view-toolbar {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin: 21px 0;
}
.export-button {
  border: 1px solid var(--md-border, #dfe8d5);
  border-radius: 6px;
  background: var(--md-soft, #fcfef8);
  display: flex;
  align-items: center;
  gap: 7px;
  padding: 8px 12px;
  color: var(--md-secondary, #6f875a);
  font-size: 14px;
}
.prediction-explainer {
  display: flex;
  gap: 15px;
  padding: 23px;
  background: var(--md-soft, #edf3e6);
  border: 1px solid var(--md-border, #e5ecd9);
  border-radius: 10px;
  color: var(--md-secondary, #7e9569);
}
.prediction-explainer > svg {
  flex-shrink: 0;
  margin-top: 2px;
}
.prediction-explainer h3 {
  font-size: 17px;
  font-weight: 500;
  margin-bottom: 8px;
}
.prediction-explainer p {
  font-size: 15px;
  line-height: 1.9;
  color: var(--md-secondary, #8f9f7e);
  max-width: 700px;
}
.toast {
  position: fixed;
  bottom: 27px;
  left: calc(50% + 100px);
  transform: translateX(-50%);
  z-index: 100;
  display: flex;
  align-items: center;
  gap: 12px;
  background: #24533a;
  color: #eef8e6;
  border-radius: 9px;
  padding: 14px 20px;
  box-shadow: 0 8px 35px #1a382e30;
  font-size: 16px;
  max-width: calc(100vw - 30px);
}
.toast button {
  color: var(--md-muted, #c1d3b1);
  background: none;
  border: 0;
  display: flex;
  margin-left: 8px;
  padding: 4px;
}
.info-dialog {
  margin: auto;
  width: min(490px, calc(100% - 28px));
  border: 1px solid var(--md-border, #dfe8d6);
  border-radius: 16px;
  background: var(--md-surface, white);
  color: var(--md-text, #3c5432);
  padding: 28px;
  box-shadow: 0 25px 100px #12271835;
}
.info-dialog::backdrop {
  background: #18382799;
  backdrop-filter: blur(4px);
}
.info-heading {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 10px;
}
.info-heading h2 {
  font-size: 23px;
  font-weight: 600;
}
.info-intro {
  font-size: 16px;
  color: var(--md-secondary, #91a17f);
  margin-top: 18px;
  line-height: 1.8;
}
.guide-steps {
  padding-left: 20px;
  margin: 25px 0;
  color: var(--md-secondary, #799466);
}
.guide-steps li {
  padding-left: 8px;
  margin-bottom: 19px;
  font-size: 16px;
}
.guide-steps b {
  font-weight: 550;
  color: var(--md-text, #536c43);
}
.guide-steps p {
  font-size: 15px;
  line-height: 1.8;
  color: var(--md-muted, #99a789);
  margin-top: 6px;
}
.info-notice {
  padding: 14px;
  background: var(--md-soft, #f5f8ef);
  border-radius: 7px;
  font-size: 14px;
  color: var(--md-muted, #a2ae94);
  line-height: 1.8;
  margin-top: 20px;
}
.settings-profile {
  display: flex;
  align-items: center;
  gap: 15px;
  margin: 25px 0;
}
.settings-profile .avatar {
  width: 48px;
  height: 48px;
  font-size: 28px;
}
.settings-profile strong {
  font-size: 20px;
}
.settings-profile p {
  font-size: 15px;
  color: var(--md-muted, #9ca98f);
  margin-top: 4px;
}
.settings-row {
  border-top: 1px solid var(--md-border, #e9efdf);
  padding: 20px 0;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 15px;
}
.settings-row b {
  font-size: 16px;
  font-weight: 500;
}
.settings-row small {
  font-size: 14px;
  color: var(--md-muted, #a5b197);
  display: block;
  margin-top: 5px;
}
.settings-row input {
  accent-color: var(--md-accent, #497b3f);
  width: 17px;
  height: 17px;
}
.notification-empty {
  padding: 35px 0 5px;
  display: flex;
  align-items: center;
  flex-direction: column;
  color: var(--md-muted, #a2b38e);
}
.notification-empty h3 {
  font-size: 19px;
  color: var(--md-secondary, #6f885c);
  margin-top: 20px;
}
.notification-empty p {
  font-size: 15px;
  margin: 12px 0 25px;
}
.notification-empty .primary-button {
  gap: 15px;
  font-size: 15px;
}
.storage-warning {
  padding: 10px;
  border-radius: 6px;
  background: var(--md-warning-soft, #fff2de);
  color: var(--md-warning, #9e7432);
  font-size: 16px;
  margin-bottom: 15px;
}
@media (min-width: 1500px) {
  .sidebar {
    width: 236px;
    padding: 30px 23px 0;
  }
  .workspace {
    margin-left: 236px;
  }
  .main-content {
    padding: 32px 40px 20px;
  }
  .topbar {
    padding: 0 40px;
  }
  .summary-card {
    padding: 19px 23px;
  }
  .summary-value {
    font-size: 38px;
  }
  .summary-label {
    font-size: 15px;
  }
  .summary-caption {
    font-size: 13px;
  }
  .page-heading h1 {
    font-size: 32px;
  }
  .summary-grid {
    margin: 25px 0;
  }
}
@media (max-width: 1200px) {
  .sidebar {
    width: 190px;
    padding: 25px 14px 0;
  }
  .workspace {
    margin-left: 190px;
  }
  .brand {
    padding-left: 5px;
    gap: 8px;
  }
  .brand > span:last-child {
    font-size: 21px;
  }
  .main-content {
    padding: 25px 24px 18px;
  }
  .topbar {
    padding: 0 24px;
  }
  .content-columns {
    grid-template-columns: minmax(0, 1.7fr) minmax(265px, 1fr);
    gap: 17px;
  }
  .summary-grid {
    gap: 12px;
  }
  .summary-card {
    padding: 15px;
  }
  .summary-icon {
    right: 13px;
    width: 25px;
    height: 25px;
  }
  .page-date {
    font-size: 12px;
  }
  .following-label,
  .workspace-label {
    font-size: 12px;
  }
}
@media (max-width: 1050px) {
  .content-columns {
    grid-template-columns: 1fr;
  }
  .content-columns > :last-child {
    display: none;
  }
  .page-date {
    display: none;
  }
  .header-actions {
    gap: 15px;
  }
  .fan-card {
    padding: 15px 10px;
  }
  .summary-card {
    padding: 13px;
  }
  .summary-icon {
    width: 22px;
    height: 22px;
    right: 10px;
    top: 13px;
  }
  .summary-label {
    font-size: 13px;
  }
  .summary-value {
    font-size: 31px;
  }
  .summary-caption {
    font-size: 11px;
  }
}
@media (max-width: 800px) {
  .sidebar {
    width: 72px;
    padding: 22px 11px 0;
    align-items: center;
  }
  .brand {
    padding: 0;
    margin-bottom: 30px;
  }
  .brand > span:last-child,
  .workspace-label,
  .nav-list > button > span,
  .following-label,
  .followed-team > span:nth-child(2),
  .following-dot,
  .competition-links,
  .fan-card,
  .sidebar-help,
  .profile-button > span:nth-child(2),
  .profile-button > svg {
    display: none;
  }
  .nav-list {
    width: 100%;
    gap: 12px;
  }
  .nav-list > button {
    padding: 0;
    justify-content: center;
    width: 45px;
    height: 45px;
  }
  .sidebar-divider {
    width: 28px;
    margin: 23px 0;
  }
  .followed-team {
    padding: 10px;
    justify-content: center;
  }
  .sidebar-bottom {
    width: 100%;
  }
  .profile-button {
    padding: 20px 0;
    justify-content: center;
  }
  .workspace {
    margin-left: 72px;
  }
  .main-content {
    padding: 23px 22px;
  }
  .topbar {
    padding: 0 22px;
  }
  .toast {
    left: calc(50% + 36px);
  }
  .summary-grid {
    grid-template-columns: repeat(2, minmax(0, 1fr));
    gap: 12px;
  }
  .summary-card {
    padding: 17px 20px;
  }
  .summary-label {
    font-size: 15px;
  }
  .summary-value {
    font-size: 35px;
  }
  .summary-caption {
    font-size: 13px;
  }
  .summary-icon {
    width: 27px;
    height: 27px;
    right: 17px;
    top: 17px;
  }
  .page-footer {
    font-size: 11px;
  }
  .page-footer > span {
    gap: 6px;
  }
  .footer-brand {
    font-size: 12px;
  }
}
@media (max-width: 550px) {
  .sidebar {
    position: fixed;
    inset: auto 0 0;
    width: 100%;
    height: 65px;
    flex-direction: row;
    padding: 0 12px;
    border-top: 1px solid var(--md-border, #e5ebdd);
    background: var(--md-glass, #fffffff5);
    backdrop-filter: blur(10px);
  }
  .sidebar .brand,
  .sidebar-divider,
  .followed-team,
  .sidebar-bottom {
    display: none;
  }
  .nav-list {
    flex-direction: row;
    justify-content: space-around;
    gap: 0;
  }
  .nav-list > button {
    width: 70px;
    height: 52px;
    flex-direction: column;
    gap: 4px;
    background: transparent !important;
    font-size: 13px;
    color: var(--md-muted, #9ca98b);
  }
  .nav-list > button > span:nth-child(2) {
    display: block;
    font-size: 12px;
  }
  .nav-list > button.active {
    color: var(--md-text, #315b3a);
  }
  .workspace {
    margin-left: 0;
  }
  .topbar {
    height: 59px;
    padding: 0 19px;
  }
  .breadcrumb {
    font-size: 13px;
    gap: 6px;
  }
  .header-actions {
    gap: 12px;
  }
  .search-box input {
    width: 95px;
    font-size: 13px;
  }
  .search-box > span,
  .header-divider,
  .header-avatar {
    display: none;
  }
  .main-content {
    padding: 22px 16px 85px;
  }
  .page-heading {
    margin-bottom: 14px;
  }
  .title-line h1 {
    font-size: 27px;
  }
  .title-line {
    gap: 9px;
  }
  .season-pill {
    font-size: 12px;
  }
  .page-heading p {
    font-size: 13px;
  }
  .data-status {
    font-size: 11px;
    gap: 10px;
  }
  .data-status > span {
    gap: 4px;
  }
  .data-status > button {
    font-size: 12px;
    white-space: nowrap;
  }
  .summary-card {
    padding: 15px 17px;
  }
  .summary-label {
    font-size: 14px;
  }
  .summary-caption {
    font-size: 12px;
  }
  .page-footer {
    align-items: flex-start;
    gap: 12px;
    flex-direction: column;
    padding-top: 20px;
  }
  .toast {
    left: 50%;
    bottom: 80px;
    font-size: 14px;
    padding: 12px 15px;
    white-space: nowrap;
  }
  .view-toolbar {
    gap: 8px;
  }
  .export-button {
    padding: 7px 9px;
    font-size: 13px;
  }
  .info-dialog {
    padding: 23px;
  }
  .info-heading h2 {
    font-size: 21px;
  }
}
</style>
