<script lang="ts" setup>
import { useToast } from 'primevue/usetoast';
import Toast from 'primevue/toast';
import ConfirmDialog from 'primevue/confirmdialog';
import StatusChart from '../charts/Circle1.vue';

import { GameConfigType, GameStrengthConfig, MainGameConfig, PulseItemResponse, PulsePlayMode, SocketApi } from '../apis/socketApi';
import { ClientConnectUrlInfo, ServerInfoResData, webApi } from '../apis/webApi';
import { handleApiResponse } from '../utils/response';
import { simpleObjDiff } from '../utils/utils';
import { PulseItemInfo } from '../type/pulse';
import { useConfirm } from 'primevue/useconfirm';
import { ConnectorType, CoyoteDeviceVersion } from '../type/common';
import CoyoteLocalConnectService from '../components/partials/CoyoteLocalConnectService.vue';
import ClientInfoDialog from '../components/dialogs/ClientInfoDialog.vue';
import { useClientsStore } from '../stores/ClientsStore';
import { useCoyoteLocalConnStore } from '../stores/CoyoteLocalConnStore';
import { useRemoteNotificationStore } from '../stores/RemoteNotificationStore';

export interface ControllerPageState {
  controllerPage: 'strength' | 'pulse' | 'game';

  strengthVal: number;
  randomStrengthVal: number;
  strengthLimit: number;
  fireStrengthLimit: number;
  tempStrength: number;
  randomFreq: number[];
  bChannelEnabled: boolean;
  bChannelMultiple: number;
  channelAStrengthLimit: number | null;
  channelBStrengthLimit: number | null;
  pulseList: PulseItemInfo[] | null;
  customPulseList: PulseItemInfo[];
  selectPulseIds: string[];
  firePulseId: string;
  pulseMode: PulsePlayMode;
  pulseChangeInterval: number;
  newClientName: string;
  clientId: string;
  clientWsUrlList: ClientConnectUrlInfo[] | null;
  clientStatus: 'init' | 'waiting' | 'connected';
  apiBaseHttpUrl: string;
  connectorType: ConnectorType;
  gameStarted: boolean;
  showConnectionDialog: boolean;
  showClientInfoDialog: boolean;
  showLiveCompDialog: boolean;
  showConfigSavePrompt: boolean;
  showClientNameDialog: boolean;
}

const state = reactive<ControllerPageState>({
  controllerPage: 'strength',

  strengthVal: 5,
  randomStrengthVal: 5,
  fireStrengthLimit: 30,
  strengthLimit: 20,

  tempStrength: 0,

  randomFreq: [5, 10],

  bChannelEnabled: false,
  bChannelMultiple: 1,

  channelAStrengthLimit: null,
  channelBStrengthLimit: null,

  pulseList: null as PulseItemInfo[] | null,
  customPulseList: [] as PulseItemInfo[],
  selectPulseIds: [''],
  firePulseId: '',

  pulseMode: 'single',
  pulseChangeInterval: 60,

  newClientName: '',
  clientId: '',
  clientWsUrlList: null as ClientConnectUrlInfo[] | null,

  clientStatus: 'init' as 'init' | 'waiting' | 'connected',

  apiBaseHttpUrl: '',

  connectorType: ConnectorType.DGLAB as ConnectorType,

  gameStarted: false,

  showConnectionDialog: false,
  showClientInfoDialog: false,
  showLiveCompDialog: false,
  showConfigSavePrompt: false,
  showClientNameDialog: false,
});

const router = useRouter();

const coyoteLocalRef = ref<InstanceType<typeof CoyoteLocalConnectService> | null>(null);

const controllerPageTabs = [
  { title: '强度配置', id: 'strength', icon: 'pi pi-bolt' },
  { title: '波形配置', id: 'pulse', icon: 'pi pi-wave-pulse' },
  { title: '游戏连接', id: 'game', icon: 'pi pi-map' },
] as const;

