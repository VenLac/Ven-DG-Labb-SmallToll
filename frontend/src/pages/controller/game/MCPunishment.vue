<script lang="ts" setup>
import { MCPunishmentConfig, webApi } from '../../../apis/webApi';
import { ControllerPageState } from '../../Controller.vue';
import { Reactive } from 'vue';
import { ToastServiceMethods } from 'primevue/toastservice';
import { handleApiResponse } from '../../../utils/response';

defineOptions({ name: 'MCPunishment' });

const props = defineProps<{ state: any }>();

const toast = inject<ToastServiceMethods>('parentToast');

let parentState: Reactive<ControllerPageState>;
watch(() => props.state, (value) => { parentState = value; }, { immediate: true });

const clientId = computed(() => parentState.clientId);
const connected = computed(() => parentState.clientStatus === 'connected');

const DEFAULT_CONFIG: MCPunishmentConfig = {
    baseStrength: 20, punishRate: 5, punishTime: 3, maxStrength: 100, mode: 'normal', minDamage: 1,
};

const config = reactive<MCPunishmentConfig>({ ...DEFAULT_CONFIG });
const testing = ref(false);
const testDamage = ref(4);

const modeOptions = [
    { label: '普通', value: 'normal' },
    { label: '超叠', value: 'ultra' },
];

const KUBEJS_SCRIPT = [
    '// KubeJS server_scripts/mc_punishment.js（KubeJS 6+，按你的 MC 版本调整）',
    'PlayerEvents.hurt(event => {',
    '  const damage = event.damageAmount;',
    '  if (!damage) return;',
    "  const hubUrl = 'http://127.0.0.1:8920';",
    "  const clientId = '在此填入控制台的 clientId';",
    "  const HttpRequest = Java.loadClass('java.net.http.HttpRequest');",
    "  const HttpResponse = Java.loadClass('java.net.http.HttpResponse');",
    '  const request = HttpRequest.newBuilder()',
    "    .uri(Java.loadClass('java.net.URI').create(hubUrl + '/api/v2/game/' + clientId + '/module/mc/damage'))",
    "    .header('Content-Type', 'application/json')",
    '    .POST(HttpRequest.BodyPublishers.ofString(JSON.stringify({ damage: damage })))',
    '    .build();',
    "  Java.loadClass('java.net.http.HttpClient').newHttpClient().sendAsync(request, HttpResponse.BodyHandlers.ofString());",
    '});',
].join('\n');

const loadConfig = async () => {
    if (!clientId.value) return;
    const res = await webApi.getMCPunishmentConfig(clientId.value);
    if (res && res.status === 1 && res.config) {
        Object.assign(config, res.config);
    }
};

const handleSave = async () => {
    if (!clientId.value) {
        toast?.add({ severity: 'warn', summary: '未连接设备', detail: '请先连接设备再保存配置', life: 4000 });
        return;
    }
    const res = await webApi.setMCPunishmentConfig(clientId.value, { ...config });
    if (!res) {
        toast?.add({ severity: 'error', summary: '保存失败', detail: '网络错误' });
        return;
    }
    try {
        handleApiResponse(res);
        toast?.add({ severity: 'success', summary: '保存成功', detail: 'MC 受伤惩罚配置已保存', life: 3000 });
    } catch (e: any) {
        toast?.add({ severity: 'error', summary: '保存失败', detail: e.message });
    }
};

const handleTest = async () => {
    if (!clientId.value || !connected.value) return;
    testing.value = true;
    const res = await webApi.reportMCDamage(clientId.value, testDamage.value);
    testing.value = false;
    if (!res) {
        toast?.add({ severity: 'error', summary: '测试失败', detail: '网络错误' });
        return;
    }
    try {
        handleApiResponse(res);
        toast?.add({ severity: 'info', summary: '已触发惩罚', detail: `模拟伤害 ${testDamage.value} 点`, life: 3000 });
    } catch (e: any) {
        toast?.add({ severity: 'error', summary: '测试失败', detail: e.message });
    }
};

watch(clientId, () => { loadConfig(); });
onMounted(() => { loadConfig(); });
</script>

