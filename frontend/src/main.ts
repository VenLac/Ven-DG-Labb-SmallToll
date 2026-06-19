import { createApp } from 'vue'
import { createWebHashHistory, createRouter, RouteRecordRaw } from 'vue-router'

import PrimeVue from 'primevue/config';
import { definePreset } from '@primevue/themes';
import Aura from '@primevue/themes/aura';

import DialogService from 'primevue/dialogservice';
import ConfirmationService from 'primevue/confirmationservice';
import ToastService from 'primevue/toastservice';

import { createPinia } from 'pinia'
import piniaPluginPersistedstate from 'pinia-plugin-persistedstate'

import 'virtual:windi.css'
import 'primeicons/primeicons.css'
import './style.scss'
import App from './App.vue'

const appName = 'VenWolf';

const routes: RouteRecordRaw[] = [
    {
        path: '/', component: () => import('./pages/Controller.vue'), name: '控制器',
        children: [
            { path: '', redirect: 'strength' },
            { path: 'strength', component: () => import('./pages/controller/StrengthSettings.vue'), name: '控制器 - 强度设置' },
            { path: 'pulse', component: () => import('./pages/controller/PulseSettings.vue'), name: '控制器 - 波形设置' },
            { path: 'game', component: () => import('./pages/controller/GameConnection.vue'), name: '控制器 - 游戏连接' },
        ],
    },
];

const router = createRouter({
    history: createWebHashHistory(),
    routes,
});

router.beforeEach((_to, _from, next) => {
    document.title = appName;
    next();
});


const SeitaPreset = definePreset(Aura, {
    semantic: {
        primary: {
            50: '{blue.50}',
            100: '{blue.100}',
            200: '{blue.200}',
            300: '{blue.300}',
            400: '{blue.400}',
            500: '{blue.500}',
            600: '{blue.600}',
            700: '{blue.700}',
            800: '{blue.800}',
            900: '{blue.900}',
            950: '{blue.950}'
        },
        colorScheme: {
            light: {
                primary: {
                    color: '{blue.950}',
                    inverseColor: '#ffffff',
                    hoverColor: '{blue.900}',
                    activeColor: '{blue.800}'
                },
                highlight: {
                    background: '{blue.950}',
                    focusBackground: '{blue.700}',
                    color: '#ffffff',
                    focusColor: '#ffffff'
                }
            },
            dark: {
                primary: {
                    color: '{blue.50}',
                    inverseColor: '{blue.950}',
                    hoverColor: '{blue.100}',
                    activeColor: '{blue.200}'
                },
                highlight: {
                    background: 'rgba(250, 250, 250, .16)',
                    focusBackground: 'rgba(250, 250, 250, .24)',
                    color: 'rgba(255,255,255,.87)',
                    focusColor: 'rgba(255,255,255,.87)'
                }
            }
        }
    }
});

const pinia = createPinia()
pinia.use(piniaPluginPersistedstate)

createApp(App)
    .use(router)
    .use(pinia)
    .use(PrimeVue, {
        theme: {
            preset: SeitaPreset,
        },
    })
    .use(DialogService)
    .use(ToastService)
    .use(ConfirmationService)
    .directive('ripple', {}) // Bypass PrimeVue's ripple directive
    .mount('#app');