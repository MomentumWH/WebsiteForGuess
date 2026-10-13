<script setup lang="ts">
import { onMounted, onUnmounted, shallowRef, useTemplateRef } from 'vue'

const dialog = useTemplateRef<HTMLDialogElement>('dialog')
const visible = shallowRef(true)
const leaving = shallowRef(false)
const badgeFailed = shallowRef(false)
const fadeDuration = 1100
let fadeTimer: number | undefined
let closeTimer: number | undefined
let previousOverflow: string | undefined

function cleanup() {
  window.clearTimeout(fadeTimer)
  window.clearTimeout(closeTimer)
  dialog.value?.close()
  if (previousOverflow !== undefined) {
    document.body.style.overflow = previousOverflow
    previousOverflow = undefined
  }
}
function finish() {
  cleanup()
  visible.value = false
}
function beginLeave() {
  if (leaving.value || !visible.value) return
  window.clearTimeout(fadeTimer)
  leaving.value = true
  // Normally animationend closes the dialog; keep a fallback for interrupted animations.
  closeTimer = window.setTimeout(finish, fadeDuration + 250)
}
function onAnimationEnd() {
  if (leaving.value) finish()
}
onMounted(() => {
  if (!dialog.value) return
  dialog.value.showModal()
  previousOverflow = document.body.style.overflow
  document.body.style.overflow = 'hidden'
  // The fade is part of the three-second intro, independent of data requests.
  fadeTimer = window.setTimeout(beginLeave, 3000 - fadeDuration)
})
onUnmounted(cleanup)
</script>

<template>
  <Teleport to="body">
    <dialog
      v-if="visible"
      ref="dialog"
      class="arsenal-welcome"
      :class="{ 'is-leaving': leaving }"
      :style="{ '--welcome-fade-duration': `${fadeDuration}ms` }"
      aria-label="欢迎进入 MATCHDAY"
      @animationend.self="onAnimationEnd"
      @cancel.prevent="beginLeave"
    >
      <span class="welcome-brand" aria-hidden="true">MATCHDAY<span> / </span>FOR THE GUNNERS</span>
      <button class="welcome-skip" type="button" @click="beginLeave">
        跳过开场<span aria-hidden="true">↗</span>
      </button>
      <div class="welcome-stage">
        <p class="welcome-eyebrow">NORTH LONDON <span>·</span> EST. 1886</p>
        <div class="crest-scene">
          <span class="crest-halo" aria-hidden="true"></span>
          <span class="crest-ring ring-outer" aria-hidden="true"></span>
          <span class="crest-ring ring-inner" aria-hidden="true"></span>
          <span class="crest-ripple ripple-one" aria-hidden="true"></span>
          <span class="crest-ripple ripple-two" aria-hidden="true"></span>
          <span class="crest-marker marker-top" aria-hidden="true"></span>
          <span class="crest-marker marker-bottom" aria-hidden="true"></span>
          <div class="crest-frame">
            <img
              v-if="!badgeFailed"
              class="arsenal-crest"
              src="/images/arsenal.png"
              width="144"
              height="156"
              alt="阿森纳队徽"
              fetchpriority="high"
              @error="badgeFailed = true"
            />
            <span v-else class="crest-fallback" aria-label="阿森纳">AFC</span>
          </div>
        </div>
        <div class="welcome-copy">
          <h1 tabindex="-1" autofocus>ARSENAL <span>FC</span></h1>
          <p class="welcome-motto">Once a Gunner, always a Gunner.</p>
          <p class="welcome-message">每一场，与你的主队同在。</p>
        </div>
        <div class="welcome-progress" aria-hidden="true"><span></span></div>
        <p class="welcome-caption">欢迎回到你的赛事工作台</p>
      </div>
      <div class="welcome-footer" aria-hidden="true">
        <span>PASSION. PREDICTION. MATCHDAY.</span><span>英超 / UEFA 欧冠</span>
      </div>
    </dialog>
  </Teleport>
</template>

