<script setup>
import { ref, onMounted, watch, onUnmounted, computed, provide } from 'vue'
import { useTheme } from 'vuetify'
import { RouterLink, RouterView, useRouter } from 'vue-router'
import { onAuthStateChanged, signOut } from 'firebase/auth'
import { auth } from '@/firebase'
import AuthDialog from '@/components/AuthDialog.vue'
import NotificationSystem from '@/components/NotificationSystem.vue'
import { collection, query, orderBy, limit, getDocs, where, doc, getDoc } from 'firebase/firestore'
import { db } from '@/firebase'
import SonnectLogo from '@/assets/sonnect.community.svg'

const user = ref(null)
const userRole = ref(null) // 사용자 role 저장용
const isAuthReady = ref(false)
const showAuthDialog = ref(false)
const authMode = ref('login') // 'login' 또는 'register'
const theme = useTheme()
const themePreference = ref(localStorage.getItem('themePreference') || 'system') // 'system', 'light', 'dark'

// 시스템 테마 감지
const systemDarkMode = window.matchMedia('(prefers-color-scheme: dark)')

// 테마 업데이트 함수
const updateTheme = () => {
  switch (themePreference.value) {
    case 'system':
      theme.global.name.value = systemDarkMode.matches ? 'dark' : 'light'
      break
    case 'light':
      theme.global.name.value = 'light'
      break
    case 'dark':
      theme.global.name.value = 'dark'
      break
  }
}

// 시스템 테마 변경 감지
const handleSystemThemeChange = (e) => {
  if (themePreference.value === 'system') {
    theme.global.name.value = e.matches ? 'dark' : 'light'
  }
}

// 테마 설정 함수
const setThemePreference = (preference) => {
  themePreference.value = preference
  localStorage.setItem('themePreference', preference)
  updateTheme()
}

const isDark = computed(() => theme.global.current.value.dark)
const router = useRouter()
const isBanned = ref(false)

// 사이드바 상태 관리
const drawer = ref(true)
const rail = ref(false)

// 화면 크기 변경 감지 및 사이드바 상태 관리
const updateSidebarState = () => {
  drawer.value = window.innerWidth >= 600
  rail.value = window.innerWidth <= 900 && window.innerWidth >= 600
}

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

// 공지사항 상태 추가
const announcements = ref([])

// 공지사항 로드 함수
const loadAnnouncements = async () => {
  const q = query(
    collection(db, 'announcements'),
    orderBy('createdAt', 'desc'),
    where('active', '==', true),
    limit(1)
  )
  const snapshot = await getDocs(q)
  announcements.value = snapshot.docs.map(doc => ({
    id: doc.id,
    ...doc.data()
  }))
}

// 사용자 role 정보 가져오기
const fetchUserRole = async (uid) => {
  if (!uid) return
  try {
    const userDoc = await getDoc(doc(db, 'users', uid))
    if (userDoc.exists()) {
      userRole.value = userDoc.data().role
    }
  } catch (error) {
    console.error('Error fetching user role:', error)
  }
}

// 버전 정보
const version = '25.115.0-beta'

// 알림 상태 관리
const alert = ref({
  show: false,
  type: 'success',
  message: '',
  timeout: 3000
})

// 알림 표시 함수
const showAlert = (message, type = 'success', timeout = 3000) => {
  alert.value = {
    show: true,
    type,
    message,
    timeout
  }
}

// 전역 로딩 상태 관리
const loading = ref(false)
const showLoading = (value = true) => {
  loading.value = value
}

// 현재 사용자의 handle 계산
const currentUserHandle = computed(() => {
  if (!auth.currentUser) return ''
  return user.value?.handle || ''
})

