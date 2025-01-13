<script setup>
import { ref, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { 
  updateProfile, 
  updatePassword,
  EmailAuthProvider,
  reauthenticateWithCredential,
  deleteUser
} from 'firebase/auth'
import { auth, db, updateUserInfo, deleteUserAccount } from '@/firebase'

const router = useRouter()
const form = ref(null)
const loading = ref(false)
const error = ref('')
const success = ref('')
const showCurrentPassword = ref(false)
const showNewPassword = ref(false)

// 폼 데이터
const displayName = ref(auth.currentUser?.displayName || '')
const currentPassword = ref('')
const newPassword = ref('')

// 비밀번호 규칙
const passwordRules = [
  v => !!v || '비밀번호를 입력해주세요',
  v => v?.length >= 16 || '비밀번호는 최소 16자 이상이어야 합니다',
  v => /[A-Z]/.test(v) || '대문자를 포함해야 합니다',
  v => /[a-z]/.test(v) || '소문자를 포함해야 합니다',
  v => /[0-9]/.test(v) || '숫자를 포함해야 합니다',
  v => /[!@#$%^&*]/.test(v) || '특수문자(!@#$%^&*)를 포함해야 합니다'
]

// 계정 삭제 관련 상태
const showDeleteDialog = ref(false)
const deleteConfirmText = ref('')
const deleteLoading = ref(false)
const deletePassword = ref('')
const CONFIRM_TEXT = '계정 삭제'

onMounted(() => {
  if (!auth.currentUser) {
    router.push('/')
    return
  }
  displayName.value = auth.currentUser.displayName || ''
})

const handleUpdateProfile = async () => {
  if (!form.value.validate()) return
  
  loading.value = true
  error.value = ''
  success.value = ''
  
  try {
    // Firebase Auth 프로필 업데이트
    await updateProfile(auth.currentUser, {
      displayName: displayName.value,
      photoURL: auth.currentUser.photoURL
    })
    
    // Firestore 사용자 정보 업데이트
    await updateUserInfo(auth.currentUser.uid, {
      displayName: displayName.value,
      handle: auth.currentUser.photoURL
    })
    
    success.value = '프로필이 업데이트되었습니다.'
  } catch (e) {
    console.error('Error updating profile:', e)
    error.value = '프로필 업데이트 중 오류가 발생했습니다.'
    success.value = ''
  } finally {
    loading.value = false
  }
}

const updateUserPassword = async () => {
  const { valid } = await form.value.validate()
  if (!valid) return
  if (!currentPassword.value || !newPassword.value) return
  
  loading.value = true
  error.value = ''
  success.value = ''
  
  try {
    // 재인증
    const credential = EmailAuthProvider.credential(
      auth.currentUser.email,
      currentPassword.value
    )
    await reauthenticateWithCredential(auth.currentUser, credential)
    
    // 비밀번호 업데이트
    await updatePassword(auth.currentUser, newPassword.value)
    
    success.value = '비밀번호가 성공적으로 변경되었습니다.'
    currentPassword.value = ''
    newPassword.value = ''
  } catch (e) {
    console.error(e)
    if (e.code === 'auth/wrong-password') {
      error.value = '현재 비밀번호가 올바르지 않습니다.'
    } else {
      error.value = '비밀번호 변경 중 오류가 발생했습니다.'
    }
  } finally {
    loading.value = false
  }
}

const handleDeleteAccount = async () => {
  if (deleteConfirmText.value !== CONFIRM_TEXT) return
  if (!deletePassword.value) {
    error.value = '비밀번호를 입력해주세요.'
    return
  }
  
  deleteLoading.value = true
  error.value = ''
  
  try {
    // 재인증 필요
    const credential = EmailAuthProvider.credential(
      auth.currentUser.email,
      deletePassword.value
    )
    await reauthenticateWithCredential(auth.currentUser, credential)
    
    // 모든 사용자 데이터 삭제
    await deleteUserAccount(auth.currentUser.uid)
    
    // Firebase Auth 계정 삭제
    await deleteUser(auth.currentUser)
    router.push('/')
  } catch (e) {
    console.error('Error deleting account:', e)
    if (e.code === 'auth/requires-recent-login') {
      error.value = '보안을 위해 다시 로그인한 후 시도해주세요.'
    } else if (e.code === 'auth/wrong-password') {
      error.value = '비밀번호가 올바르지 않습니다.'
    } else {
      error.value = '계정 삭제 중 오류가 발생했습니다.'
    }
  } finally {
    deleteLoading.value = false
    deleteConfirmText.value = ''
    deletePassword.value = ''
  }
}
</script>

<template>
  <v-container>
    <h1 class="text-h4 mb-6">설정</h1>
    
    <v-card class="mb-6">
      <v-card-title>프로필 설정</v-card-title>
      <v-card-text>
        <v-form @submit.prevent="handleUpdateProfile">
          <v-text-field
            v-model="displayName"
            label="표시 이름"
            required
            :rules="[v => !!v || '표시 이름을 입력해주세요']"
          ></v-text-field>
          
          <v-btn
            color="primary"
            type="submit"
            :loading="loading"
            :disabled="!displayName.trim()"
          >
            표시 이름 업데이트
          </v-btn>
        </v-form>
      </v-card-text>
    </v-card>
    
    <v-card>
      <v-card-title>비밀번호 변경</v-card-title>
      <v-card-text>
        <v-form 
          ref="form"
          @submit.prevent="updateUserPassword"
        >
          <v-text-field
            v-model="currentPassword"
            label="현재 비밀번호"
            :type="showCurrentPassword ? 'text' : 'password'"
            :append-inner-icon="showCurrentPassword ? 'mdi-eye-off' : 'mdi-eye'"
            @click:append-inner="showCurrentPassword = !showCurrentPassword"
            required
          ></v-text-field>
          
          <v-text-field
            v-model="newPassword"
            label="새 비밀번호"
            :type="showNewPassword ? 'text' : 'password'"
            :append-inner-icon="showNewPassword ? 'mdi-eye-off' : 'mdi-eye'"
            @click:append-inner="showNewPassword = !showNewPassword"
            required
            :rules="passwordRules"
            hint="대소문자, 숫자, 특수문자(!@#$%^&*)를 조합하여 16자 이상"
            persistent-hint
          ></v-text-field>
          
          <v-btn
            color="primary"
            type="submit"
            :loading="loading"
            :disabled="!currentPassword || !newPassword"
            class="mt-4"
          >
            비밀번호 변경
          </v-btn>
        </v-form>
      </v-card-text>
    </v-card>
    
    <v-card class="mt-6 bg-error-lighten-5">
      <v-card-title class="text-error">
        위험 구역
      </v-card-title>
      <v-card-text>
        <p class="text-body-1 mb-4">
          계정을 삭제하면 모든 데이터가 영구적으로 삭제되며 복구할 수 없습니다.
        </p>
        <v-btn
          color="error"
          variant="outlined"
          @click="showDeleteDialog = true"
        >
          계정 삭제
        </v-btn>
      </v-card-text>
    </v-card>
    
    <v-dialog v-model="showDeleteDialog" max-width="500">
      <v-card>
        <v-card-title class="text-error">
          ⚠️ 계정 영구 삭제
        </v-card-title>
        <v-card-text>
          <p class="text-body-1 mb-4">
            <strong>이 작업은 되릴 수 없습니다.</strong> 다음과 같은 모든 데이터가 영구적으로 삭제됩니다:
          </p>
          <ul class="mb-4">
            <li>모든 게시물 및 댓글</li>
            <li>프로필 정보</li>
            <li>활동 기록</li>
            <li>기타 모든 정보 관련 데이터</li>
          </ul>
          <p class="text-body-1 mb-4">
            계정을 삭제하려면 아래에 <strong>'{{ CONFIRM_TEXT }}'</strong>를 입력하세요.
          </p>
          <v-text-field
            v-model="deleteConfirmText"
            label="확인 문구 입력"
            :rules="[v => v === CONFIRM_TEXT || '정확한 문구를 입력해주세요']"
            variant="outlined"
            density="comfortable"
          ></v-text-field>
          <v-text-field
            v-model="deletePassword"
            label="계정 비밀번호"
            type="password"
            variant="outlined"
            density="comfortable"
            :rules="[v => !!v || '비밀번호를 입력해주세요']"
          ></v-text-field>
        </v-card-text>
        <v-card-actions>
          <v-spacer></v-spacer>
          <v-btn
            variant="text"
            @click="showDeleteDialog = false"
          >
            취소
          </v-btn>
          <v-btn
            color="error"
            :loading="deleteLoading"
            :disabled="deleteConfirmText !== CONFIRM_TEXT"
            @click="handleDeleteAccount"
          >
            계정 영구 삭제
          </v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>
    
    <v-alert
      v-if="error"
      type="error"
      class="mt-4"
    >
      {{ error }}
    </v-alert>
    
    <v-alert
      v-if="success"
      type="success"
      class="mt-4"
    >
      {{ success }}
    </v-alert>
  </v-container>
</template>

<style scoped>
.bg-error-lighten-5 {
  background-color: rgb(255, 235, 238) !important;
}
</style> 