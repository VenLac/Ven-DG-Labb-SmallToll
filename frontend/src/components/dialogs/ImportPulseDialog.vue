<script lang="ts" setup>
import Toast from 'primevue/toast';
import { useToast } from 'primevue/usetoast';
import { generateDGLabHexPulse, loadDGLabPulseQRCode } from '../../lib/dg-pulse-helper';
import { FREQ_SLIDER_VALUE_MAP, SECTION_TIME_MAP } from '../../lib/dg-pulse-helper/DGLabPulseQRHelper';
import type { DGLabPulseInfo, DGLabPulseSectionInfo } from '../../lib/dg-pulse-helper/types';
import { md5 } from 'js-md5';
import { PulseItemInfo } from '../../type/pulse';

defineOptions({
  name: 'ImportPulseDialog',
});

const visible = defineModel<boolean>('visible');

type ImportMode = 'qrcode' | 'pulsefile';

const state = reactive({
  importMode: 'qrcode' as ImportMode,

  formPulseName: '',

  selectedFile: null as File | null,
  selectedFileUrl: null as string | null,
  pulseFileName: '',

  formPulseData: null as string[] | null,

  formErrors: {} as Record<string, string>,

  isProcessing: false,
});

const emit = defineEmits<{
  onPulseImported: [pulseInfo: PulseItemInfo];
}>();

const toast = useToast();

const importModeOptions = [
  { label: '二维码', value: 'qrcode' },
  { label: '.pulse 文件', value: 'pulsefile' },
];

/** 解析 DungeonLab .pulse 文件格式为 DGLabPulseInfo */
function parseDungeonLabPulseFile(text: string): DGLabPulseInfo | null {
  if (!text.startsWith('Dungeonlab+pulse:')) return null

  const content = text.replace(/^Dungeonlab\+pulse:/, '')
  const sectionStrs = content.split('+section+')

  const sections: DGLabPulseSectionInfo[] = []
  let sleepTime = 0
  let speedFactor = 1

  // 遍历所有小节（首节含全局参数）
  for (let si = 0; si < sectionStrs.length; si++) {
    const sec = sectionStrs[si]
    const slashIdx = sec.indexOf('/')
    if (slashIdx === -1) continue

    const metaStr = sec.substring(0, slashIdx)
    const pulseStr = sec.substring(slashIdx + 1)

    // 解析元数据
    const meta = metaStr.split(/[,=]/).map(s => {
      const n = parseInt(s.trim())
      return isNaN(n) ? 0 : n
    })

    // 首节包含全局参数（比其它节多几个字段）
    // 格式: freqA,freqB,pulseCount,sectionTime,sleepTime,unknown,speedFactor,freqMode
    // 其它节: freqA,freqB,pulseCount,sectionTime,freqMode
    let freqA: number, freqB: number
    let sectionTimeSlider: number, freqModeVal: number

    if (si === 0 && meta.length >= 8) {
      freqA = meta[0]
      freqB = meta[1]
      sectionTimeSlider = meta[3]
      sleepTime = meta[4] > 0 ? Math.floor((meta[4] - 1) / 10) / 10 + 0.1 : 0
      speedFactor = meta[6] || 1
      freqModeVal = meta[7]
    } else if (meta.length >= 5) {
      freqA = meta[0]
      freqB = meta[1]
      sectionTimeSlider = meta[3]
      freqModeVal = meta[4]
    } else {
      continue
    }

    // 频率滑块值 → 实际频率（Hz）
    const sliderToFreq = (v: number) =>
      v >= 0 && v < FREQ_SLIDER_VALUE_MAP.length ? FREQ_SLIDER_VALUE_MAP[v] : 10

    const freqHzA = sliderToFreq(freqA)
    const freqHzB = sliderToFreq(freqB)

    const freq: number | [number, number] = freqModeVal === 1 ? freqHzA : [freqHzA, freqHzB]
    const freqMode: false | 'inSection' | 'inPulse' | 'perPulse' =
      freqModeVal === 2 ? 'inSection' :
      freqModeVal === 3 ? 'inPulse' :
      freqModeVal === 4 ? 'perPulse' :
      false

    const sectionTime = sectionTimeSlider < SECTION_TIME_MAP.length ? SECTION_TIME_MAP[sectionTimeSlider] : 1

    // 解析脉冲值：格式 time-value，取 value * 5
    const pulse = pulseStr.split(',').map(pair => {
      const parts = pair.split('-')
      const val = parseInt(parts[parts.length - 1])
      return (isNaN(val) ? 0 : val) * 5
    })

    sections.push({ pulse, sectionTime, freq, freqMode })
  }

  if (sections.length === 0) return null
  return { sections, sleepTime, speedFactor }
}

