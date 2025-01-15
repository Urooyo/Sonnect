import { createRouter, createWebHistory } from 'vue-router'
import { auth } from '@/firebase'
import HomeView from '../views/HomeView.vue'
import ProfileView from '../views/ProfileView.vue'
import SettingsView from '../views/SettingsView.vue'
import { getDoc, doc } from 'firebase/firestore'
import { db } from '@/firebase'
import BannedUserView from '@/components/BannedUserView.vue'
import PostView from '@/views/PostView.vue'

const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes: [
    {
      path: '/',
      name: 'home',
      component: HomeView,
    },
    {
      path: '/@:handle',
      name: 'profile',
      component: ProfileView,
    },
    {
      path: '/settings',
      name: 'settings',
      component: () => import('../views/SettingsView.vue'),
    },
    {
      path: '/admin',
      name: 'admin',
      component: () => import('@/views/AdminView.vue'),
      meta: { 
        requiresAuth: true,
        requiresAdmin: true
      }
    },
    {
      path: '/banned',
      name: 'banned',
      component: BannedUserView
    },
    {
      path: '/post/:id',
      name: 'post',
      component: PostView
    }
  ]
})

// 전역 인증 상태
let authInitialized = false
let unsubscribe = null

// 인증 상태 감시
if (!unsubscribe) {
  unsubscribe = auth.onAuthStateChanged(() => {
    authInitialized = true
  })
}

router.beforeEach(async (to, from, next) => {
  // 인증 상태가 초기화될 때까지 대기
  if (!authInitialized) {
    await new Promise(resolve => {
      const unsubscribe = auth.onAuthStateChanged(() => {
        unsubscribe()
        resolve()
      })
    })
  }

  const requiresAuth = to.matched.some(record => record.meta.requiresAuth)
  const isAuthenticated = auth.currentUser !== null

  if (requiresAuth && !isAuthenticated) {
    next('/')
  } else {
    if (to.matched.some(record => record.meta.requiresAdmin)) {
      const user = auth.currentUser
      if (!user) {
        next('/')
        return
      }
      
      const userDoc = await getDoc(doc(db, 'users', user.uid))
      if (!userDoc.exists() || userDoc.data().role !== 'admin') {
        next('/')
        return
      }
    }
    next()
  }
})

// 라우터 이동 후 스크롤 초기화
router.afterEach((to, from) => {
  window.scrollTo(0, 0)
})

export default router