<style scoped>
.arsenal-welcome {
  position: fixed;
  inset: 0;
  width: 100%;
  height: 100%;
  max-width: none;
  max-height: none;
  margin: 0;
  padding: 0;
  overflow: auto;
  border: 0;
  color: #e9ecdc;
  background:
    radial-gradient(ellipse at 50% 39%, #314a3280, transparent 48%),
    linear-gradient(135deg, #10251cf5, #091b17f5);
  backdrop-filter: blur(12px);
  animation: welcome-veil 420ms ease-out both;
}
.arsenal-welcome::backdrop {
  background: transparent;
}
.arsenal-welcome[open] {
  display: grid;
  place-items: center;
}
.arsenal-welcome.is-leaving {
  animation: welcome-depart var(--welcome-fade-duration) cubic-bezier(0.4, 0, 0.2, 1) both !important;
}
.welcome-brand,
.welcome-skip,
.welcome-footer {
  position: absolute;
}
.welcome-brand {
  top: 35px;
  left: 42px;
  color: #d8dfcb;
  font-size: 10px;
  font-weight: 600;
  letter-spacing: 2.5px;
}
.welcome-brand > span {
  color: #7c8f73;
  margin: 0 10px;
}
.welcome-skip {
  top: 26px;
  right: 32px;
  display: flex;
  align-items: center;
  gap: 14px;
  padding: 9px 12px;
  border: 1px solid #c8d6b51f;
  border-radius: 30px;
  color: #a3b09a;
  background: #dbe6ca05;
  font-family: inherit;
  font-size: 11px;
  cursor: pointer;
  transition:
    color 180ms,
    background 180ms;
}
.welcome-skip:hover {
  color: #eff3df;
  background: #dbe6ca14;
}
.welcome-skip:focus-visible {
  outline: 2px solid #b8ca92;
  outline-offset: 4px;
}
.welcome-skip > span {
  font-size: 15px;
}
.welcome-stage {
  position: relative;
  width: min(520px, 100%);
  padding: 90px 24px;
  text-align: center;
  transition: transform var(--welcome-fade-duration) cubic-bezier(0.4, 0, 0.2, 1);
}
.is-leaving .welcome-stage {
  transform: scale(1.035);
}
.welcome-eyebrow {
  color: #a2af90;
  font-size: 9px;
  font-weight: 500;
  letter-spacing: 4px;
  animation: welcome-copy 650ms 180ms both;
}
.welcome-eyebrow > span {
  margin: 0 10px;
  color: #c4ac73;
}
.crest-scene {
  position: relative;
  display: grid;
  place-items: center;
  width: 258px;
  height: 258px;
  margin: 26px auto 24px;
}
.crest-halo {
  position: absolute;
  inset: 28px;
  border-radius: 50%;
  background: radial-gradient(circle, #b7a16624, #78934a10 48%, transparent 72%);
  animation: crest-halo 2200ms ease-out both;
}
.crest-ring,
.crest-ripple {
  position: absolute;
  border: 1px solid #c3b27c25;
  border-radius: 50%;
  pointer-events: none;
}
.ring-outer {
  inset: 0;
  border-color: #a8ba8520;
  border-top-color: #c9b47488;
  animation: crest-orbit 2600ms cubic-bezier(0.16, 1, 0.3, 1) both;
}
.ring-inner {
  inset: 17px;
  border-color: #c5b27c20;
  border-bottom-color: #c9b47465;
  animation: crest-orbit 2600ms cubic-bezier(0.16, 1, 0.3, 1) reverse both;
}
.crest-ripple {
  inset: 13px;
  animation: crest-ripple 2200ms ease-out both;
}
.ripple-one {
  animation-delay: 160ms;
}
.ripple-two {
  animation-delay: 500ms;
}
.crest-marker {
  position: absolute;
  width: 4px;
  height: 4px;
  border-radius: 50%;
  background: #c4ac73;
  box-shadow: 0 0 12px #c7b57955;
}
.marker-top {
  top: -1px;
  left: calc(50% - 2px);
}
.marker-bottom {
  bottom: -1px;
  left: calc(50% - 2px);
  opacity: 0.45;
}
.crest-frame {
  position: relative;
  display: grid;
  place-items: center;
  animation: crest-arrive 1000ms cubic-bezier(0.16, 1, 0.3, 1) both;
}
.arsenal-crest {
  display: block;
  width: 144px;
  height: 156px;
  object-fit: contain;
  filter: drop-shadow(0 8px 24px #0008) drop-shadow(0 0 20px #c7aa6a16);
}
.crest-fallback {
  display: grid;
  place-items: center;
  width: 134px;
  height: 154px;
  clip-path: polygon(8% 0, 92% 0, 100% 56%, 82% 83%, 50% 100%, 18% 83%, 0 56%);
  background: #bd1832;
  color: #fff4d8;
  font:
    36px Georgia,
    serif;
  border: 4px solid #c7a85e;
}
.welcome-copy {
  animation: welcome-copy 700ms 400ms both;
}
.welcome-copy h1 {
  margin: 0;
  color: #f3edd8;
  font-family: Georgia, 'Times New Roman', serif;
  font-size: 35px;
  font-weight: 400;
  letter-spacing: 7px;
}
.welcome-copy h1 > span {
  font-size: 22px;
  color: #c9bb91;
  letter-spacing: 3px;
}
.welcome-copy h1:focus {
  outline: none;
}
.welcome-motto {
  margin-top: 13px;
  color: #c0c7af;
  font:
    italic 16px Georgia,
    serif;
}
.welcome-message {
  margin-top: 14px;
  font-size: 11px;
  letter-spacing: 2px;
  color: #8e9d84;
}
.welcome-progress {
  width: 150px;
  height: 2px;
  overflow: hidden;
  margin: 29px auto 0;
  background: #c4d0aa16;
  border-radius: 2px;
}
.welcome-progress > span {
  display: block;
  width: 100%;
  height: 100%;
  background: linear-gradient(90deg, #6d8956, #d5c38c);
  transform-origin: left;
  animation: welcome-progress 2600ms linear both;
}
.welcome-caption {
  margin-top: 12px;
  font-size: 9px;
  letter-spacing: 1.5px;
  color: #778870;
  animation: welcome-copy 650ms 650ms both;
}
.welcome-footer {
  bottom: 28px;
  left: 42px;
  right: 42px;
  display: flex;
  justify-content: space-between;
  font-size: 8px;
  letter-spacing: 1.5px;
  color: #6c7f65;
}
@keyframes welcome-veil {
  from {
    opacity: 0;
  }
  to {
    opacity: 1;
  }
}
@keyframes welcome-depart {
  from {
    opacity: 1;
  }
  to {
    opacity: 0;
  }
}
@keyframes crest-arrive {
  from {
    opacity: 0;
    transform: translateY(18px) scale(0.78);
  }
  to {
    opacity: 1;
    transform: translateY(0) scale(1);
  }
}
@keyframes welcome-copy {
  from {
    opacity: 0;
    transform: translateY(10px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}
@keyframes crest-orbit {
  from {
    opacity: 0;
    transform: rotate(-130deg) scale(0.82);
  }
  30% {
    opacity: 1;
  }
  to {
    opacity: 1;
    transform: rotate(40deg) scale(1);
  }
}
@keyframes crest-ripple {
  from {
    opacity: 0;
    transform: scale(0.7);
  }
  25% {
    opacity: 0.65;
  }
  to {
    opacity: 0;
    transform: scale(1.65);
  }
}
@keyframes crest-halo {
  from {
    opacity: 0;
    transform: scale(0.7);
  }
  to {
    opacity: 1;
    transform: scale(1.2);
  }
}
@keyframes welcome-progress {
  from {
    transform: scaleX(0);
  }
  to {
    transform: scaleX(1);
  }
}
@media (max-width: 600px) {
  .welcome-brand {
    top: 29px;
    left: 22px;
    font-size: 9px;
    letter-spacing: 1.5px;
  }
  .welcome-brand > span {
    margin: 0 5px;
  }
  .welcome-skip {
    top: 20px;
    right: 18px;
    gap: 8px;
    font-size: 10px;
  }
  .welcome-stage {
    padding: 85px 22px 95px;
  }
  .crest-scene {
    width: 230px;
    height: 230px;
  }
  .arsenal-crest {
    width: 130px;
    height: 141px;
  }
  .welcome-copy h1 {
    font-size: 30px;
    letter-spacing: 5px;
  }
  .welcome-motto {
    font-size: 14px;
  }
  .welcome-footer {
    bottom: 24px;
    left: 22px;
    right: 22px;
    font-size: 7px;
    letter-spacing: 1px;
  }
}
@media (max-height: 650px) {
  .welcome-stage {
    padding: 70px 22px;
  }
  .crest-scene {
    width: 190px;
    height: 190px;
    margin: 16px auto;
  }
  .arsenal-crest {
    width: 105px;
    height: 114px;
  }
  .welcome-copy h1 {
    font-size: 27px;
  }
  .welcome-progress {
    margin-top: 18px;
  }
}
@media (prefers-reduced-motion: reduce) {
  .arsenal-welcome {
    animation: welcome-veil 200ms ease-out both;
  }
  .arsenal-welcome * {
    animation: none;
  }
  .is-leaving .welcome-stage {
    transform: none;
  }
}
</style>