function parsePulseFileContent(text: string): string[] | null {
  // 尝试 JSON 格式（兼容）
  try {
    const json = JSON.parse(text);
    if (Array.isArray(json.pulseData) && json.pulseData.every((h: any) => typeof h === 'string' && /^[0-9A-Fa-f]{16}$/.test(h))) {
      if (json.name) state.formPulseName = json.name;
      return json.pulseData;
    }
  } catch { /* not JSON */ }

  // 尝试纯文本格式（每行一个 HEX）
  const lines = text.split(/\r?\n/).map(l => l.trim()).filter(l => l.length > 0);
  const hexLines = lines.filter(l => /^[0-9A-Fa-f]{16}$/.test(l));
  if (hexLines.length >= 2) return hexLines;

  return null;
}

const pulseFileInputRef = ref<HTMLInputElement>()

function onPulseFilePick() {
  pulseFileInputRef.value?.click()
}

function onPulseFileChange(e: Event) {
  const input = e.target as HTMLInputElement
  const file = input.files?.[0]
  if (!file) return
  input.value = ''

  state.selectedFile = file
  state.pulseFileName = file.name

  const reader = new FileReader()
  reader.onload = (ev) => {
    const text = ev.target?.result as string

    // 先尝试 DungeonLab .pulse 格式
    const pulseInfo = parseDungeonLabPulseFile(text)
    if (pulseInfo) {
      try {
        const pulseHex = generateDGLabHexPulse(pulseInfo)
        if (pulseHex && pulseHex.length > 0) {
          state.formPulseData = pulseHex
          return
        }
      } catch (e) {
        console.warn('DungeonLab pulse 解析转 HEX 失败，尝试其他格式', e)
      }
    }

    // 尝试 JSON / 纯文本 HEX 格式
    const data = parsePulseFileContent(text)
    if (!data) {
      toast.add({ severity: 'error', summary: '格式错误', detail: '无法识别波形数据。支持格式：DungeonLab .pulse 文件、JSON（含 pulseData 数组）、纯文本 HEX' })
      state.selectedFile = null
      state.formPulseData = null
      return
    }
    state.formPulseData = data
  }
  reader.readAsText(file)
}

const onFileSelect = (event: any) => {
  const file: File = event.files[0];
  if (!file) return;

  state.selectedFile = file;

  if (state.selectedFileUrl) {
    URL.revokeObjectURL(state.selectedFileUrl);
    state.selectedFileUrl = null;
  }

  state.selectedFileUrl = URL.createObjectURL(file);
  state.formPulseData = null;
};

const validateForm = () => {
  state.formErrors = {};
  if (!state.selectedFile) {
    state.formErrors.selectedFile = '请选择一个文件';
  }
  if (!state.formPulseName) {
    state.formErrors.formPulseName = '请输入波形名称';
  }
  return Object.keys(state.formErrors).length === 0;
};

