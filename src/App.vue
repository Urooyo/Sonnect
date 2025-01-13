<script setup>
import { ref, onMounted, watch } from 'vue'
import { useTheme } from 'vuetify'
import { RouterLink, RouterView, useRouter } from 'vue-router'
import { onAuthStateChanged, signOut } from 'firebase/auth'
import { auth } from '@/firebase'
import AuthDialog from '@/components/AuthDialog.vue'
import NotificationSystem from '@/components/NotificationSystem.vue'

const user = ref(null)
const isAuthReady = ref(false)
const showAuthDialog = ref(false)
const authMode = ref('login') // 'login' 또는 'register'
const theme = useTheme()
const isDark = ref(localStorage.getItem('theme') === 'dark')
const router = useRouter()

// 테마 토글 함수
const toggleTheme = () => {
  theme.global.name.value = theme.global.current.value.dark ? 'light' : 'dark'
  isDark.value = !isDark.value
  localStorage.setItem('theme', isDark.value ? 'dark' : 'light')
}

// 페이지 이동 핸들러
const handleNavigation = async (path) => {
  if (router.currentRoute.value.path !== path) {
    await router.push(path)
  }
}

onMounted(() => {
  onAuthStateChanged(auth, (currentUser) => {
    user.value = currentUser
    isAuthReady.value = true
  })

  // 저장된 테마 복원
  const savedTheme = localStorage.getItem('theme')
  if (savedTheme) {
    theme.global.name.value = savedTheme
    isDark.value = savedTheme === 'dark'
  }
})

const handleLogout = async () => {
  await signOut(auth)
  await router.push('/')
}

const openLoginDialog = () => {
  authMode.value = 'login'
  showAuthDialog.value = true
}

const openRegisterDialog = () => {
  authMode.value = 'register'
  showAuthDialog.value = true
}

// 인증 상태가 변경될 때 라우터 처리
watch(user, (newUser) => {
  if (!newUser && isAuthReady.value) {
    // 로그아웃 시 홈으로 리다이렉트
    if (router.currentRoute.value.meta.requiresAuth) {
      router.push('/')
    }
  }
})

// 라우트 변경 핸들러 추가
const handleRouteChange = () => {
  window.scrollTo(0, 0)
}
</script>

<template>
  <v-app>
    <v-app-bar elevation="1" rounded>
      <router-link 
        to="/" 
        class="text-decoration-none"
        :class="{ 'text-white': theme.global.current.value.dark, 'text-black': !theme.global.current.value.dark }"
        @click.native="handleNavigation('/')"
      >
        <v-app-bar-title>라베토</v-app-bar-title>
      </router-link>

      <v-btn
        to="/"
        variant="text"
        class="ml-4"
        @click="handleNavigation('/')"
      >
        <v-icon>mdi-home</v-icon>
        <span class="d-none d-sm-inline ml-2">홈</span>
      </v-btn>
      
      <v-spacer></v-spacer>
      
      <v-btn
        icon
        class="mr-2"
        @click="toggleTheme"
      >
        <v-icon>{{ isDark ? 'mdi-weather-sunny' : 'mdi-weather-night' }}</v-icon>
      </v-btn>

      <template v-if="user">
        <NotificationSystem class="mr-2" />
        <v-btn
          icon
          class="mr-2"
          :color="$route.path === '/settings' ? 'primary' : 'default'"
          :variant="$route.path === '/settings' ? 'flat' : 'text'"
          @click="handleNavigation('/settings')"
        >
          <v-icon>mdi-cog</v-icon>
        </v-btn>
        
        <v-menu location="bottom end">
          <template v-slot:activator="{ props }">
            <v-btn
              v-bind="props"
              text
              class="text-none"
            >
              <v-avatar size="32" class="mr-2">
                <v-icon>mdi-account</v-icon>
              </v-avatar>
              <div class="d-none d-sm-flex flex-column align-start">
                <span>{{ user.displayName }}</span>
                <span class="text-caption text-medium-emphasis">@{{ user.photoURL }}</span>
              </div>
            </v-btn>
          </template>
          <v-list>
            <v-list-item @click="handleNavigation(`/@${user.photoURL.replace(/^@+/, '')}`)">
              <template v-slot:prepend>
                <v-icon>mdi-account</v-icon>
              </template>
              <v-list-item-title>프로필</v-list-item-title>
            </v-list-item>
            <v-list-item @click="handleLogout">
              <template v-slot:prepend>
                <v-icon>mdi-logout</v-icon>
              </template>
              <v-list-item-title>로그아웃</v-list-item-title>
            </v-list-item>
          </v-list>
        </v-menu>
      </template>
      <template v-else>
        <v-btn @click="openLoginDialog">로그인</v-btn>
        <v-btn @click="openRegisterDialog">회원가입</v-btn>
      </template>
    </v-app-bar>

    <v-main>
      <router-view 
        v-slot="{ Component }" 
        @navigation-end="handleRouteChange"
      >
        <component :is="Component" :key="$route.path" />
      </router-view>
    </v-main>

    <AuthDialog 
      v-model="showAuthDialog"
      :initial-mode="authMode"
    />
  </v-app>
</template>

<style>
@import url("https://cdn.jsdelivr.net/gh/orioncactus/pretendard@v1.3.9/dist/web/variable/pretendardvariable.min.css");

:root {
  --border-radius-lg: 16px;
  --border-radius-md: 12px;
  --border-radius-sm: 8px;
}

body {
  font-family: "Pretendard Variable", sans-serif;
  letter-spacing: -0.2px;
}

.v-app-bar-title {
  font-family: "Pretendard Variable", sans-serif;
  font-weight: 700;
  letter-spacing: -0.2px;
}

.v-btn {
  letter-spacing: -0.2px;
}

/* 카드 스타일 */
.v-card {
  border-radius: var(--border-radius-lg) !important;
  transition: transform 0.2s, box-shadow 0.2s;
}

.v-card:hover {
  transform: translateY(-2px);
  box-shadow: 0 4px 25px 0 rgba(0, 0, 0, 0.1);
}

/* 버튼 스타일 */
.v-btn {
  border-radius: var(--border-radius-sm) !important;
}

.v-btn--rounded {
  border-radius: 9999px !important;
}

/* 입력 필드 스타일 */
.v-text-field .v-field {
  border-radius: var(--border-radius-sm) !important;
}

/* 페이지 전환 애니메이션 */
.fade-enter-active,
.fade-leave-active {
  transition: opacity 0.2s ease;
}

.fade-enter-from,
.fade-leave-to {
  opacity: 0;
}
</style>

<style scoped>
.v-app-bar-title {
  cursor: pointer;
}
</style>
