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

const vuetify = createVuetify({
  components,
  directives,
  defaults: {
    VBtn: {
      rounded: true,
    }
  },
  theme: {
    defaultTheme: 'light',
    themes: {
      light: {
        dark: false,
        colors: {
          primary: '#1A1A1A',
          secondary: '#757575',
          accent: '#424242',
          error: '#FF5252',
          info: '#2196F3',
          success: '#4CAF50',
          warning: '#FFC107',
          background: '#F5F5F5',
          surface: '#FFFFFF',
          'text-primary': 'rgba(0, 0, 0, 0.87)',
          'text-secondary': 'rgba(0, 0, 0, 0.6)',
          'post-card': '#FFFFFF',
          'post-card-hover': 'rgba(0, 0, 0, 0.04)'
        }
      },
      dark: {
        dark: true,
        colors: {
          primary: '#FFFFFF',
          secondary: '#BDBDBD',
          accent: '#9E9E9E',
          error: '#FF5252',
          info: '#2196F3',
          success: '#4CAF50',
          warning: '#FFC107',
          background: '#121212',
          surface: '#1E1E1E',
          'text-primary': 'rgba(255, 255, 255, 0.87)',
          'text-secondary': 'rgba(255, 255, 255, 0.6)',
          'post-card': '#1E1E1E',
          'post-card-hover': 'rgba(255, 255, 255, 0.08)'
        }
      }
    }
  }
})

const app = createApp(App)

app.use(createPinia())
app.use(router)
app.use(vuetify)

app.mount('#app')