const onConfirm = async () => {
  if (!validateForm() || !state.selectedFile) return;

  state.isProcessing = true;

  try {
    let pulseHex: string[];
    let pulseName = state.formPulseName;

    if (state.importMode === 'pulsefile' && state.formPulseData) {
      pulseHex = state.formPulseData;
    } else {
      const pulseBuilderData = await loadDGLabPulseQRCode(state.selectedFile);
      pulseHex = generateDGLabHexPulse(pulseBuilderData);
    }

    if (!pulseHex || pulseHex.length === 0) {
      throw new Error('无效的波形数据');
    }

    const pulseId = md5(pulseHex.join('')).substring(0, 8);

    emit('onPulseImported', {
      id: pulseId,
      name: pulseName,
      pulseData: pulseHex,
    });

    state.isProcessing = false;
    visible.value = false;
  } catch (error) {
    toast.add({ severity: 'error', summary: '错误', detail: '导入波形失败' });
    console.error(error);
    state.isProcessing = false;
  }
};

const onCancel = () => {
  visible.value = false;
};

watch(() => state.importMode, () => {
  state.selectedFile = null;
  if (state.selectedFileUrl) {
    URL.revokeObjectURL(state.selectedFileUrl);
    state.selectedFileUrl = null;
  }
  state.formPulseData = null;
  state.pulseFileName = '';
  state.formErrors = {};
});

watch(() => visible.value, (newVal) => {
  if (!newVal) {
    state.isProcessing = false;
    state.selectedFile = null;
    if (state.selectedFileUrl) {
      URL.revokeObjectURL(state.selectedFileUrl);
      state.selectedFileUrl = null;
    }
    state.formPulseData = null;
    state.pulseFileName = '';
  } else {
    state.formPulseName = (new Date()).toLocaleString() + ' 导入波形';
  }
});
</script>

<template>
  <Dialog v-model:visible="visible" modal header="导入波形" class="dialog-importPulse mx-4 w-full md:w-[40rem]">
    <Toast />
    <div class="flex flex-col gap-4">
      <SelectButton v-model="state.importMode" :options="importModeOptions" optionLabel="label" optionValue="value"
        :allowEmpty="false" class="self-center" />

      <div class="w-full flex flex-col items-top gap-2 mb-4">
        <label class="font-semibold">波形名称</label>
        <InputText v-model="state.formPulseName" :invalid="!!state.formErrors.formPulseName" />
        <small v-if="state.formErrors.formPulseName" class="text-red-500">{{ state.formErrors.formPulseName }}</small>
      </div>

      <div class="flex flex-col gap-2 justify-center">
        <template v-if="state.importMode === 'qrcode'">
          <FileUpload mode="basic" chooseLabel="选择波形二维码" @select="onFileSelect" customUpload auto severity="secondary"
            accept="image/*" class="p-button-outlined" :invalid="!!state.formErrors.selectedFile" />
          <small v-if="state.formErrors.selectedFile" class="text-red-500">{{ state.formErrors.selectedFile }}</small>
          <div class="w-full">
            <img v-if="state.selectedFileUrl" :src="state.selectedFileUrl" alt="波形二维码"
              class="shadow-md rounded-xl mx-auto w-auto h-[50vh]" />
          </div>
        </template>
        <template v-else>
          <input ref="pulseFileInputRef" type="file" accept=".json,.pulse,.txt,application/json,text/plain"
            class="d-none" @change="onPulseFileChange" />
          <Button label="选择 .pulse 文件" severity="secondary" class="p-button-outlined"
            @click="onPulseFilePick" />
          <small v-if="state.formErrors.selectedFile" class="text-red-500">{{ state.formErrors.selectedFile }}</small>
          <div v-if="state.formPulseData" class="text-sm opacity-70 text-center mt-1">
            已读取 {{ state.formPulseData.length }} 条脉冲数据
          </div>
          <div v-else-if="state.selectedFile" class="text-sm opacity-50 text-center mt-1 text-red-500">
            无法识别文件格式
          </div>
        </template>
      </div>

      <div class="flex justify-end mt-4 gap-4">
        <Button label="取消" severity="secondary" @click="onCancel"></Button>
        <Button label="确定" :disabled="state.isProcessing" @click="onConfirm"></Button>
      </div>
    </div>
  </Dialog>
</template>