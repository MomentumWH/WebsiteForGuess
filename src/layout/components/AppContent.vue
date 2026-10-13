<template>
  <router-view v-slot="{ Component, route }">
    <keep-alive :max="10">
      <component :is="Component" v-if="route.meta.keepAlive" :key="route.path" />
    </keep-alive>
    <component :is="Component" v-if="!route.meta.keepAlive" :key="route.path" />
  </router-view>
</template>