onMounted(() => {
  onAuthStateChanged(auth, async (firebaseUser) => {
    if (firebaseUser) {
      // Firestore에서 사용자 정보 가져오기
      const userDoc = await getDoc(doc(db, 'users', firebaseUser.uid))
      if (userDoc.exists()) {
        user.value = { id: userDoc.id, ...userDoc.data() }
        userRole.value = userDoc.data().role // role 정보 저장
      }
    } else {
      user.value = null
      userRole.value = null
    }
  })

  // 저장된 테마 복원
  const savedTheme = localStorage.getItem('theme')
  if (savedTheme) {
    theme.global.name.value = savedTheme
    isDark.value = savedTheme === 'dark'
  }

  // 초기 화면 크기에 따른 사이드바 상태 설정
  updateSidebarState()

  // 화면 크기 변경 이벤트 리스너 등록
  window.addEventListener('resize', updateSidebarState)

  loadAnnouncements()

  // 시스템 테마 변경 감지 리스너 등록
  systemDarkMode.addEventListener('change', handleSystemThemeChange)
  // 초기 테마 설정
  updateTheme()
})

// 컴포넌트 마운트 시 이벤트 리스너 제거
onUnmounted(() => {
  window.removeEventListener('resize', updateSidebarState)
  systemDarkMode.removeEventListener('change', handleSystemThemeChange)
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

// 라우트트 변경 핸들러 추가
const handleRouteChange = () => {
  window.scrollTo(0, 0)
}

// 사용자 핸들 계산
const userHandle = computed(() => {
  if (!user.value) return ''
  return user.value.photoURL?.startsWith('@') ? 
    user.value.photoURL.substring(1) : 
    user.value.photoURL
})

// 사용자 표시 이름 계산
const userName = computed(() => {
  return user.value?.displayName || '익명'
})

// 사용자 아바타 첫 글자 계산
const userInitial = computed(() => {
  return userName.value.charAt(0).toUpperCase()
})

// 네비게이 아이템
const navItems = computed(() => {
  const items = [
    {
      title: '홈',
      icon: 'mdi-home',
      to: '/'
    },
    {
      title: '설정',
      icon: 'mdi-cog',
      to: '/settings'
    }
  ]

  if (user.value) {
    items.push({
      title: '프로필',
      icon: 'mdi-account',
      to: user.value.handle ? `/@${user.value.handle}` : '/login'
    })

    // 관리자인 경우에만 관리자 메뉴 추가
    if (isAdmin.value) {
      items.push({
        title: '관리자',
        icon: 'mdi-shield-account',
        to: '/admin'
      })
    }
  }

  return items
})

// 로고 색상을 computed로 관리
const logoColor = computed(() => isDark.value ? '#FFFFFF' : 'rgba(0, 0, 0, 0.87)')

// 관리자 여부 확인용 computed 속성
const isAdmin = computed(() => userRole.value === 'admin')

watch(() => auth.currentUser, async (newUser) => {
  if (newUser) {
    const userDoc = await getDoc(doc(db, 'users', newUser.uid))
    if (userDoc.exists()) {
      isBanned.value = userDoc.data().isBanned || false
      if (isBanned.value) {
        router.push('/banned')
      }
    }
  }
}, { immediate: true })

// provide를 통해 하위 컴포넌트에서 사용할 수 있도록 함
provide('showAlert', showAlert)
provide('showLoading', showLoading)
provide('themePreference', themePreference)
provide('setThemePreference', setThemePreference)
provide('version', version)
provide('user', user)
provide('openLoginDialog', openLoginDialog)
</script>

<template>
  <v-app>
    <!-- 공지사항 배너 -->
    <v-system-bar
      v-if="announcements.length > 0"
      :color="announcements[0].backgroundColor"
      height="48"
      class="announcement-banner"
    >
      <div class="d-flex align-center justify-center w-100 text-center banner-text">
        {{ announcements[0].content }}
      </div>
    </v-system-bar>

    <v-navigation-drawer
      v-model="drawer"
      :rail="rail"
      class="d-none d-sm-flex"
      elevation="1"
      width="280"
      :permanent="$vuetify.display.smAndUp"
    >
      <!-- 사이드바 축소/확장 버튼 -->
      <template v-slot:prepend>
        <v-btn
          variant="text"
          icon="mdi-chevron-left"
          @click.stop="rail = !rail"
          :class="{ 'rotate-180': rail }"
          class="toggle-btn"
        ></v-btn>
      </template>

      <!-- 로고 -->
      <div class="px-4 py-4" v-show="!rail">
        <router-link 
          to="/" 
          class="d-flex align-center text-decoration-none"
          @click="handleNavigation('/')"
        >
          <img 
            :src="SonnectLogo" 
            alt="Sonnect Community" 
            class="logo"
            :style="{ filter: isDark ? 'invert(1)' : 'none' }"
          />
        </router-link>
      </div>

      <!-- 메인 네비게이션 -->
      <v-list class="px-2">
        <!-- 사용자 프로필 표시 -->
        <v-list-item
          v-if="user"
          :to="user ? `/@${user.handle}` : '/login'"
          :prepend-avatar="user.photoURL"
          :title="user.displayName"
          link
          :class="{ 'square-btn': rail }"
          :v-btn rounded="xl"
        ></v-list-item>
        
        <!-- 네비게이션 메뉴 -->
        <v-list-item
          v-for="item in navItems"
          :key="item.title"
          :prepend-icon="item.icon"
          :title="item.title"
          :to="item.to"
          :active="$route.path === item.to"
          :class="{ 'square-btn': rail }"
          :v-btn rounded="xl"
        ></v-list-item>
      </v-list>

      <v-spacer></v-spacer>

      <!-- 하단 영역 -->
      <div class="pa-4">

        <!-- 로그인 버튼 -->
        <template v-if="user">
        </template>
        <template v-else>
          <v-btn
            class="mb-2"
            block
            color="primary"
            @click="openLoginDialog"
          >
            로그인
          </v-btn>
          <v-btn
            block
            color="primary"
            variant="outlined"
            @click="openRegisterDialog"
          >
            회원가입
          </v-btn>
        </template>
      </div>

      <template v-slot:append>
        <div class="px-4 py-2 text-caption text-medium-emphasis">
          v{{ version }}
        </div>
      </template>
    </v-navigation-drawer>

    <!-- 모바일 하단 네비게이션 -->
    <v-bottom-navigation
      v-model="activeTab"
      grow
      class="d-md-none"
    >
      <v-btn to="/">
        <v-icon>mdi-home</v-icon>
        홈
      </v-btn>

      <v-btn to="/settings">
        <v-icon>mdi-cog</v-icon>
        설정
      </v-btn>

      <!-- 로그인한 경우 프로필 버튼 -->
      <template v-if="user">
        <v-btn :to="`/@${user.handle}`">
          <v-icon>mdi-account</v-icon>
          프로필
        </v-btn>
      </template>

      <!-- 비로그인 경우 로그인 버튼 -->
      <template v-else>
        <v-btn @click="openLoginDialog">
          <v-icon>mdi-login</v-icon>
          로그인
        </v-btn>
      </template>
    </v-bottom-navigation>

    <v-main>
      <v-container :class="{ 'px-6': $vuetify.display.smAndUp, 'pb-16': $vuetify.display.smAndDown }">
        <router-view 
          v-slot="{ Component }" 
          @navigation-end="handleRouteChange"
        >
          <transition name="fade" mode="out-in">
            <component :is="Component" :key="$route.path" />
          </transition>
        </router-view>
      </v-container>
    </v-main>

    <AuthDialog 
      v-model="showAuthDialog"
      :initial-mode="authMode"
      :class="{ 'mobile-auth-dialog': $vuetify.display.smAndDown }"
    />

    <!-- 전역 알림 -->
    <v-alert
      v-model="alert.show"
      :type="alert.type"
      :timeout="alert.timeout"
      transition="slide-y-transition"
      location="top"
      class="global-alert"
    >
      {{ alert.message }}
    </v-alert>

    <!-- 전역 로딩 오버레이 -->
    <v-overlay
      v-model="loading"
      class="align-center justify-center"
      persistent
      scrim="white"
      :opacity="0.8"
    >
      <v-progress-circular
        indeterminate
        color="primary"
        size="64"
      ></v-progress-circular>
    </v-overlay>
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

/* 버버튼 스타일 */
.v-btn {
  border-radius: var(--border-radius-sm) !important;
}

.v-btn--rounded {
  border-radius: 9999px !important;
}

/* 입력력 필드 스타일 */
.v-text-field .v-field {
  border-radius: var(--border-radius-sm) !important;
}

/* 페이지 전환 애니메이션 */
.fade-enter-active,
.fade-leave-active {
  transition: opacity 0.3s ease;
}

.fade-enter-from,
.fade-leave-to {
  opacity: 0;
}

/* 사이드바 스타일 */
.v-navigation-drawer {
  border-right: 1px solid rgba(0, 0, 0, 0.12) !important;
  transition: transform 0.3s cubic-bezier(0.4, 0, 0.2, 1) !important;
}

.v-list-item--active {
  font-weight: 600;
}

.v-list-item {
  min-height: 48px !important;
}

/* 모바일 하단 네비게게이션 스타일 */
.v-bottom-navigation {
  position: fixed !important;
  bottom: 0 !important;
  z-index: 1000;
}

.v-bottom-navigation .v-btn {
  min-width: unset !important;
}

.v-bottom-navigation .v-btn .v-icon {
  margin-bottom: 4px;
}

/* 모모모바일에서 컨테이너 패딩딩 조정 */
@media (max-width: 600px) {
  .v-container {
    padding-left: 12px !important;
    padding-right: 12px !important;
  }
}

/* 600px 미만에서 사이드바 숨김 */
@media (max-width: 599px) {
  .v-navigation-drawer {
    display: none !important;
  }
}

/* 모바일 인증 다이얼로그 스타일 */
.mobile-auth-dialog .v-bottom-sheet {
  border-radius: 24px 24px 0 0;
}

.mobile-auth-dialog .v-bottom-sheet .v-card {
  max-height: 90vh;
  overflow-y: auto;
}

/* 공지사항 배너 스타일 */
.announcement-banner {
  font-weight: 500 !important;
  letter-spacing: -0.3px;
}

.announcement-banner .v-system-bar__content {
  width: 100%;
}

/* 공지사항 배너가 있을 때 네비게이션 드로어 위치 조정 */
.v-navigation-drawer {
  top: var(--v-layout-top) !important;
}

/* 모바일에서 공지사항 배너 스타일 조정 */
@media (max-width: 600px) {
  .announcement-banner {
    padding: 0 16px;
  }
}

/* 테마 전환 애니메이션 */
.v-application {
  transition: background-color 0.3s ease, color 0.3s ease !important;
}

.v-card {
  transition: background-color 0.3s ease, color 0.3s ease, transform 0.2s, box-shadow 0.2s !important;
}

.v-btn {
  transition: background-color 0.3s ease, color 0.3s ease !important;
}

.v-navigation-drawer {
  transition: background-color 0.3s ease, border-color 0.3s ease, transform 0.3s cubic-bezier(0.4, 0, 0.2, 1) !important;
}

.v-list {
  transition: background-color 0.3s ease, color 0.3s ease !important;
}

.v-list-item {
  transition: background-color 0.3s ease, color 0.3s ease !important;
}

.text-caption {
  font-size: 12px !important;
  line-height: 1.25 !important;
}

/* 전역 알림 스타일 */
.global-alert {
  position: fixed !important;
  top: 16px !important;
  left: 50% !important;
  transform: translateX(-50%) !important;
  z-index: 1000;
  min-width: 300px;
  max-width: 90%;
}

/* 로딩 오버레이 스타일 */
.v-overlay__scrim {
  backdrop-filter: blur(4px);
}

/* 사이드바 축소/확장 버튼 애니메이션 */
.rotate-180 {
  transform: rotate(180deg);
}

.v-btn.rotate-180 {
  transition: transform 0.3s cubic-bezier(0.4, 0, 0.2, 1);
}

/* 축소된 사이드바의 정사각형 버튼 스타일 */
.v-navigation-drawer--rail .square-btn {
  width: 44px !important;
  height: 44px !important;
  margin: 4px auto !important;
  padding: 0 !important;
  min-height: 44px !important;
  max-height: 44px !important;
  display: flex !important;
  align-items: center !important;
  justify-content: center !important;
  position: relative !important;
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1) !important;
}

.v-navigation-drawer--rail .square-btn .v-list-item__content {
  display: none !important;
}

.v-navigation-drawer--rail .square-btn .v-list-item__prepend {
  position: absolute !important;
  left: 50% !important;
  top: 50% !important;
  transform: translate(-50%, -50%) !important;
  margin-inline-end: 0 !important;
  padding: 0 !important;
  width: auto !important;
}

.v-navigation-drawer--rail .square-btn .v-icon {
  margin: 0 !important;
  font-size: 24px !important;
}

/* 축소된 상태에서 버튼 스타일 추가 */
.v-navigation-drawer--rail .v-list-item {
  min-width: 44px !important;
  max-width: 44px !important;
  border-radius: 100px !important;
}

/* 축소된 상태에서 spacer 제거 */
.v-navigation-drawer--rail .v-list-item__spacer {
  display: none !important;
}

/* 축소된 상태에서 오버레이 크기 조정 */
.v-navigation-drawer--rail .v-list-item__overlay {
  border-radius: 100px !important;
}

/* 축소/확장 토글 버튼 스타일 */
.toggle-btn {
  width: 44px !important;
  height: 44px !important;
  margin: 4px 8px !important;
  display: flex !important;
  align-items: center !important;
  justify-content: center !important;
  min-height: 44px !important;
  max-height: 44px !important;
}

/* 축소된 상태에서 아바타 크기 조정 */
.v-navigation-drawer--rail .v-list-item__prepend .v-avatar {
  width: 24px !important;
  height: 24px !important;
  margin: 0 !important;
  position: absolute !important;
  left: 50% !important;
  top: 50% !important;
  transform: translate(-50%, -50%) !important;
}


/* 사이드바 전 애니메이션 */
.v-navigation-drawer {
  transition: width 0.4s cubic-bezier(0.4, 0, 0.2, 1) !important;
}

.v-navigation-drawer--rail .v-list-item__content {
  opacity: 0;
  transition: opacity 0.3s ease;
}

.v-navigation-drawer:not(.v-navigation-drawer--rail) .v-list-item__content {
  opacity: 1;
  transition: opacity 0.3s ease 0.1s;
}

/* 로고 페이드 애니메이션 */
.v-navigation-drawer .px-4 {
  transition: opacity 0.3s ease;
}

.v-navigation-drawer--rail .px-4 {
  opacity: 0;
  transition: opacity 0.3s ease;
}

.banner-text {
  font-size: 16px !important;
  line-height: 1.5 !important;
}
</style>

<style scoped>
.v-app-bar-title {
  cursor: pointer;
}

.logo {
  height: 24px;
  width: auto;
  margin: 0;
  padding: 0;
  transition: filter 0.3s ease;
}

.logo.theme--dark {
  color: #FFFFFF;
}

/* 모바일에서의 로고 크기 조정 */
@media (max-width: 600px) {
  .logo {
    height: 20px;
  }
}

/* 로고를 포함한 링크의 여백 조정 */
.d-flex.align-center {
  gap: 8px;
}
</style>