// === 滑动悬浮指示器（顶栏）===
const barIndX = ref(0)
const barIndW = ref(0)
const barIndVis = ref(false)

const barIndStyle = computed(() => ({
  left: `${barIndX.value}px`,
  width: `${barIndW.value}px`,
  opacity: barIndVis.value ? 1 : 0,
}))

function onBarEnter(e: MouseEvent) {
  const el = e.currentTarget as HTMLElement
  const p = el.parentElement!
  const pr = p.getBoundingClientRect()
  const er = el.getBoundingClientRect()
  const b = parseFloat(getComputedStyle(p).borderLeftWidth) || 0
  barIndX.value = er.left - pr.left - b
  barIndW.value = er.width
  barIndVis.value = true
}

function onBarLeave() {
  barIndVis.value = false
}

// === 滑动悬浮指示器（侧边栏）===
const navIndY = ref(0)
const navIndH = ref(0)
const navIndVis = ref(false)

const navIndStyle = computed(() => ({
  top: `${navIndY.value}px`,
  height: `${navIndH.value}px`,
  opacity: navIndVis.value ? 1 : 0,
}))

function onNavEnter(e: MouseEvent) {
  const el = e.currentTarget as HTMLElement
  const p = el.parentElement!
  const pr = p.getBoundingClientRect()
  const er = el.getBoundingClientRect()
  const b = parseFloat(getComputedStyle(p).borderTopWidth) || 0
  navIndY.value = er.top - pr.top - b
  navIndH.value = er.height
  navIndVis.value = true
}

function onNavLeave() {
  navIndVis.value = false
}

watch(() => state.controllerPage, (newVal) => {
  router.push({ path: newVal });
});

// 在收到服务器的配置后设置为true，防止触发watch
let receivedConfig = false;

let oldGameConfig: MainGameConfig | null = null;
const gameConfig = computed<MainGameConfig>({
  get: () => {
    return {
      fireStrengthLimit: state.fireStrengthLimit,
      strengthChangeInterval: state.randomFreq,
      enableBChannel: state.bChannelEnabled,
      bChannelStrengthMultiplier: state.bChannelMultiple,
      channelAStrengthLimit: state.channelAStrengthLimit,
      channelBStrengthLimit: state.channelBStrengthLimit,
      pulseId: state.selectPulseIds.length === 1 ? state.selectPulseIds[0] : state.selectPulseIds,
      firePulseId: state.firePulseId === '' ? null : state.firePulseId,
      pulseMode: state.pulseMode,
      pulseChangeInterval: state.pulseChangeInterval,
    } as MainGameConfig;
  },
  set: (value) => {
    state.fireStrengthLimit = value.fireStrengthLimit;
    state.randomFreq = value.strengthChangeInterval;
    state.bChannelEnabled = value.enableBChannel;
    state.bChannelMultiple = value.bChannelStrengthMultiplier;
    state.channelAStrengthLimit = value.channelAStrengthLimit ?? null;
    state.channelBStrengthLimit = value.channelBStrengthLimit ?? null;
    state.selectPulseIds = typeof value.pulseId === 'string' ? [value.pulseId] : value.pulseId || [''];
    state.firePulseId = value.firePulseId || '';
    state.pulseMode = value.pulseMode;
    state.pulseChangeInterval = value.pulseChangeInterval;
  }
});

let oldStrengthConfig: GameStrengthConfig | null = null;
const strengthConfig = computed<GameStrengthConfig>({
  get: () => {
    return {
      strength: state.strengthVal,
      randomStrength: state.randomStrengthVal,
    } as GameStrengthConfig;
  },
  set: (value) => {
    state.strengthVal = value.strength;
    state.randomStrengthVal = value.randomStrength;
  }
});

const chartVal = computed(() => ({
  valLow: Math.min(state.strengthVal + state.tempStrength, state.strengthLimit),
  valHigh: Math.min(state.strengthVal + state.tempStrength + state.randomStrengthVal, state.strengthLimit),
  valLimit: state.strengthLimit,
}));

