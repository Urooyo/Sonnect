import '@mdi/font/css/materialdesignicons.css'
import 'vuetify/styles'
import { createVuetify } from 'vuetify'
import { aliases, ph } from 'vuetify/iconsets/ph'

// Catppuccin Mocha 팔레트
const catppuccin = {
  dark: {
    dark: true,
    colors: {
      background: '#1E1E2E', // base
      surface: '#313244',    // surface0
      'surface-bright': '#45475A', // surface1
      'surface-variant': '#585B70', // surface2
      'on-surface-variant': '#7F849C', // overlay1
      primary: '#89B4FA',    // blue
      'primary-darken-1': '#74C7EC', // sapphire
      secondary: '#F5C2E7',  // pink
      'secondary-darken-1': '#CBA6F7', // mauve
      error: '#F38BA8',      // red
      info: '#89DCEB',       // sky
      success: '#A6E3A1',    // green
      warning: '#FAB387',    // peach
      'on-background': '#CDD6F4', // text
      'on-surface': '#CDD6F4',    // text
      'on-primary': '#11111B',    // crust
      'on-secondary': '#11111B',  // crust
      'on-error': '#11111B',      // crust
      'on-info': '#11111B',       // crust
      'on-success': '#11111B',    // crust
      'on-warning': '#11111B',    // crust
    }
  },
  light: {
    dark: false,
    colors: {
      background: '#CDD6F4', // text
      surface: '#BAC2DE',    // subtext1
      'surface-bright': '#A6ADC8', // subtext0
      'surface-variant': '#9399B2', // overlay2
      'on-surface-variant': '#7F849C', // overlay1
      primary: '#89B4FA',    // blue
      'primary-darken-1': '#74C7EC', // sapphire
      secondary: '#F5C2E7',  // pink
      'secondary-darken-1': '#CBA6F7', // mauve
      error: '#F38BA8',      // red
      info: '#89DCEB',       // sky
      success: '#A6E3A1',    // green
      warning: '#FAB387',    // peach
      'on-background': '#11111B', // crust
      'on-surface': '#181825',    // mantle
      'on-primary': '#1E1E2E',    // base
      'on-secondary': '#1E1E2E',  // base
      'on-error': '#1E1E2E',      // base
      'on-info': '#1E1E2E',       // base
      'on-success': '#1E1E2E',    // base
      'on-warning': '#1E1E2E',    // base
    }
  }
}

export default createVuetify({
  icons: {
    defaultSet: 'ph',
    aliases,
    sets: {
      ph
    }
  },
  theme: {
    defaultTheme: 'dark',
    themes: catppuccin
  }
}) 