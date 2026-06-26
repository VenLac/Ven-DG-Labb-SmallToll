<script setup lang="ts">
import WaveBackground from './components/WaveBackground.vue'

defineExpose({
  name: 'App'
});
</script>

<template>
  <WaveBackground />
  <div class="app-content">
    <RouterView />
  </div>
</template>

<style>
.app-content {
  position: relative;
  z-index: 3;
}
</style>