const toast = useToast();
const confirm = useConfirm();

const clientsStore = useClientsStore();
const localConnStore = useCoyoteLocalConnStore();
const remoteNotificationStore = useRemoteNotificationStore();

provide('parentToast', toast);
provide('parentConfirm', confirm);

let serverInfo: ServerInfoResData;
let wsClient: SocketApi;
let dgClientConnected = false;

const initServerInfo = async () => {
  try {
    let serverInfoRes = await webApi.getServerInfo();

    handleApiResponse(serverInfoRes);

    serverInfo = serverInfoRes!;
    state.clientWsUrlList = serverInfo.server.clientWsUrls;
    state.apiBaseHttpUrl = serverInfo.server.apiBaseHttpUrl;
  } catch (error: any) {
    console.error('Cannot get server info:', error);
    toast.add({ severity: 'error', summary: '获取服务器信息失败', detail: error.message });
  }
};

const initWebSocket = async () => {
  if (wsClient) return;

  wsClient = new SocketApi(serverInfo.server.wsUrl);

  wsClient.on('open', () => {
    // 此事件在重连时也会触发
    console.log('WebSocket connected or re-connected');
    if (state.clientId) { // 已有clientId，直接绑定
      bindClient();
    }
  });

  wsClient.on('pulseListUpdated', (data: PulseItemResponse[]) => {
    console.log('Pulse list updated:', data);
    state.pulseList = data;
  });

  wsClient.on('clientConnected', () => {
    console.log('DG-Lab client connected');

    state.showConnectionDialog = false; // 关闭连接对话框
    state.clientStatus = 'connected';
    dgClientConnected = true;

    handleClientConnected();

    toast.add({ severity: 'success', summary: '客户端连接成功', detail: '已连接到客户端', life: 3000 });
  });

  wsClient.on('clientDisconnected', () => {
    console.log('DG-Lab client disconnected');

    state.clientStatus = 'waiting';
    state.gameStarted = false;

    dgClientConnected = false;
  });

  wsClient.on('gameStarted', () => {
    state.gameStarted = true;
  });

  wsClient.on('gameStopped', () => {
    state.gameStarted = false;
  });

  wsClient.on('strengthChanged', (strength) => {
    state.strengthLimit = strength.limit;
    state.tempStrength = strength.tempStrength;
  });

  wsClient.on('strengthConfigUpdated', (config) => {
    if (state.showConfigSavePrompt) {
      // 当前有配置未保存，不更新配置，只替换旧配置
      oldStrengthConfig = config;
    } else {
      // 覆盖本地配置
      strengthConfig.value = config;
      oldStrengthConfig = config;

      // 屏蔽保存提示
      receivedConfig = true;
      nextTick(() => {
        receivedConfig = false;
      });
    }
  });

  wsClient.on('mainGameConfigUpdated', (config) => {
    if (state.showConfigSavePrompt) {
      // 当前有配置未保存，不更新配置，只替换旧配置
      oldGameConfig = config;
    } else {
      // 覆盖本地配置
      gameConfig.value = config;
      oldGameConfig = config;

      // 屏蔽保存提示
      receivedConfig = true;
      nextTick(() => {
        receivedConfig = false;
      });
    }
  });

  wsClient.on('customPulseConfigUpdated', (config) => {
    state.customPulseList = config.customPulseList;
  });

  wsClient.on('remoteNotification', (notification) => {
    if (notification.ignoreId && remoteNotificationStore.isIgnored(notification.ignoreId)) {
      // 已忽略的通知不显示
      return;
    }

    toast.add({
      severity: (notification.severity as unknown as 'success' | 'info' | 'warn' | 'error' | 'secondary' | 'contrast' | undefined) || 'info',
      summary: notification.title || '站点通知',
      detail: {
        type: 'custom',
        ...notification,
      },
      life: notification.sticky ? undefined : 5000,
    });
  });

  wsClient.connect();
};

