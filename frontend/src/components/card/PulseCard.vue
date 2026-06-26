<script lang="ts" setup>
import FireIcon from '../../assets/fire-white.svg';
import Button from 'primevue/button';
import Menu from 'primevue/menu';
import { generatePulseSVG, parseCoyotePulseHex, PULSE_MIN_WIDTH } from '../../utils/coyotePulse';

defineOptions({
    name: 'PulseCard',
});

const pulseColorLightMode = '#64748b';
const pulseColorDarkMode = '#d4d4d8';

const props = defineProps<{
    pulseInfo: any;
    isCurrentPulse: boolean;
    isFirePulse: boolean;
}>();

const emit = defineEmits<{
    setCurrentPulse: [pulseId: string];
    setFirePulse: [pulseId: string];
    renamePulse: [pulseId: string];
    deletePulse: [pulseId: string];
}>();

const menu = ref<InstanceType<typeof Menu> | null>(null);

const showMenu = (event: Event) => {
    menu.value?.toggle(event);
};

const setCurrentPulse = () => {
    const pulseId = props.pulseInfo?.id ?? '';
    emit('setCurrentPulse', pulseId);
};

const setFirePulse = () => {
    const pulseId = props.pulseInfo?.id ?? '';
    emit('setFirePulse', pulseId);
};

const renamePulse = () => {
    const pulseId = props.pulseInfo?.id ?? '';
    emit('renamePulse', pulseId);
};

const deletePulse = () => {
    const pulseId = props.pulseInfo?.id ?? '';
    emit('deletePulse', pulseId);
};

const CARD_MIN_HEIGHT_PX = 128;
const WAVEFORM_HEIGHT_RATIO = 0.6;
const SVG_NATURAL_HEIGHT = 260;
const SCALE_FACTOR = (CARD_MIN_HEIGHT_PX * WAVEFORM_HEIGHT_RATIO) / SVG_NATURAL_HEIGHT;

let prevUrls: string[] = [];

function makeSvgUrl(svg: string, color: string): string {
    const colored = svg.replace(/currentColor/g, color);
    const blob = new Blob([colored], { type: 'image/svg+xml' });
    const url = URL.createObjectURL(blob);
    prevUrls.push(url);
    return url;
}

const cardStyles = computed(() => {
    prevUrls.forEach(u => URL.revokeObjectURL(u));
    prevUrls = [];

    if (props.pulseInfo?.pulseData) {
        const pulseData = parseCoyotePulseHex(props.pulseInfo.pulseData);
        const naturalWidth = pulseData.frequency.length * 10;

        const staticSvg = generatePulseSVG(pulseData, PULSE_MIN_WIDTH);
        const fullSvg = naturalWidth <= PULSE_MIN_WIDTH
            ? generatePulseSVG(pulseData, PULSE_MIN_WIDTH)
            : generatePulseSVG(pulseData);

        const staticLightUrl = makeSvgUrl(staticSvg, pulseColorLightMode);
        const staticDarkUrl = makeSvgUrl(staticSvg, pulseColorDarkMode);
        const fullLightUrl = makeSvgUrl(fullSvg, pulseColorLightMode);
        const fullDarkUrl = makeSvgUrl(fullSvg, pulseColorDarkMode);

        const fullSvgWidth = Math.max(naturalWidth, PULSE_MIN_WIDTH);
        const scrollDistance = Math.round(fullSvgWidth * SCALE_FACTOR);
        const scrollDuration = Math.max(8, fullSvgWidth / 40);

        return {
            '--light-pulse-background': `url(${staticLightUrl})`,
            '--dark-pulse-background': `url(${staticDarkUrl})`,
            '--full-light-pulse-background': `url(${fullLightUrl})`,
            '--full-dark-pulse-background': `url(${fullDarkUrl})`,
            '--pulse-scroll-distance': `${scrollDistance}px`,
            '--pulse-scroll-duration': `${scrollDuration}s`,
        };
    } else {
        return {};
    }
});

