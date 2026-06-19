import { AbstractGameAction } from "./AbstractGameAction.js";

export type GameMCDamageActionConfig = {
    /** 惩罚模式：normal 忽略期间新伤害，ultra 叠加并重置时间 */
    mode: 'normal' | 'ultra';
    /** 基础强度，惩罚结束后回到此强度 */
    baseStrength: number;
    /** 本次伤害的强度增量（damage × punishRate） */
    strengthAddend: number;
    /** 惩罚强度上限，最终仍被通道/设备上限二次钳制 */
    maxStrength: number;
    /** 惩罚持续时间（毫秒） */
    punishTime: number;
};

/** 单次惩罚最长持续 5 分钟，与一键开火上限对齐 */
export const MC_PUNISH_MAX_TIME = 300000;
/** 单次 outputPulse 最长 30 秒，超过则由游戏主循环续接 */
export const MC_PUNISH_OUTPUT_MAX_MS = 30000;
/** MC 惩罚动作优先级，高于一键开火(0)，确保惩罚期间抢占输出 */
export const MC_PUNISH_ACTION_PRIORITY = 10;

/**
 * MC 受伤惩罚动作。
 *
 * 强度模型：绝对强度 = baseStrength + 累计增量，钳制到 maxStrength 与设备通道上限。
 * 利用 startAction 的「同类型 action 走 updateConfig 复用」语义：
 * - normal 模式：updateConfig 直接返回 → 惩罚期间忽略新伤害，时间不重置。
 * - ultra 模式：updateConfig 累加增量并重置结束时间 → 叠加惩罚。
 */
export class GameMCDamageAction extends AbstractGameAction<GameMCDamageActionConfig> {
    public static readonly actionId = "mc-damage";
    public static readonly actionName = "MC 受伤惩罚";

    private accumulatedAddend = 0;
    private punishEndTimestamp = 0;
    private punishPulseId = '';

    constructor(config: GameMCDamageActionConfig, priority: number = MC_PUNISH_ACTION_PRIORITY) {
        super(config, priority);
    }

    initialize() {
        this.accumulatedAddend = this.config.strengthAddend;
        this.punishEndTimestamp = Date.now() + Math.min(this.config.punishTime, MC_PUNISH_MAX_TIME);
        this.punishPulseId = this.game.gameConfig.firePulseId || this.game.pulsePlayList.getCurrentPulseId();
        this.applyPunishStrength();
    }

    private get targetStrength(): number {
        const raw = this.config.baseStrength + this.accumulatedAddend;
        return Math.min(raw, this.config.maxStrength);
    }

    private applyPunishStrength(): void {
        const clamped = Math.min(this.targetStrength, this.game.effectiveChannelALimit);
        this.game.tempStrength = Math.max(0, clamped - this.config.baseStrength);
        this.game.setClientStrength(clamped).catch((error) => {
            console.error('Failed to apply MC punish strength:', error);
        });
    }

    async execute(ab: AbortController, harvest: () => void, done: () => void): Promise<void> {
        const remainMs = this.punishEndTimestamp - Date.now();
        if (remainMs <= 0) {
            this.finishPunish(done);
            return;
        }

        const outputTime = Math.min(remainMs, MC_PUNISH_OUTPUT_MAX_MS);
        await this.game.client?.outputPulse(this.punishPulseId, outputTime, {
            abortController: ab,
            bChannel: this.game.gameConfig.enableBChannel,
        });

        if (Date.now() >= this.punishEndTimestamp) {
            this.finishPunish(done);
        }
    }

    private finishPunish(done: () => void): void {
        this.game.tempStrength = 0;
        const base = Math.min(this.config.baseStrength, this.game.effectiveChannelALimit);
        this.game.setClientStrength(base).catch((error) => {
            console.error('Failed to restore base strength:', error);
        });
        done();
    }

    updateConfig(config: GameMCDamageActionConfig): void {
        if (config.mode !== 'ultra') {
            return; // normal 模式：惩罚期间忽略新伤害，时间与强度均不重置
        }

        // ultra 模式：累计增量并重置结束时间
        this.config = config;
        this.accumulatedAddend += config.strengthAddend;
        this.punishEndTimestamp = Date.now() + Math.min(config.punishTime, MC_PUNISH_MAX_TIME);
        this.applyPunishStrength();
    }
}
