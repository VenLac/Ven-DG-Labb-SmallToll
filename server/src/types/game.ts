import { z } from 'koa-swagger-decorator';

export enum GameConfigType {
    MainGame = 'main-game',
    CustomPulse = 'custom-pulse',
}

export const PulsePlayModeSchema = z.enum(['single', 'sequence', 'random'])
export type PulsePlayMode = z.infer<typeof PulsePlayModeSchema>;

export const GameStrengthConfigSchema = z.object({
    strength: z.number().int().min(0).max(100).describe('基础强度'),
    randomStrength: z.number().int().min(0).max(100).describe('随机强度'),
}).describe('强度配置');
export type GameStrengthConfig = z.infer<typeof GameStrengthConfigSchema>;

export const MainGameConfigSchema = z.object({
    fireStrengthLimit: z.number().int().min(1).default(30)
        .describe('一键开火强度限制，默认30'),
    strengthChangeInterval: z.tuple([z.number().int().min(10), z.number().int().min(30)])
        .describe('强度变化间隔，单位秒'),
    enableBChannel: z.boolean().default(false).describe('是否启用B通道'),
    bChannelStrengthMultiplier: z.number().int().min(1).default(1)
        .describe('B通道相对于A通道的强度倍率，默认1'),
    channelAStrengthLimit: z.number().int().min(0).max(200).nullable().default(null)
        .describe('A通道最大电量，null表示不限（跟随设备硬件上限）'),
    channelBStrengthLimit: z.number().int().min(0).max(200).nullable().default(null)
        .describe('B通道最大电量，null表示不限（跟随设备硬件上限）'),
    pulseId: z.union([z.string(), z.array(z.string())])
        .describe('波形ID或ID列表'),
    firePulseId: z.string().optional().nullable()
        .describe('一键开火波形ID，如果不设置则使用当前波形'),
    pulseMode: PulsePlayModeSchema.default('single')
        .describe('波形播放模式'),
    pulseChangeInterval: z.number().int().min(1).default(60)
        .describe('波形切换间隔，单位秒'),
}).describe('游戏主配置');
export type MainGameConfig = z.infer<typeof MainGameConfigSchema>;

export const GameConnectionConfigSchema = z.object({
    connectCodeList: z.array(z.string()).describe('游戏链接码列表'),
}).describe('游戏连接配置');
export type GameConnectionConfig = z.infer<typeof GameConnectionConfigSchema>;

export const PulseDataSchema = z.object({
    id: z.string().describe('波形ID'),
    name: z.string().describe('波形名称'),
    pulseData: z.array(z.string()).describe('波形数据'),
}).describe('波形数据');
export type PulseData = z.infer<typeof PulseDataSchema>;

export const GameCustomPulseConfigSchema = z.object({
    customPulseList: z.array(PulseDataSchema).describe('自定义波形列表'),
}).describe('游戏自定义波形配置');

export const MCPunishmentModeSchema = z.enum(['normal', 'ultra']);
export type MCPunishmentMode = z.infer<typeof MCPunishmentModeSchema>;

export const MCPunishmentConfigSchema = z.object({
    baseStrength: z.number().int().min(0).max(200).default(20)
        .describe('MC 受伤惩罚基础强度，惩罚结束后回到此强度'),
    punishRate: z.number().int().min(0).max(50).default(5)
        .describe('惩罚倍数，每点伤害提升的强度'),
    punishTime: z.number().int().min(1).max(60).default(3)
        .describe('惩罚持续时间，单位秒'),
    maxStrength: z.number().int().min(1).max(200).default(100)
        .describe('惩罚强度上限，仍会被通道/设备上限二次钳制'),
    mode: MCPunishmentModeSchema.default('normal')
        .describe('normal：惩罚期间忽略新伤害；ultra：叠加并重置时间'),
    minDamage: z.number().int().min(0).default(1)
        .describe('触发惩罚的最小伤害阈值，低于此值的伤害被忽略'),
}).describe('MC 受伤惩罚配置');
export type MCPunishmentConfig = z.infer<typeof MCPunishmentConfigSchema>;
export type GameCustomPulseConfig = z.infer<typeof GameCustomPulseConfigSchema>;
