<script lang="ts" setup>
defineOptions({
  name: 'FadeAndSlideTransitionGroup',
});

// 过渡时长常量，JS hooks 与 CSS transition 保持协调
const LEAVE_DURATION = 260; // 离开淡出时长
const ENTER_FADE_DELAY = 140; // 进入时先测量高度再淡入
const ENTER_TOTAL = 440; // 进入总时长（含高度收尾）

const transitionRef = ref<any | null>(null);

const onEnter = (el: Element, done: () => void) => {
  const transitionContainer = transitionRef.value!.$el as HTMLElement;
  const transitionEl = el as HTMLElement;
  let prevHeight = el.clientHeight;
  transitionContainer.style.height = `${prevHeight}px`;
  transitionEl.style.visibility = 'hidden';

  const heightTimer = setInterval(() => {
    const height = el.clientHeight;
    if (height !== prevHeight) {
      transitionContainer.style.height = `${height}px`;
      prevHeight = height;
    }
  }, 100);

  setTimeout(() => {
    transitionEl.style.visibility = '';
    transitionContainer.style.opacity = '1';
  }, ENTER_FADE_DELAY);

  setTimeout(() => {
    clearInterval(heightTimer);
    transitionContainer.style.height = '';
    transitionContainer.style.opacity = '';
    done();
  }, ENTER_TOTAL);
};

const onLeave = (el: Element, done: () => void) => {
  const transitionContainer = transitionRef.value!.$el as HTMLElement;
  const height = el.clientHeight;
  transitionContainer.style.height = `${height}px`;
  transitionContainer.style.opacity = '0';

  setTimeout(() => {
    done();
  }, LEAVE_DURATION);
};
</script>

<template>
  <TransitionGroup name="fade-and-slide" tag="div" class="fade-and-slide" ref="transitionRef" @enter="onEnter"
    @leave="onLeave" mode="out-in">
    <slot></slot>
  </TransitionGroup>
</template>

<style scoped>
.fade-and-slide {
  /* 丝滑缓动 easeOutQuint，opacity 与高度同步过渡 */
  transition:
    height 320ms cubic-bezier(0.22, 1, 0.36, 1),
    opacity 240ms cubic-bezier(0.22, 1, 0.36, 1);
  opacity: 1;
  overflow: hidden;
}
</style>
