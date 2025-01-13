import { createApp } from 'vue'
import { createPinia } from 'pinia'

// Vuetify
import 'vuetify/styles'
import { createVuetify } from 'vuetify'
import * as components from 'vuetify/components'
import * as directives from 'vuetify/directives'
import '@mdi/font/css/materialdesignicons.css'

import App from './App.vue'
import router from './router'

// Portage 색상 테마 정의
const portage = {
  base: '#7a66ee', // 500
  lighten5: '#eeefff', // 50
  lighten4: '#e1e2fe', // 100
  lighten3: '#c8cafd', // 200
  lighten2: '#9595f9', // 300
  lighten1: '#8d84f5', // 400
  darken1: '#6c4ae1', // 600
  darken2: '#5e3bc7', // 700
  darken3: '#4c33a0', // 800
  darken4: '#41307f', // 900
}

const vuetify = createVuetify({
  components,
  directives,
  defaults: {
    VBtn: {
      rounded: true,
      // 또는 더 둥글게: rounded: 'xl'
    }
  },
  theme: {
    defaultTheme: 'light',
    themes: {
      light: {
        colors: {
          primary: '#7C4DFF',
          secondary: '#5CBBF6',
          accent: '#4CAF50',
          error: '#FF5252',
          info: '#2196F3',
          success: '#4CAF50',
          warning: '#FFC107',
          background: '#F5F5F5',
          surface: '#FFFFFF',
        },
      },
      dark: {
        colors: {
          primary: '#9575CD',
          secondary: '#424242',
          accent: '#FF4081',
          error: '#FF5252',
          info: '#2196F3',
          success: '#4CAF50',
          warning: '#FFC107',
          background: '#121212',
          surface: '#1E1E1E',
        },
      },
    },
  }
})

const app = createApp(App)

app.use(createPinia())
app.use(router)
app.use(vuetify)

app.mount('#app')