const moreOptions = computed<any[]>(() => {
    let options: any[] = [
        {
            label: props.isFirePulse ? '开火默认波形' : '设为开火默认波形',
            icon: props.isFirePulse ? 'pi pi-check-circle' : 'pi pi-circle',
            command: () => {
                setFirePulse();
            },
        },
    ];

    if (props.pulseInfo.isCustom) {
        options.push({
            label: '重命名',
            icon: 'pi pi-pencil',
            command: () => {
                renamePulse();
            },
        });

        options.push({
            label: '删除',
            icon: 'pi pi-trash',
            command: () => {
                deletePulse();
            },
        });
    }

    return options;
});

onBeforeUnmount(() => {
    prevUrls.forEach(u => URL.revokeObjectURL(u));
    prevUrls = [];
});
</script>

<template>
    <Card class="pulse-card" :style="cardStyles">
        <template #content>
            <div class="flex flex-col w-full h-full relative" style="z-index: 1;">
                <div class="flex w-full justify-between items-center">
                    <div class="flex h-full gap-1 items-center flex-grow checkable" @click="setCurrentPulse()">
                        <div class="pulse-name font-semibold px-2">
                            <span>{{ props.pulseInfo.name }}</span>
                        </div>
                        <i v-if="props.pulseInfo.isCustom" class="pi pi-user" title="这是一个自定义波形"></i>
                    </div>
                    <div class="flex items-center">
                        <Transition name="fade">
                            <FireIcon class="box-content px-2 w-1em h-1em" v-if="props.isFirePulse"></FireIcon>
                        </Transition>
                        <Transition name="fade">
                            <i class="pi pi-check-circle px-2 !text-md" v-if="props.isCurrentPulse"></i>
                        </Transition>
                        <Button class="more-config-button" severity="secondary" icon="pi pi-ellipsis-h" text aria-label="更多选项" @click="showMenu"></Button>
                        <Menu ref="menu" :model="moreOptions" :popup="true"></Menu>
                    </div>
                </div>
                <div class="flex-grow checkable" @click="setCurrentPulse()"></div>
            </div>
        </template>
    </Card>
</template>

<style lang="scss" scoped>
@keyframes pulse-scroll {
    from { transform: translateX(0); }
    to { transform: translateX(calc(-1 * var(--pulse-scroll-distance, 142px))); }
}

.pulse-card {
    position: relative;
    background-size: auto 60%;
    background-repeat: repeat-x;
    background-position: 10px bottom;

    min-height: 8rem;
    overflow: hidden;

    --p-card-body-padding: 0.5rem;
    --p-card-background: transparent;

    background-color: var(--p-button-secondary-background);
    background-image: var(--light-pulse-background);
    
    color: var(--p-button-secondary-color);
    
    transition: background-color 50ms linear;

    &::before {
        content: '';
        position: absolute;
        bottom: 0;
        left: 10px;
        right: 0;
        height: 60%;
        background-image: var(--full-light-pulse-background);
        background-size: auto 100%;
        background-repeat: repeat-x;
        background-position: 0 100%;
        opacity: 0;
        pointer-events: none;
        z-index: 0;
        transition: opacity 150ms;
    }

    &:hover {
        background-color: var(--p-button-secondary-hover-background);

        &::before {
            opacity: 1;
            animation: pulse-scroll var(--pulse-scroll-duration, 8s) linear infinite;
        }
    }

    &:active {
        background-color: var(--p-button-secondary-active-background);
    }

    :deep(.p-card-body), :deep(.p-card-content) {
        height: 100%;
    }
}

.checkable {
    cursor: pointer;
}

@media (prefers-color-scheme: dark) {
    .pulse-card {
        background-image: var(--dark-pulse-background);

        &::before {
            background-image: var(--full-dark-pulse-background);
        }
    }
}

.fade-enter-active, .fade-leave-active {
    transition: opacity 100ms linear;
}

.fade-enter-from, .fade-leave-to {
    opacity: 0;
}

.fade-enter-to, .fade-leave-from {
    opacity: 1;
}
</style>
