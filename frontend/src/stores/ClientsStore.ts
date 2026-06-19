import { defineStore } from 'pinia'
import { ConnectorType, CoyoteDeviceVersion } from '../type/common';

export interface ClientInfo {
    id: string;
    name: string;
    lastConnectTime: number;
    connectorType: ConnectorType;
    deviceVersion?: CoyoteDeviceVersion;
}

export const useClientsStore = defineStore('clients', {
    state: () => ({
        clientList: [] as ClientInfo[]
    }),
    actions: {
        addClient(client: Omit<ClientInfo, 'lastConnectTime'>) {
            const existing = this.clientList.find(c => c.id === client.id);
            if (existing) {
                existing.name = client.name;
                existing.connectorType = client.connectorType;
                existing.deviceVersion = client.deviceVersion;
                existing.lastConnectTime = Date.now();
                return;
            }
            this.clientList.push({ ...client, lastConnectTime: Date.now() });
        },
        getClientInfo(id: string) {
            return this.clientList.find(c => c.id === id);
        },
        updateClientName(id: string, name: string) {
            const client = this.clientList.find(c => c.id === id);
            if (client) {
                client.name = name;
            }
        },
        updateClientConnectTime(id: string) {
            const client = this.clientList.find(c => c.id === id);
            if (client) {
                client.lastConnectTime = Date.now();
            }
        },
        removeClient(id: string) {
            const index = this.clientList.findIndex(c => c.id === id);
            if (index >= 0) {
                this.clientList.splice(index, 1);
            }
        },
    },
    persist: {
        key: 'CGH_Clients'
    }
});
