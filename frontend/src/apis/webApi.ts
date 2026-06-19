import { ChartParamDef } from "../charts/types/ChartParamDef";

export type ServerInfoResData = {
    server: {
        wsUrl: string,
        clientWsUrls: ClientConnectUrlInfo[],
        apiBaseHttpUrl: string,
    },
};

export type ClientConnectUrlInfo = {
    domain: string;
    connectUrl: string;
};

export type ClientConnectInfoResData = {
    clientId: string,
};

export type CustomSkinInfo = {
    name: string;
    url: string;
    help?: string;
    params?: ChartParamDef[];
};

export type CustomSkinsResData = {
    customSkins: CustomSkinInfo[],
};

export type ApiResponse<T> = {
    status: number,
    message?: string,
} & T;

export type MCPunishmentConfig = {
    baseStrength: number;
    punishRate: number;
    punishTime: number;
    maxStrength: number;
    mode: 'normal' | 'ultra';
    minDamage: number;
};

export type ModuleActionResponse = {
    successClientIds?: string[];
    warnings?: { code: string; message: string }[];
};

async function postJson<T>(url: string, body: unknown): Promise<T | null> {
    try {
        const response = await fetch(url, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(body),
        });
        return response.json();
    } catch (error) {
        console.error(`Failed to POST ${url}:`, error);
        return null;
    }
}

async function getJson<T>(url: string, errorMsg: string): Promise<T | null> {
    try {
        const response = await fetch(url);
        return response.json();
    } catch (error) {
        console.error(errorMsg, error);
        return null;
    }
}

export const webApi = {
    getServerInfo: async (): Promise<ApiResponse<ServerInfoResData> | null> => {
        try {
            const response = await fetch('/api/server_info');
            return response.json();
        }
        catch (error) {
            console.error('Failed to get server info:', error);
            return null;
        }
    },
    getClientConnectInfo: async (): Promise<ApiResponse<ClientConnectInfoResData> | null> => {
        try {
            const response = await fetch('/api/client/connect');
            return response.json();
        }
        catch (error) {
            console.error('Failed to get client connect info:', error);
            return null;
        }
    },

    // ===== MC 受伤惩罚模块 =====
    getMCPunishmentConfig: async (clientId: string): Promise<ApiResponse<{ config: MCPunishmentConfig }> | null> => {
        return getJson(`/api/v2/game/${clientId}/module/mc/config`, 'Failed to get MC punishment config:');
    },

    setMCPunishmentConfig: async (clientId: string, config: Partial<MCPunishmentConfig>): Promise<ApiResponse<ModuleActionResponse> | null> => {
        return postJson(`/api/v2/game/${clientId}/module/mc/config`, config);
    },

    reportMCDamage: async (clientId: string, damage: number): Promise<ApiResponse<ModuleActionResponse> | null> => {
        return postJson(`/api/v2/game/${clientId}/module/mc/damage`, { damage });
    },
};