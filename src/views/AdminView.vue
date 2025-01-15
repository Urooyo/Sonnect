<script setup>
import { ref, onMounted } from 'vue'
import { collection, query, getDocs, updateDoc, doc, addDoc, orderBy, deleteDoc, Timestamp } from 'firebase/firestore'
import { db, auth } from '@/firebase'
import { useRouter } from 'vue-router'

const router = useRouter()
const users = ref([])
const announcements = ref([])
const newAnnouncement = ref({
  content: '',
  active: true,
  backgroundColor: '#1867C0', // 기본 색상 (Vuetify primary)
})
const editingAnnouncement = ref({
  id: '',
  content: '',
  active: true,
  backgroundColor: '#1867C0',
})
const loading = ref(false)
const showEditDialog = ref(false)

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

// 공지사항 추가
const addAnnouncement = async () => {
  if (!newAnnouncement.value.content) return
  
  try {
    await addDoc(collection(db, 'announcements'), {
      content: newAnnouncement.value.content,
      active: newAnnouncement.value.active,
      backgroundColor: newAnnouncement.value.backgroundColor,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    })
    
    newAnnouncement.value = {
      content: '',
      active: true,
      backgroundColor: '#1867C0'
    }
    
    await loadAnnouncements()
    showAlert('공지사항이 추가되었어요.')
  } catch (error) {
    console.error('Error adding announcement:', error)
    showAlert('공지사항 추가 중 오류가 발생했어요.', 'error')
  }
}

// 공지사항 수정
const updateAnnouncement = async () => {
  if (!editingAnnouncement.value.content) return
  
  try {
    await updateDoc(doc(db, 'announcements', editingAnnouncement.value.id), {
      content: editingAnnouncement.value.content,
      active: editingAnnouncement.value.active,
      backgroundColor: editingAnnouncement.value.backgroundColor,
      updatedAt: new Date().toISOString()
    })
    
    showEditDialog.value = false
    await loadAnnouncements()
    showAlert('공지사항이 수정되었어요.')
  } catch (error) {
    console.error('Error updating announcement:', error)
    showAlert('공지사항 수정 중 오류가 발생했어요.', 'error')
  }
}

// 공지사항 수정 다이얼로그 열기
const openEditDialog = (announcement) => {
  editingAnnouncement.value = { ...announcement }
  showEditDialog.value = true
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
    
    <!-- 공지사항 관리 섹션 -->
    <v-card class="mb-4">
      <v-card-title>공지사항 관리</v-card-title>
      <v-card-text>
        <v-textarea
          v-model="newAnnouncement.content"
          label="공지사항 내용"
          rows="3"
          class="mb-4"
        />
        
        <div class="d-flex align-center mb-4">
          <v-switch
            v-model="newAnnouncement.active"
            label="활성화"
            class="mr-4"
          />
          <v-color-picker
            v-model="newAnnouncement.backgroundColor"
            mode="hex"
            hide-inputs
            hide-canvas
            class="mr-4"
          />
          <span class="text-caption">배경색</span>
        </div>

        <!-- 미리보기 -->
        <v-system-bar
          :color="newAnnouncement.backgroundColor"
          height="48"
          class="mb-4"
        >
          <div class="d-flex align-center justify-center w-100 text-center banner-text">
            {{ newAnnouncement.content || '공지사항 미리보기' }}
          </div>
        </v-system-bar>

        <v-btn
          color="primary"
          block
          @click="addAnnouncement"
          :disabled="!newAnnouncement.content"
        >
          공지사항 추가
        </v-btn>
      </v-card-text>
    </v-card>

    <!-- 공지사항 목록 -->
    <v-card>
      <v-card-title>공지사항 목록</v-card-title>
      <v-list>
        <v-list-item
          v-for="announcement in announcements"
          :key="announcement.id"
          :subtitle="announcement.content"
        >
          <template v-slot:prepend>
            <v-icon :color="announcement.backgroundColor">
              mdi-bullhorn
            </v-icon>
          </template>
          
          <template v-slot:append>
            <v-btn
              icon="mdi-pencil"
              variant="text"
              size="small"
              @click="openEditDialog(announcement)"
            />
            <v-btn
              icon="mdi-delete"
              variant="text"
              size="small"
              color="error"
              @click="deleteAnnouncement(announcement.id)"
            />
          </template>
        </v-list-item>
      </v-list>
    </v-card>

    <!-- 수정 다이얼로그 -->
    <v-dialog v-model="showEditDialog" max-width="500">
      <v-card>
        <v-card-title>공지사항 수정</v-card-title>
        <v-card-text>
          <v-textarea
            v-model="editingAnnouncement.content"
            label="공지사항 내용"
            rows="3"
            class="mb-4"
          />
          
          <div class="d-flex align-center mb-4">
            <v-switch
              v-model="editingAnnouncement.active"
              label="활성화"
              class="mr-4"
            />
            <v-color-picker
              v-model="editingAnnouncement.backgroundColor"
              mode="hex"
              hide-inputs
              hide-canvas
              class="mr-4"
            />
            <span class="text-caption">배경색</span>
          </div>

          <!-- 미리보기 -->
          <v-system-bar
            :color="editingAnnouncement.backgroundColor"
            height="48"
            class="mb-4"
          >
            <div class="d-flex align-center justify-center w-100 text-center banner-text">
              {{ editingAnnouncement.content || '공지사항 미리보기' }}
            </div>
          </v-system-bar>
        </v-card-text>
        <v-card-actions>
          <v-spacer />
          <v-btn variant="text" @click="showEditDialog = false">취소</v-btn>
          <v-btn
            color="primary"
            @click="updateAnnouncement"
            :disabled="!editingAnnouncement.content"
          >
            수정
          </v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>
    
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

.banner-text {
  font-size: 16px;
  line-height: 1.5;
}
</style> 