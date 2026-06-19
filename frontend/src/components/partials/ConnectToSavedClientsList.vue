<script lang="ts" setup>
import Tag from 'primevue/tag';
import { useClientsStore, ClientInfo } from '../../stores/ClientsStore';
import { ConnectorType, CoyoteDeviceVersion } from '../../type/common';

defineOptions({
  name: 'ConnectToSavedClientsList',
});

const clientsStore = useClientsStore();

const emit = defineEmits<{
  connectToClient: [clientId: string];
  connectBluetooth: [version: CoyoteDeviceVersion];
}>();

const sortedClientList = computed(() => {
  return clientsStore.clientList.slice().sort((a, b) => b.lastConnectTime - a.lastConnectTime);
});

const isBluetooth = (item: ClientInfo) => {
  const type = item.connectorType ?? ConnectorType.DGLAB;
  return type === ConnectorType.COYOTE_BLE_V2 || type === ConnectorType.COYOTE_BLE_V3;
};

const typeTag = (item: ClientInfo) => {
  if (isBluetooth(item)) {
    return {
      value: item.deviceVersion === CoyoteDeviceVersion.V2 ? '蓝牙 2.0' : '蓝牙 3.0',
      severity: 'info' as const,
    };
  }
  return { value: 'DG-Lab', severity: 'secondary' as const };
};

// 按连接类型分发：蓝牙直接弹出对应版本配对窗，DG-Lab 走客户端ID重连
const handleConnect = (item: ClientInfo) => {
  if (isBluetooth(item)) {
    emit('connectBluetooth', item.deviceVersion ?? CoyoteDeviceVersion.V3);
  } else {
    emit('connectToClient', item.id);
  }
};

// 删除已保存的设备
const handleRemove = (item: ClientInfo) => {
  if (confirm(`确定要删除设备「${item.name}」吗？`)) {
    clientsStore.removeClient(item.id);
  }
};
</script>

<template>
  <DataView class="clientsList-container" :value="sortedClientList">
    <template #list="slotProps">
      <TransitionGroup name="list-pop" tag="div" appear class="flex flex-col">
        <div v-for="(item, index) in slotProps.items" :key="item.id" :style="{ '--stagger-i': index }">
          <Card class="clientCard m-1">
            <template #content>
              <div class="flex flex-col sm:flex-row sm:items-center gap-4">
                <div class="client-icon flex-shrink-0 flex items-center justify-center">
                  <i :class="isBluetooth(item) ? 'pi pi-mobile' : 'pi pi-cloud'"></i>
                </div>
                <div class="flex flex-col md:flex-row justify-between md:items-center flex-1 gap-6">
                  <div class="flex flex-row md:flex-col justify-between items-start gap-2">
                    <div>
                      <div class="text-lg font-medium flex items-center gap-2">
                        {{ item.name }}
                        <Tag :value="typeTag(item).value" :severity="typeTag(item).severity" />
                      </div>
                      <span v-if="!isBluetooth(item)" class="font-medium text-surface-500 dark:text-surface-400 text-sm">ID: {{ item.id }}</span>
                    </div>
                  </div>
                  <div class="flex flex-col md:items-end gap-8">
                    <div class="flex gap-2">
                      <Button icon="pi pi-play" :label="isBluetooth(item) ? '重新配对' : '继续'" class="whitespace-nowrap"
                        @click="handleConnect(item)"></Button>
                      <Button icon="pi pi-trash" severity="danger" outlined aria-label="删除设备"
                        @click="handleRemove(item)"></Button>
                    </div>
                  </div>
                </div>
              </div>
            </template>
          </Card>
        </div>
      </TransitionGroup>
    </template>
  </DataView>
</template>

<style scoped>
.clientsList-container {
  --p-dataview-content-background: var(--p-surface-50);

  @media (prefers-color-scheme: dark) {
    --p-dataview-content-background: var(--p-surface-950);
  }

  max-height: 18rem;
  overflow-y: auto;
  scrollbar-width: thin;
  scrollbar-color: var(--scrollbar-thumb) transparent;

  &::-webkit-scrollbar {
    width: 6px;
  }

  &::-webkit-scrollbar-track {
    background: transparent;
  }

  &::-webkit-scrollbar-thumb {
    background: var(--scrollbar-thumb);
    border-radius: 9999px;
  }

  &::-webkit-scrollbar-thumb:hover {
    background: var(--scrollbar-thumb-hover);
  }
}

.clientCard {
  --p-card-body-padding: 1rem;
}

.client-icon {
  background-color: var(--p-primary-color);
  color: var(--p-primary-contrast-color);
  border-radius: 9999px;
  width: 2.5rem;
  height: 2.5rem;
}
</style>
