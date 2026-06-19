<script lang="ts" setup>
import MCPunishment from './game/MCPunishment.vue';
import MiniGame from './game/MiniGame.vue';

defineOptions({
  name: 'GameConnection',
});

defineProps<{
  state: any;
}>();

type ModuleId = 'mc' | 'minigame';

interface GameModule {
    id: ModuleId;
    title: string;
    subtitle: string;
    icon: string;
    disabled?: boolean;
}

const modules: GameModule[] = [
    { id: 'mc', title: 'MC 受伤惩罚', subtitle: 'Minecraft 受伤触发强度惩罚', icon: 'pi pi-bolt' },
    { id: 'minigame', title: '小游戏', subtitle: '敬请期待', icon: 'pi pi-prime', disabled: true },
];

const activeModule = ref<ModuleId | null>(null);

const currentComponent = computed(() => {
    switch (activeModule.value) {
        case 'mc': return MCPunishment;
        case 'minigame': return MiniGame;
        default: return null;
    }
});
</script>

<template>
  <div class="w-full">
    <Transition name="fade-slide" mode="out-in">
      <div v-if="activeModule && currentComponent" :key="activeModule" class="game-detail">
        <div class="flex items-center gap-2 mb-6">
          <Button icon="pi pi-arrow-left" label="返回" severity="secondary" text @click="activeModule = null" />
        </div>
        <component :is="currentComponent" :state="state" />
      </div>

      <div v-else key="list" class="game-list" style="--enter-base-delay: 160ms;">
        <div class="flex flex-col justify-between gap-2 mb-6 items-start md:flex-row md:items-center">
          <h2 class="font-bold text-xl">游戏模式</h2>
        </div>
        <div class="module-list">
          <button
            v-for="(m, index) in modules"
            :key="m.id"
            type="button"
            class="module-card glass stagger-item"
            :class="{ disabled: m.disabled }"
            :style="{ '--stagger-i': index }"
            :disabled="m.disabled"
            @click="!m.disabled && (activeModule = m.id)"
          >
            <i class="pi module-icon" :class="m.icon"></i>
            <div class="module-text">
              <span class="module-title">{{ m.title }}</span>
              <span class="module-subtitle">{{ m.subtitle }}</span>
            </div>
            <i v-if="!m.disabled" class="pi pi-chevron-right module-arrow"></i>
          </button>
        </div>
      </div>
    </Transition>
  </div>
</template>

<style scoped>
.module-list {
    display: flex;
    flex-direction: column;
    gap: 0.75rem;
}

.module-card {
    display: flex;
    align-items: center;
    gap: 1rem;
    padding: 1rem 1.25rem;
    border: none;
    cursor: pointer;
    color: inherit;
    text-align: left;
    transition: transform 200ms var(--ease-smooth, ease), opacity 200ms ease;
}

.module-card:not(.disabled):hover {
    transform: translateX(0.25rem);
}

.module-card.disabled {
    cursor: not-allowed;
    opacity: 0.45;
}

.module-icon {
    font-size: 1.6rem;
    flex-shrink: 0;
}

.module-text {
    display: flex;
    flex-direction: column;
    gap: 0.15rem;
    flex-grow: 1;
}

.module-title {
    font-weight: 600;
    font-size: 1.05rem;
}

.module-subtitle {
    font-size: 0.8rem;
    opacity: 0.6;
}

.module-arrow {
    opacity: 0.5;
    flex-shrink: 0;
}
</style>
