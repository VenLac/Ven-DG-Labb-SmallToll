import { MCPunishmentConfig } from "#app/types/game.js";
import { AfterUpdate, Column, DataSource, Entity, PrimaryColumn } from "typeorm";
import { ExEventEmitter } from "#app/utils/ExEventEmitter.js";

export interface MCPunishmentModelEvents {
    configUpdated: [newConfig: MCPunishmentModel];
}

/**
 * MC 受伤惩罚配置（per-clientId 持久化）。
 * 复用 GameModel 的事件链路模式：@AfterUpdate 触发 configUpdated，
 * CoyoteGameController 订阅后同步到内存 mcConfig。
 */
@Entity({ name: 'mc_punishment' })
export class MCPunishmentModel implements MCPunishmentConfig {
    public static events = new ExEventEmitter<MCPunishmentModelEvents>();

    @PrimaryColumn({ type: 'varchar', name: 'game_id', length: 64, comment: '游戏ID（clientId）' })
    gameId!: string;

    @Column({ type: 'int', name: 'base_strength', default: 20, comment: '基础强度' })
    baseStrength!: number;

    @Column({ type: 'int', name: 'punish_rate', default: 5, comment: '惩罚倍数' })
    punishRate!: number;

    @Column({ type: 'int', name: 'punish_time', default: 3, comment: '惩罚持续时间（秒）' })
    punishTime!: number;

    @Column({ type: 'int', name: 'max_strength', default: 100, comment: '惩罚强度上限' })
    maxStrength!: number;

    @Column({ type: 'simple-enum', name: 'mode', enum: ['normal', 'ultra'], default: 'normal', comment: '惩罚模式' })
    mode!: 'normal' | 'ultra';

    @Column({ type: 'int', name: 'min_damage', default: 1, comment: '最小伤害阈值' })
    minDamage!: number;

    @AfterUpdate()
    public async handleAfterUpdate() {
        MCPunishmentModel.events.emitSub('configUpdated', this.gameId, this);
    }

    public static getDefaultConfig(gameId: string): MCPunishmentModel {
        const model = new MCPunishmentModel();
        model.gameId = gameId;
        model.baseStrength = 20;
        model.punishRate = 5;
        model.punishTime = 3;
        model.maxStrength = 100;
        model.mode = 'normal';
        model.minDamage = 1;
        return model;
    }

    public static async getByGameId(db: DataSource, gameId: string): Promise<MCPunishmentModel | null> {
        const repo = db.getRepository(MCPunishmentModel);
        return await repo.findOneBy({ gameId });
    }

    public static async getOrCreateByGameId(db: DataSource, gameId: string): Promise<MCPunishmentModel> {
        const repo = db.getRepository(MCPunishmentModel);
        let config = await repo.findOneBy({ gameId });
        if (!config) {
            config = MCPunishmentModel.getDefaultConfig(gameId);
            config = await repo.save(config);
        }
        return config;
    }

    public static async update(db: DataSource, gameId: string, data: Partial<MCPunishmentConfig>): Promise<MCPunishmentModel | null> {
        const repo = db.getRepository(MCPunishmentModel);
        let config = await MCPunishmentModel.getByGameId(db, gameId);
        if (!config) {
            return null;
        }

        Object.assign(config, data);
        return await repo.save(config);
    }
}