const initClientConnection = async () => {
  try {
    let res = await webApi.getClientConnectInfo();
    handleApiResponse(res);
    state.clientId = res!.clientId;

    bindClient();
  } catch (error: any) {
    console.error('Cannot get client ws url list:', error);
    toast.add({ severity: 'error', summary: '获取客户端连接地址失败', detail: error.message });
  }
};

const bindClient = async () => {
  if (!state.clientId) return;
  if (!wsClient?.isConnected) return;

  try {
    state.clientStatus = 'waiting';
    let res = await wsClient.bindClient(state.clientId);
    handleApiResponse(res);
  } catch (error: any) {
    console.error('Cannot bind client:', error);
    toast.add({ severity: 'error', summary: '绑定客户端失败', detail: error.message });
  }
};

const handleClientConnected = () => {
  // 蓝牙 / 本地调试模式（存在本地控制器连接）由各自连接流程单独保存设备，
  // 这里不再保存为 DG-Lab 类型，否则会把蓝牙设备错误地存成 DG-Lab 设备
  if (localConnStore.connected) {
    return;
  }
  if (state.clientId) {
    const clientInfo = clientsStore.getClientInfo(state.clientId);
    if (!clientInfo) {
      // 初次连接时保存客户端
      state.newClientName = new Date().toLocaleString() + ' 连接的设备';
      state.showClientNameDialog = true;

    } else {
      // 更新连接时间
      clientsStore.updateClientConnectTime(state.clientId);
    }
  }
};

const handleSaveClientConnect = async (clientName: string) => {
  clientsStore.addClient({
    id: state.clientId,
    name: clientName,
    connectorType: ConnectorType.DGLAB,
  });
};

const showConnectionDialog = () => {
  state.showConnectionDialog = true;

  if (!state.clientId) {
    initClientConnection();
  }
};

const showLiveCompDialog = () => {
  state.showLiveCompDialog = true;

  if (!state.clientId) {
    initClientConnection();
  }
};

const handleResetClientId = () => {
  initClientConnection();
};

const handleConnSetClientId = (clientId: string) => {
  state.clientId = clientId;

  bindClient();

  // 关闭连接对话框
  state.showConnectionDialog = false;
};

const postConfig = async () => {
  try {
    if (simpleObjDiff(oldStrengthConfig, strengthConfig.value)) {
      let res = await wsClient.updateStrengthConfig(strengthConfig.value);
      handleApiResponse(res);
      oldStrengthConfig = strengthConfig.value;
    }

    if (simpleObjDiff(oldGameConfig, gameConfig.value)) {
      let res = await wsClient.updateConfig(GameConfigType.MainGame, gameConfig.value);
      handleApiResponse(res);
      oldGameConfig = gameConfig.value;
    }

    toast.add({ severity: 'success', summary: '保存成功', detail: '游戏配置已保存', life: 3000 });
  } catch (error: any) {
    console.error('Cannot post config:', error);
  }
};

const postCustomPulseConfig = async () => {
  try {
    let res = await wsClient.updateConfig(GameConfigType.CustomPulse, {
      customPulseList: state.customPulseList,
    });
    handleApiResponse(res);
  } catch (error: any) {
    console.error('Cannot post custom pulse config:', error);
  }
};
provide('postCustomPulseConfig', postCustomPulseConfig);

const handleStartGame = async () => {
  if (!dgClientConnected) {
    toast.add({ severity: 'warn', summary: '未连接到客户端', detail: '启动输出需要先连接到客户端', life: 5000 });
    return;
  }

  try {
    let res = await wsClient.startGame();
    handleApiResponse(res);
  } catch (error: any) {
    console.error('Cannot start game:', error);
  }
};

