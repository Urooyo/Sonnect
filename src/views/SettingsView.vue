<script setup>
import { ref, computed, inject } from 'vue'
import { useTheme } from 'vuetify'
import { auth } from '@/firebase'
import { signOut, EmailAuthProvider, reauthenticateWithCredential, updatePassword, deleteUser, updateProfile } from 'firebase/auth'
import { useRouter } from 'vue-router'
import { deleteUserAccount, updateUserInfo } from '@/firebase'
import { doc, updateDoc, getDoc } from 'firebase/firestore'
import { db } from '@/firebase'

const theme = useTheme()
const router = useRouter()
const form = ref(null)

// 다이얼로그 상태 관리
const showAccountDialog = ref(false)
const showPasswordDialog = ref(false)
const showProfileDialog = ref(false)
const showHandleDialog = ref(false)
const showLogoutDialog = ref(false)
const showDeleteAccountDialog = ref(false)

// 입력 필드 상태 관리
const currentPassword = ref('')
const newPassword = ref('')
const displayName = ref('')
const handle = ref('')
const deletePassword = ref('')
const deleteConfirmText = ref('')
const bio = ref('')

// 로딩 상태
const localLoading = ref(false)
const deleteLoading = ref(false)

const CONFIRM_TEXT = '계정 삭제'

const themePreference = inject('themePreference')
const setThemePreference = inject('setThemePreference')
const version = inject('version')

// user 상태 주입
const user = inject('user')
const openLoginDialog = inject('openLoginDialog')

const themeOptions = [
  { value: 'system', title: '기기 테마', icon: 'mdi-monitor' },
  { value: 'light', title: '밝은 테마', icon: 'mdi-weather-sunny' },
  { value: 'dark', title: '어두운 테마', icon: 'mdi-weather-night' }
]

// 테마 토글
const toggleTheme = () => {
  theme.global.name.value = theme.global.current.value.dark ? 'light' : 'dark'
}

// 비밀번호 변경
const updateUserPassword = async () => {
  if (!currentPassword.value || !newPassword.value) return
  
  localLoading.value = true
  try {
    const credential = EmailAuthProvider.credential(
      auth.currentUser.email,
      currentPassword.value
    )
    await reauthenticateWithCredential(auth.currentUser, credential)
    await updatePassword(auth.currentUser, newPassword.value)
    
    showPasswordDialog.value = false
    currentPassword.value = ''
    newPassword.value = ''
    showAlert('비밀번호가 변경되었어요! 🔒')
  } catch (error) {
    console.error('Error updating password:', error)
    showAlert('비밀번호 변경 중 오류가 발생했어요.', 'error')
  } finally {
    localLoading.value = false
  }
}

// 로그아웃
const handleLogout = async () => {
  localLoading.value = true
  try {
    await signOut(auth)
    router.push('/')
  } catch (error) {
    console.error('Error signing out:', error)
    showAlert('로그아웃 중 오류가 발생했어요.', 'error')
  } finally {
    localLoading.value = false
  }
}

// 계정 삭제
const handleDeleteAccount = async () => {
  if (!deletePassword.value || deleteConfirmText.value !== CONFIRM_TEXT) return
  
  deleteLoading.value = true
  try {
    const credential = EmailAuthProvider.credential(
      auth.currentUser.email,
      deletePassword.value
    )
    await reauthenticateWithCredential(auth.currentUser, credential)
    await deleteUserAccount(auth.currentUser.uid)
    await deleteUser(auth.currentUser)
    
    router.push('/login')
  } catch (error) {
    console.error('Error deleting account:', error)
    showAlert('계정 삭제 중 오류가 발생했어요.', 'error')
  } finally {
    deleteLoading.value = false
  }
}

// 알림 표시 함수
const showAlert = (message, type = 'success') => {
  // 알림 표시 로직 구현
}