<template>
  <div class="w-full" style="--enter-base-delay: 160ms;">
    <div class="flex flex-col justify-between gap-2 mb-6 items-start md:flex-row md:items-center">
      <h2 class="font-bold text-xl">MC 受伤惩罚</h2>
      <div class="flex gap-2 items-center flex-wrap">
        <InputGroup class="input-small w-auto">
          <InputGroupAddon>测试伤害</InputGroupAddon>
          <InputNumber v-model="testDamage" :min="0" :max="200" :disabled="!connected" />
        </InputGroup>
        <Button icon="pi pi-bolt" label="测试惩罚" severity="secondary" :loading="testing" :disabled="!connected" @click="handleTest" />
        <Button icon="pi pi-save" label="保存配置" @click="handleSave" />
      </div>
    </div>

    <div v-if="!connected" class="text-sm opacity-70 mb-4">
      设备未连接，强度不会输出。可先保存配置，连接设备后再测试。
    </div>

    <div class="flex flex-col gap-4 form-stagger">
      <div class="config-row">
        <label class="font-semibold w-35 flex-shrink-0">基础强度</label>
        <InputNumber class="input-small" v-model="config.baseStrength" :min="0" :max="200" />
        <span class="config-hint">惩罚结束后回到此强度</span>
      </div>
      <div class="config-row">
        <label class="font-semibold w-35 flex-shrink-0">惩罚倍数</label>
        <InputNumber class="input-small" v-model="config.punishRate" :min="0" :max="50" />
        <span class="config-hint">强度 = 基础 + 伤害 × 倍数</span>
      </div>
      <div class="config-row">
        <label class="font-semibold w-35 flex-shrink-0">持续时间</label>
        <InputGroup class="input-small w-auto">
          <InputNumber v-model="config.punishTime" :min="1" :max="60" />
          <InputGroupAddon>秒</InputGroupAddon>
        </InputGroup>
      </div>
      <div class="config-row">
        <label class="font-semibold w-35 flex-shrink-0">强度上限</label>
        <InputNumber class="input-small" v-model="config.maxStrength" :min="1" :max="200" />
        <span class="config-hint">最终仍受通道/设备硬件上限钳制</span>
      </div>
      <div class="config-row">
        <label class="font-semibold w-35 flex-shrink-0">最小伤害阈值</label>
        <InputNumber class="input-small" v-model="config.minDamage" :min="0" />
        <span class="config-hint">低于此值的伤害被忽略</span>
      </div>
      <div class="config-row">
        <label class="font-semibold w-35 flex-shrink-0">惩罚模式</label>
        <SelectButton v-model="config.mode" :options="modeOptions" optionLabel="label" optionValue="value" :allowEmpty="false" />
        <span class="config-hint">普通：期间忽略新伤害；超叠：叠加并重置时间</span>
      </div>
    </div>

    <details class="mt-6">
      <summary class="cursor-pointer font-semibold opacity-80">如何对接 Minecraft</summary>
      <div class="mt-3 text-sm flex flex-col gap-2">
        <p>在 Minecraft（Fabric/Forge）里安装 <b>KubeJS</b>，新建脚本监听玩家受伤并上报到本 Hub：</p>
        <pre class="code-block"><code>{{ KUBEJS_SCRIPT }}</code></pre>
        <p class="opacity-70">提示：事件名与伤害字段名因 MC / KubeJS 版本而异，请按你的版本核对；脚本中的 clientId 从本控制台获取（连接设备后顶部可见）。</p>
      </div>
    </details>
  </div>
</template>

<style scoped>
.config-row {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 0.5rem;
}

@media (min-width: 1024px) {
  .config-row {
    gap: 2rem;
  }
}

.config-hint {
  font-size: 0.8rem;
  opacity: 0.6;
  flex-basis: 100%;
}

@media (min-width: 768px) {
  .config-hint {
    flex-basis: auto;
  }
}

.code-block {
  background: rgba(0, 0, 0, 0.25);
  border: 1px solid var(--glass-border);
  border-radius: 0.5rem;
  padding: 1rem;
  overflow-x: auto;
  white-space: pre;
  font-family: monospace;
  font-size: 0.8rem;
}
</style>