const handleStopGame = async () => {
  if (!dgClientConnected) {
    toast.add({ severity: 'warn', summary: '未连接到客户端', detail: '暂停输出需要先连接到客户端', life: 5000 });
    return;
  }

  try {
    let res = await wsClient.stopGame();
    handleApiResponse(res);
  } catch (error: any) {
    console.error('Cannot pause game:', error);
  }
};

const handleSaveConfig = () => {
  postConfig();
  state.showConfigSavePrompt = false;
};

const handleCancelSaveConfig = () => {
  if (oldGameConfig) {
    gameConfig.value = oldGameConfig;
  }
  if (oldStrengthConfig) {
    strengthConfig.value = oldStrengthConfig;
  }

  state.showConfigSavePrompt = false;

  receivedConfig = true;
  nextTick(() => {
    receivedConfig = false;
  });
};

const handleStartBluetoothConnect = (deviceVersion: CoyoteDeviceVersion) => {
  coyoteLocalRef.value?.startBluetoothConnect(deviceVersion);
};

const handleStartDebugConnect = () => {
  coyoteLocalRef.value?.startLocalDebugConnect();
};

onMounted(async () => {
  await initServerInfo();
  await initWebSocket();
});

watch(() => state.pulseMode, (newVal) => {
  if (newVal === 'single' && state.selectPulseIds.length > 1) { // 单波形模式下只保留第一个波形
    state.selectPulseIds = [state.selectPulseIds[0]];
  }
});

watch([gameConfig, strengthConfig], () => {
  if (receivedConfig) { // 收到服务器配置后不触发保存提示
    receivedConfig = false;
    return;
  }

  state.showConfigSavePrompt = true; // 显示保存提示
}, { deep: true });
</script>

<template>
  <div class="w-full page-container">
    <Toast>
      <template #container="{ message, closeCallback }">
        <CustomToastContent :message="message" :close-callback="closeCallback" />
      </template>
    </Toast>
    <ConfirmDialog></ConfirmDialog>
    <CoyoteLocalConnectService :state="state" ref="coyoteLocalRef"></CoyoteLocalConnectService>
    <div class="top-bar enter-fade-up" style="--stagger-i: 0;">
      <div class="bar-capsule glass bar-group" @mouseleave="onBarLeave">
        <div class="bar-indicator" :style="barIndStyle"></div>
        <button class="bar-item" v-if="state.clientStatus !== 'connected'"
          @click="showConnectionDialog()" title="连接设备" @mouseenter="onBarEnter">
          <i class="pi pi-qrcode bar-icon"></i>
          <span class="bar-label">连接设备</span>
        </button>
        <button class="bar-item" v-else
          @click="state.showClientInfoDialog = true" title="连接信息" @mouseenter="onBarEnter">
          <i class="pi pi-info-circle bar-icon"></i>
          <span class="bar-label">连接信息</span>
        </button>
        <button class="bar-item" @click="showLiveCompDialog()" title="添加到OBS" @mouseenter="onBarEnter">
          <i class="pi pi-file-export bar-icon"></i>
          <span class="bar-label">添加到OBS</span>
        </button>
        <button class="bar-item" v-if="!state.gameStarted" @click="handleStartGame()" title="启动输出" @mouseenter="onBarEnter">
          <i class="pi pi-play bar-icon"></i>
          <span class="bar-label">启动输出</span>
        </button>
        <button class="bar-item" v-else @click="handleStopGame()" title="暂停输出" @mouseenter="onBarEnter">
          <i class="pi pi-pause bar-icon"></i>
          <span class="bar-label">暂停输出</span>
        </button>
      </div>
    </div>

    <div class="flex flex-col lg:flex-row items-start gap-6 controller-body">
      <div class="left-column enter-fade-up" style="--stagger-i: 1;">
        <div class="chart-icon">
          <StatusChart v-model:val-low="chartVal.valLow" v-model:val-high="chartVal.valHigh"
            :val-limit="chartVal.valLimit" :running="state.gameStarted" readonly />
        </div>
        <div class="nav-capsule glass" @mouseleave="onNavLeave">
          <div class="nav-indicator" :style="navIndStyle"></div>
          <button v-for="tab in controllerPageTabs" :key="tab.id" type="button"
            class="nav-item" :class="{ active: state.controllerPage === tab.id }"
            @click="state.controllerPage = tab.id"
            @mouseenter="onNavEnter">
            <i class="nav-icon" :class="tab.icon"></i>
            <span class="nav-label">{{ tab.title }}</span>
          </button>
        </div>
      </div>

      <div class="controller-panel right-panel glass flex-grow-1 flex-shrink-1 w-full enter-fade-up"
        style="--stagger-i: 2;">
        <RouterView>
          <template #default="{ Component }">
            <FadeAndSlideTransitionGroup>
              <component :is="Component" :state="state" />
            </FadeAndSlideTransitionGroup>
          </template>
        </RouterView>
      </div>
    </div>

    <ConnectToClientDialog v-model:visible="state.showConnectionDialog" :clientWsUrlList="state.clientWsUrlList"
      :client-id="state.clientId" @reset-client-id="handleResetClientId" @update:client-id="handleConnSetClientId"
      @start-bluetooth-connect="handleStartBluetoothConnect"
      @start-debug-connect="handleStartDebugConnect" />
    <ClientInfoDialog v-model:visible="state.showClientInfoDialog" :client-id="state.clientId"
      :controller-url="state.apiBaseHttpUrl" :connector-type="state.connectorType" />
    <GetLiveCompDialog v-model:visible="state.showLiveCompDialog" :client-id="state.clientId" />
    <ConfigSavePrompt :visible="state.showConfigSavePrompt" @save="handleSaveConfig" @cancel="handleCancelSaveConfig" />
    <PromptDialog v-model:visible="state.showClientNameDialog" title="保存客户端" message="将此设备保存到本地，以便于下次连接。波形列表将跟随设备保存。"
      input-label="客户端备注名" :default-value="state.newClientName" :allow-empty="false"
      @confirm="handleSaveClientConnect" />
  </div>
