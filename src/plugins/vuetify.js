import '@mdi/font/css/materialdesignicons.css'
import 'vuetify/styles'
import { createVuetify } from 'vuetify'
import { aliases, ph } from 'vuetify/iconsets/ph'
import '@phosphor-icons/web/css/regular.css'

export default createVuetify({
  icons: {
    defaultSet: 'ph',
    aliases,
    sets: {
      ph
    }
  },
  // ... 기존 테마 설정 유지
}) 