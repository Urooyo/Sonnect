<script setup>
import { ref, onMounted, watch, onUnmounted, computed } from 'vue'
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
const isDark = computed(() => theme.global.current.value.dark)
const router = useRouter()
const isBanned = ref(false)

// 사이드바 상태 관리
const drawer = ref(true)

// 화면 크기 변경 감지 및 사이드바 상태 관리
const updateDrawer = () => {
  drawer.value = window.innerWidth >= 600
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

// 공지사항 상�� 추가
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

// 사용자 role 정� 가져오기
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

onMounted(() => {
  onAuthStateChanged(auth, async (currentUser) => {
    user.value = currentUser
    if (currentUser) {
      await fetchUserRole(currentUser.uid)
    } else {
      userRole.value = null
    }
    isAuthReady.value = true
  })

  // 저장된 테마 복원
  const savedTheme = localStorage.getItem('theme')
  if (savedTheme) {
    theme.global.name.value = savedTheme
    isDark.value = savedTheme === 'dark'
  }

  // 초기 화면 기에 따른 사이드바 상태 설정
  updateDrawer()

  // 화면 크기 변경 이벤트 리스너 등록
  window.addEventListener('resize', updateDrawer)

  loadAnnouncements()
})

// 컴포넌트 마운트 시 이벤트 리스너 제거
onUnmounted(() => {
  window.removeEventListener('resize', updateDrawer)
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
    }
  ]

  if (user.value) {
    items.push(
      {
        title: `프로필 (@${userHandle.value || 'anonymous'})`,
        icon: 'mdi-account',
        to: userHandle.value ? `/@${userHandle.value}` : '/'
      },
      {
        title: '설정',
        icon: 'mdi-cog',
        to: '/settings'
      }
    )
  }

  return items
})

// 로고 색상을 computed로 관리
const logoColor = computed(() => isDark.value ? '#FFFFFF' : 'rgba(0, 0, 0, 0.87)')

// 관리자 여� 확인용 computed 속성
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
</script>

<template>
  <v-app>
    <!-- 공지사항 배너 -->
    <v-system-bar
      v-if="announcements.length > 0"
      color="primary"
      height="48"
      class="announcement-banner"
    >
      <div class="d-flex align-center justify-center w-100 text-center">
        {{ announcements[0].content }}
      </div>
    </v-system-bar>

    <v-navigation-drawer
      v-model="drawer"
      class="d-none d-sm-flex"
      elevation="1"
      width="280"
      :permanent="$vuetify.display.smAndUp"
    >
      <!-- 로고 -->
      <div class="px-4 py-4">
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
        <v-list-item
          to="/"
          :active="$route.path === '/'"
          @click="handleNavigation('/')"
          rounded="lg"
        >
          <template v-slot:prepend>
            <v-icon>mdi-home</v-icon>
          </template>
          <v-list-item-title class="text-body-1">홈</v-list-item-title>
        </v-list-item>

        <v-list-item
          v-if="user"
          :to="`/@${userHandle || 'anonymous'}`"
          rounded="lg"
        >
          <template v-slot:prepend>
            <v-avatar :color="$vuetify.theme.current.dark ? 'white' : 'primary'" size="32">
              <span :class="[
                'text-h6',
                $vuetify.theme.current.dark ? 'text-black' : 'text-white'
              ]">
                {{ userInitial }}
              </span>
            </v-avatar>
          </template>
          <v-list-item-title>{{ userName }}</v-list-item-title>
          <v-list-item-subtitle>@{{ userHandle || 'anonymous' }}</v-list-item-subtitle>
        </v-list-item>

        <v-list-item
          v-if="user"
          to="/settings"
          rounded="lg"
        >
          <template v-slot:prepend>
            <v-icon>mdi-cog</v-icon>
          </template>
          <v-list-item-title class="text-body-1">설정</v-list-item-title>
        </v-list-item>

        <!-- 관리자 메뉴 -->
        <v-list-item
          v-if="isAdmin"
          to="/admin"
          rounded="lg"
        >
          <template v-slot:prepend>
            <v-icon>mdi-shield-account</v-icon>
          </template>
          <v-list-item-title class="text-body-1">관리자</v-list-item-title>
        </v-list-item>
      </v-list>

      <v-spacer></v-spacer>

      <!-- 하단 영역 -->
      <div class="pa-4">
        <!-- 테마 토글 -->
        <v-btn
          block
          variant="text"
          @click="toggleTheme"
        >
          <v-icon class="mr-2">
            {{ isDark ? 'mdi-weather-sunny' : 'mdi-weather-night' }}
          </v-icon>
          {{ isDark ? '라이트 모드' : '다크 모드' }}
        </v-btn>

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
    </v-navigation-drawer>

    <!-- 모바일 하단 네비게이션 -->
    <v-bottom-navigation
      v-if="$vuetify.display.smAndDown"
      grow
    >
      <v-btn
        :to="'/'"
        :value="'/'"
      >
        <v-icon>mdi-home</v-icon>
        <span class="text-caption">홈</span>
      </v-btn>
      
      <v-btn
        v-if="user"
        :to="`/@${userHandle || 'anonymous'}`"
        :value="'profile'"
      >
        <v-avatar :color="$vuetify.theme.current.dark ? 'white' : 'primary'" size="24">
          <span :class="[
            'text-caption',
            $vuetify.theme.current.dark ? 'text-black' : 'text-white'
          ]">
            {{ userInitial }}
          </span>
        </v-avatar>
        <span class="text-caption">프로필</span>
      </v-btn>
      
      <v-btn
        v-if="user"
        :to="'/settings'"
        :value="'settings'"
      >
        <v-icon>mdi-cog</v-icon>
        <span class="text-caption">설정</span>
      </v-btn>
      
      <v-btn
        @click="toggleTheme"
        :value="'theme'"
      >
        <v-icon>{{ isDark ? 'mdi-weather-sunny' : 'mdi-weather-night' }}</v-icon>
        <span class="text-caption">{{ isDark ? '밝은' : '어두운' }}</span>
      </v-btn>
      
      <v-btn
        v-if="!user"
        @click="openLoginDialog"
        :value="'login'"
      >
        <v-icon>mdi-login</v-icon>
        <span class="text-caption">로그인</span>
      </v-btn>
      <v-btn
        v-if="!user"
        @click="openRegisterDialog"
        :value="'register'"
      >
        <v-icon>mdi-account-plus</v-icon>
        <span class="text-caption">구성원 합류</span>
      </v-btn>
      
      <!-- 관리자 메뉴 -->
      <v-btn
        v-if="isAdmin"
        :to="'/admin'"
        :value="'admin'"
      >
        <v-icon>mdi-shield-account</v-icon>
        <span class="text-caption">관리자</span>
      </v-btn>
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

/* 모바일 하단 네비게이션 스타일 */
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