// 프로필 업데이트
const updateUserProfile = async () => {
  if (!displayName.value.trim()) return
  
  localLoading.value = true
  try {
    // Firebase Auth 사용자 프로필 업데이트
    await updateProfile(auth.currentUser, {
      displayName: displayName.value.trim()
    })
    
    // Firestore users 컬렉션 업데이트
    const userRef = doc(db, 'users', auth.currentUser.uid)
    await updateDoc(userRef, {
      displayName: displayName.value.trim(),
      bio: bio.value.trim(),
      updatedAt: new Date().toISOString()
    })
    
    showProfileDialog.value = false
    showAlert('프로필이 업데이트되었어요.')
  } catch (error) {
    console.error('Error updating profile:', error)
    showAlert('프로필 업데이트 중 오류가 발생했어요.', 'error')
  } finally {
    localLoading.value = false
  }
}

// 다이얼로그를 열 때 현재 표시 이름을 불러오기
const openProfileDialog = async () => {
  displayName.value = auth.currentUser?.displayName || ''
  // Firestore에서 현재 bio 가져오기
  const userDoc = await getDoc(doc(db, 'users', auth.currentUser.uid))
  bio.value = userDoc.data()?.bio || ''
  showProfileDialog.value = true
}
</script>

<template>
  <div>
    <!-- 헤더 -->
    <v-app-bar flat class="border-b">
      <v-app-bar-title>설정</v-app-bar-title>
    </v-app-bar>

    <!-- 설정 목록 -->
    <v-list class="settings-list">
      <!-- 테마 섹션 - 모든 사용자에게 표시 -->
      <v-list-subheader>테마</v-list-subheader>
      <v-list-item
        v-for="option in themeOptions"
        :key="option.value"
        :prepend-icon="option.icon"
        :title="option.title"
        :active="themePreference === option.value"
        @click="setThemePreference(option.value)"
      >
        <template v-slot:append>
          <v-icon v-if="themePreference === option.value" color="primary">
            mdi-check
          </v-icon>
        </template>
      </v-list-item>

      <!-- 로그인한 사용자에게만 표시되는 섹션들 -->
      <template v-if="user">
        <!-- 계정 정보 섹션 -->
        <v-divider />
        <v-list-subheader>계정</v-list-subheader>
        <v-list-item
          prepend-icon="mdi-account"
          title="계정 정보"
          subtitle="이메일 주소와 같은 계정 정보를 조회하세요."
          @click="showAccountDialog = true"
        />
        <v-list-item
          prepend-icon="mdi-key"
          title="비밀번호 변경"
          subtitle="안전한 비밀번호로 변경하세요."
          @click="showPasswordDialog = true"
        />

        <!-- 개인정보 섹션 -->
        <v-divider />
        <v-list-subheader>개인정보</v-list-subheader>
        <v-list-item
          prepend-icon="mdi-account-edit"
          title="프로필 수정"
          subtitle="이름과 프로필 사진을 변경하세요."
          @click="openProfileDialog"
        />

        <!-- 계정 관리 섹션 -->
        <v-divider />
        <v-list-subheader>계정 관리</v-list-subheader>
        <v-list-item
          prepend-icon="mdi-logout"
          title="로그아웃"
          subtitle="이 기기에서 로그아웃합니다."
          @click="showLogoutDialog = true"
          color="error"
        />
        <v-list-item
          prepend-icon="mdi-delete-alert"
          title="계정 삭제"
          subtitle="계정을 영구적으로 삭제합니다."
          @click="showDeleteAccountDialog = true"
          color="error"
        />
      </template>

      <!-- 비로그인 사용자를 위한 로그인 유도 메시지 -->
      <template v-else>
        <v-divider />
        <v-list-item
          prepend-icon="mdi-login"
          title="더 많은 설정 보기"
          subtitle="로그인하여 모든 설정을 관리하세요."
          @click="openLoginDialog"
          color="primary"
        />
      </template>

      <!-- 버전 정보 섹션 - 모든 사용자에게 표시 -->
      <v-divider />
      <v-list-subheader>정보</v-list-subheader>
      <v-list-item
        prepend-icon="mdi-information"
        title="버전"
        :subtitle="version"
      />
    </v-list>

    <!-- 다이얼로그들 -->
    <v-dialog v-model="showAccountDialog" max-width="500">
      <v-card>
        <v-card-title>계정 정보</v-card-title>
        <v-card-text>
          <div class="text-subtitle-1 mb-2">이메일</div>
          <div class="text-body-1 mb-4">{{ auth.currentUser?.email }}</div>
        </v-card-text>
        <v-card-actions>
          <v-spacer />
          <v-btn variant="text" @click="showAccountDialog = false">닫기</v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>

    <v-dialog v-model="showPasswordDialog" max-width="500">
      <v-card>
        <v-card-title>비밀번호 변경</v-card-title>
        <v-card-text>
          <v-form ref="form">
            <v-text-field
              v-model="currentPassword"
              label="현재 비밀번호"
              type="password"
              :rules="[v => !!v || '현재 비밀번호를 입력해주세요']"
            />
            <v-text-field
              v-model="newPassword"
              label="새 비밀번호"
              type="password"
              :rules="[v => !!v || '새 비밀번호를 입력해주세요']"
            />
          </v-form>
          <div class="text-caption text-medium-emphasis mt-4">
            비밀번호를 잊어버렸다면 관리자분에게 문의해주세요!
          </div>
        </v-card-text>
        <v-card-actions>
          <v-spacer />
          <v-btn variant="text" @click="showPasswordDialog = false">취소</v-btn>
          <v-btn 
            color="primary" 
            :loading="localLoading"
            @click="updateUserPassword"
          >
            변경
          </v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>

    <v-dialog v-model="showProfileDialog" max-width="500">
      <v-card>
        <v-card-title>프로필 수정</v-card-title>
        <v-card-text>
          <v-text-field
            v-model="displayName"
            label="이름"
            :rules="[v => !!v || '이름을 입력해주세요']"
            class="mb-4"
          />
          <v-textarea
            v-model="bio"
            label="프로필 설명"
            placeholder="자신을 소개해주세요"
            auto-grow
            rows="3"
            maxlength="160"
            counter
          />
        </v-card-text>
        <v-card-actions>
          <v-spacer />
          <v-btn variant="text" @click="showProfileDialog = false">취소</v-btn>
          <v-btn 
            color="primary" 
            :loading="localLoading"
            @click="updateUserProfile"
          >
            저장
          </v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>

    <v-dialog v-model="showLogoutDialog" max-width="400">
      <v-card>
        <v-card-title>로그아웃</v-card-title>
        <v-card-text>정말 로그아웃하시겠어요?</v-card-text>
        <v-card-actions>
          <v-spacer />
          <v-btn variant="text" @click="showLogoutDialog = false">취소</v-btn>
          <v-btn 
            color="primary" 
            :loading="localLoading"
            @click="handleLogout"
          >
            로그아웃
          </v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>

    <v-dialog v-model="showDeleteAccountDialog" max-width="500">
      <v-card>
        <v-card-title>계정 삭제</v-card-title>
        <v-card-text>
          <p class="mb-4">계정을 삭제하면 모든 데이터가 영구적으로 삭제됩니다.</p>
          <v-text-field
            v-model="deletePassword"
            label="비밀번호"
            type="password"
            :rules="[v => !!v || '비밀번호를 입력해주세요']"
          />
          <v-text-field
            v-model="deleteConfirmText"
            :label="`'${CONFIRM_TEXT}'를 입력하세요`"
            :rules="[v => v === CONFIRM_TEXT || '텍스트가 일치하지 않습니다']"
          />
        </v-card-text>
        <v-card-actions>
          <v-spacer />
          <v-btn variant="text" @click="showDeleteAccountDialog = false">취소</v-btn>
          <v-btn 
            color="error" 
            :loading="deleteLoading"
            :disabled="deleteConfirmText !== CONFIRM_TEXT"
            @click="handleDeleteAccount"
          >
            삭제
          </v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>
  </div>
</template>

<style scoped>
.border-b {
  border-bottom: 1px solid rgb(var(--v-theme-border-color));
}

.settings-list {
  max-width: 600px;
  margin: 0 auto;
}

:deep(.v-list-item) {
  min-height: 72px;
  padding: 16px;
}

:deep(.v-list-subheader) {
  font-size: 15px;
  font-weight: 500;
  padding: 16px;
}

:deep(.v-list-item-subtitle) {
  margin-top: 4px;
  opacity: 0.7;
}
</style> 