</template>

<style lang="scss">
$container-max-widths: (
  md: 768px,
  lg: 960px,
  xl: 1100px,
);

.popover-pulseTime::before,
.popover-pulseTime::after {
  display: none;
}

.page-container {
  margin-top: 2rem;
  margin-bottom: 6rem; // 为底部toast留出空间
  margin-left: auto;
  margin-right: auto;
  padding: 0 1rem;
  width: 100%;
}

@media (min-width: 768px) {
  .page-container {
    max-width: map-get($container-max-widths, lg);
  }
}

@media (min-width: 1024px) {
  .page-container {
    max-width: map-get($container-max-widths, xl);
  }
}

// 顶栏：居中
.top-bar {
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 0.5rem 0.25rem;
}

.controller-body {
  margin-top: 1.25rem;
}

// 左栏：圆环图标 + 胶囊导航
.left-column {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 1rem;
  width: 11rem;
  flex-shrink: 0;
}

.chart-icon {
  display: flex;
  justify-content: center;
}

// 圆环缩成图标 + 玻璃化（高特异性覆盖 Circle1 的 scoped 样式）
.left-column .chart-icon .progress {
  width: 9rem;
  height: 9rem;
  --progress-font-size: 0.8rem;
  background: var(--glass-bg);
  border: 1px solid var(--glass-border);
  -webkit-backdrop-filter: blur(var(--glass-blur)) saturate(var(--glass-saturate));
  backdrop-filter: blur(var(--glass-blur)) saturate(var(--glass-saturate));
  box-shadow: var(--glass-shadow);
}

.left-column .chart-icon .progress .strength-num {
  min-width: 1.2rem;
  padding: 0 0.2rem;
}

.left-column .chart-icon .progress .progress__icon .icon {
  width: 1.4rem !important;
  height: 1.4rem !important;
}

