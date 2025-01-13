<script setup>
import { ref, onMounted } from 'vue'
import { collection, query, getDocs, updateDoc, doc, addDoc, orderBy, deleteDoc, Timestamp } from 'firebase/firestore'
import { db, auth } from '@/firebase'
import { useRouter } from 'vue-router'

const router = useRouter()
const users = ref([])
const announcements = ref([])
const newAnnouncement = ref('')
const loading = ref(false)

// 권한 체크
const checkAdminAccess = () => {
  if (!auth.currentUser?.customData?.role || auth.currentUser.customData.role !== 'admin') {
    console.error('Admin access denied:', auth.currentUser)
    router.push('/')
    return false
  }
  return true
}

// 사용자 목록 로드
const loadUsers = async () => {
  const q = query(collection(db, 'users'))
  const snapshot = await getDocs(q)
  users.value = snapshot.docs.map(doc => ({
    id: doc.id,
    ...doc.data()
  }))
}

// 공지사항 로드
const loadAnnouncements = async () => {
  const q = query(collection(db, 'announcements'), orderBy('createdAt', 'desc'))
  const snapshot = await getDocs(q)
  announcements.value = snapshot.docs.map(doc => ({
    id: doc.id,
    ...doc.data()
  }))
}

// 사용자 차단/차단해제
const toggleBan = async (userId) => {
  const userRef = doc(db, 'users', userId)
  const user = users.value.find(u => u.id === userId)
  await updateDoc(userRef, {
    isBanned: !user.isBanned
  })
  // 목록 새로고침
  await loadUsers()
}

// 공지사항 작성
const createAnnouncement = async () => {
  if (!checkAdminAccess()) return
  if (!newAnnouncement.value.trim()) return
  
  loading.value = true
  try {
    await addDoc(collection(db, 'announcements'), {
      content: newAnnouncement.value,
      createdAt: new Date().toISOString(),
      active: true
    })
    newAnnouncement.value = ''
    await loadAnnouncements()
  } catch (error) {
    console.error('Error creating announcement:', error)
  } finally {
    loading.value = false
  }
}

// 공지사항 활성/비활성 토글
const toggleAnnouncement = async (announcement) => {
  const announcementRef = doc(db, 'announcements', announcement.id)
  await updateDoc(announcementRef, {
    active: !announcement.active
  })
  await loadAnnouncements()
}

// 공지사항 삭제
const deleteAnnouncement = async (announcementId) => {
  await deleteDoc(doc(db, 'announcements', announcementId))
  await loadAnnouncements()
}

onMounted(async () => {
  if (!checkAdminAccess()) return
  await Promise.all([loadUsers(), loadAnnouncements()])
})
</script>

<template>
  <div>
    <h1 class="text-h4 mb-6">관리자 페이지</h1>
    
    <!-- 공지사항 섹션 -->
    <v-card class="mb-6">
      <v-card-title>공지사항 관리</v-card-title>
      <v-card-text>
        <v-textarea
          v-model="newAnnouncement"
          label="새 공지사항"
          rows="3"
          class="mb-4"
        ></v-textarea>
        <v-btn
          color="primary"
          :loading="loading"
          @click="createAnnouncement"
        >
          공지사항 작성
        </v-btn>
        
        <!-- 공지사항 목록 -->
        <v-list class="mt-4">
          <v-list-item
            v-for="announcement in announcements"
            :key="announcement.id"
            :class="{ 'bg-primary-lighten-5': announcement.active }"
          >
            <template v-slot:prepend>
              <v-icon :color="announcement.active ? 'primary' : 'grey'">
                {{ announcement.active ? 'ph-megaphone' : 'ph-megaphone-off' }}
              </v-icon>
            </template>
            
            <v-list-item-title>
              {{ announcement.content }}
            </v-list-item-title>
            
            <v-list-item-subtitle class="mt-1">
              {{ new Date(announcement.createdAt).toLocaleString() }}
            </v-list-item-subtitle>
            
            <template v-slot:append>
              <v-btn
                icon="mdi-toggle-switch"
                :color="announcement.active ? 'primary' : 'grey'"
                variant="text"
                @click="toggleAnnouncement(announcement)"
                :title="announcement.active ? '비활성화' : '활성화'"
              >
                <v-icon>
                  {{ announcement.active ? 'mdi-toggle-switch' : 'mdi-toggle-switch-off' }}
                </v-icon>
              </v-btn>
              
              <v-btn
                icon="mdi-delete"
                color="error"
                variant="text"
                @click="deleteAnnouncement(announcement.id)"
                title="삭제"
              >
                <v-icon>mdi-delete</v-icon>
              </v-btn>
            </template>
          </v-list-item>
        </v-list>
      </v-card-text>
    </v-card>
    
    <!-- 사용자 관리 섹션 -->
    <v-card>
      <v-card-title>사용자 관리</v-card-title>
      <v-card-text>
        <v-list>
          <v-list-item
            v-for="user in users"
            :key="user.id"
          >
            <template v-slot:prepend>
              <v-avatar color="primary" size="32">
                <span class="text-h6">{{ user.displayName?.[0]?.toUpperCase() || '?' }}</span>
              </v-avatar>
            </template>
            
            <v-list-item-title>
              {{ user.displayName }} (@{{ user.handle }})
            </v-list-item-title>
            
            <template v-slot:append>
              <v-btn
                :color="user.isBanned ? 'success' : 'error'"
                @click="toggleBan(user.id)"
              >
                {{ user.isBanned ? '차단 해제' : '차단' }}
              </v-btn>
            </template>
          </v-list-item>
        </v-list>
      </v-card-text>
    </v-card>
  </div>
</template>

<style scoped>
.admin-section {
  margin-bottom: 2rem;
}

.bg-primary-lighten-5 {
  background-color: var(--v-primary-lighten-5);
}
</style> 