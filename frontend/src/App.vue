<script setup lang="ts">
defineExpose({
  name: 'App'
});
</script>

<template>
  <div class="app-content">
    <RouterView />
  </div>
</template>

<style>
.app-content {
  position: relative;
}
</style>