// 胶囊导航：默认窄（仅图标），悬浮整体展开（图标+文字滑入）
.nav-capsule {
  display: flex;
  flex-direction: column;
  gap: 0.25rem;
  padding: 0.5rem;
  width: 4rem;
  border-radius: var(--glass-radius);
  overflow: hidden;
  transition: width 380ms var(--ease-smooth);
}

.nav-capsule:hover {
  width: 10.5rem;
}

.nav-indicator {
  position: absolute;
  top: 0.5rem;
  left: 0.5rem;
  width: calc(100% - 1rem);
  border-radius: 9999px;
  background: rgba(127, 127, 127, 0.18);
  pointer-events: none;
  transition: top 200ms var(--ease-smooth), height 200ms var(--ease-smooth), opacity 180ms var(--ease-smooth);
  z-index: 0;
}

.nav-item {
  position: relative;
  z-index: 1;
  display: flex;
  align-items: center;
  gap: 0.85rem;
  padding: 0.65rem 0.85rem;
  border: none;
  border-radius: 9999px;
  background: transparent;
  color: inherit;
  cursor: pointer;
  font: inherit;
  text-align: left;
  transition: color 200ms var(--ease-smooth);
}

.nav-item.active {
  background: var(--p-primary-color);
  color: var(--p-primary-contrast-color);
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.12);
}

.nav-icon {
  font-size: 1.15rem;
  flex-shrink: 0;
}

.nav-label {
  opacity: 0;
  transform: translateX(-0.4rem);
  white-space: nowrap;
  transition: opacity 220ms var(--ease-smooth), transform 320ms var(--ease-smooth);
}

.nav-capsule:hover .nav-label {
  opacity: 1;
  transform: translateX(0);
  transition-delay: 90ms;
}

// ===== 顶栏玻璃胶囊（同 nav-capsule 动画模式，水平排列）=====
.bar-capsule {
  display: flex;
  align-items: center;
  justify-content: space-evenly;
  padding: 0.35rem;
  border-radius: var(--glass-radius);
  overflow: hidden;
  transition: width 420ms var(--ease-smooth);
  white-space: nowrap;
  contain: layout style paint;
}

.bar-indicator {
  position: absolute;
  top: 0.35rem;
  left: 0;
  height: calc(100% - 0.7rem);
  border-radius: 9999px;
  background: rgba(127, 127, 127, 0.18);
  pointer-events: none;
  transition: left 200ms var(--ease-smooth), width 200ms var(--ease-smooth), opacity 180ms var(--ease-smooth);
  z-index: 0;
}

.bar-item {
  position: relative;
  z-index: 1;
  display: flex;
  align-items: center;
  gap: 0;
  padding: 0.45rem 0.4rem;
  border: none;
  border-radius: 9999px;
  background: transparent;
  color: inherit;
  cursor: pointer;
  font: inherit;
  flex-shrink: 0;
}

.bar-icon {
  font-size: 1.1rem;
  flex-shrink: 0;
}

.bar-label {
  max-width: 0;
  overflow: hidden;
  opacity: 0;
  transform: translateX(-0.4rem);
  white-space: nowrap;
  transition: opacity 220ms var(--ease-smooth), transform 320ms var(--ease-smooth), max-width 340ms var(--ease-smooth);
}

.bar-capsule:hover .bar-label {
  max-width: 15rem;
  opacity: 1;
  transform: translateX(0);
  transition-delay: 90ms;
}

.bar-group { width: 9rem; }
.bar-group:hover { width: 26rem; }

// 右栏：板块内容玻璃卡片（材质由 .glass 类提供）
.controller-panel {
  border-radius: var(--glass-radius);
  padding: 1.5rem;

  .input-small {
    height: 32px;
    --p-inputtext-padding-y: 0.25rem;
  }

  .input-text-center input {
    text-align: center;
  }
}
</style>
