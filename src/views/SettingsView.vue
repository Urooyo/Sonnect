<script setup>
import { ref, onMounted, computed, inject } from 'vue'
import { useDisplay } from 'vuetify'
import { useRouter } from 'vue-router'
import { useTheme } from 'vuetify'
import { 
  updateProfile, 
  updatePassword,
  EmailAuthProvider,
  reauthenticateWithCredential,
  deleteUser,
  signOut
} from 'firebase/auth'
import { auth, db, updateUserInfo, deleteUserAccount } from '@/firebase'

const showAlert = inject('showAlert')
const showLoading = inject('showLoading')
const showLogoutDialog = ref(false)
const { mobile } = useDisplay()

const router = useRouter()
const theme = useTheme()
const isDark = computed({
  get: () => theme.global.current.value.dark,
  set: (value) => {
    theme.global.name.value = value ? 'dark' : 'light'
    localStorage.setItem('theme', value ? 'dark' : 'light')
  }
})

const form = ref(null)
const showCurrentPassword = ref(false)
const showNewPassword = ref(false)

// 폼 데이터
const displayName = ref(auth.currentUser?.displayName || '')
const currentPassword = ref('')
const newPassword = ref('')

// 비밀번호 규칙
const passwordRules = [
  v => !!v || '비밀번호를 입력해주세요',
  v => v?.length >= 16 || '비밀번호는 최소 16자 이상이어야 해요',
  v => /[A-Z]/.test(v) || '대문자를 포함해야 해요',
  v => /[a-z]/.test(v) || '소문자를 포함해야 해요',
  v => /[0-9]/.test(v) || '숫자를 포함해야 해요',
  v => /[!@#$%^&*]/.test(v) || '특수문자(!@#$%^&*)를 포함해야 해요'
]

// 계정 삭제 관련 상태
const showDeleteDialog = ref(false)
const deleteConfirmText = ref('')
const deleteLoading = ref(false)
const deletePassword = ref('')
const CONFIRM_TEXT = '계정 삭제'

onMounted(() => {
  if (auth.currentUser) {
    displayName.value = auth.currentUser.displayName || ''
  }
})

const handleUpdateProfile = async () => {
  if (!form.value.validate()) return
  
  localLoading.value = true
  try {
    await updateProfile(auth.currentUser, {
      displayName: displayName.value,
      photoURL: auth.currentUser.photoURL
    })
    
    await updateUserInfo(auth.currentUser.uid, {
      displayName: displayName.value,
      handle: auth.currentUser.photoURL
    })
    
    showAlert('프로필이 업데이트되었어요!🎉')
  } catch (e) {
    console.error('Error updating profile:', e)
    showAlert('프로필 업데이트 중 오류가 발생했어요.', 'error')
  } finally {
    localLoading.value = false
  }
}

const updateUserPassword = async () => {
  const { valid } = await form.value.validate()
  if (!valid) return
  if (!currentPassword.value || !newPassword.value) return
  
  localLoading.value = true
  try {
    // 재인증
    const credential = EmailAuthProvider.credential(
      auth.currentUser.email,
      currentPassword.value
    )
    await reauthenticateWithCredential(auth.currentUser, credential)
    
    // 비밀번호 업데이트
    await updatePassword(auth.currentUser, newPassword.value)
    
    showAlert('비밀번호가 성공적으로 변경되었어요! 🎉')
    currentPassword.value = ''
    newPassword.value = ''
  } catch (e) {
    console.error(e)
    if (e.code === 'auth/wrong-password') {
      showAlert('현재 비밀번호가 올바르지 않아요!', 'error')
    } else {
      showAlert('비밀번호 변경 중 오류가 발생했어요.', 'error')
    }
  } finally {
    localLoading.value = false
  }
}

const handleDeleteAccount = async () => {
  if (deleteConfirmText.value !== CONFIRM_TEXT) return
  if (!deletePassword.value) {
    showAlert('비밀번호를 입력해주세요!', 'error')
    return
  }
  
  deleteLoading.value = true
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
      showAlert('보안을 위해 다시 로그인한 후 시도해주세요!', 'error')
    } else if (e.code === 'auth/wrong-password') {
      showAlert('비밀번호가 올바르지 않아요!', 'error')
    } else {
      showAlert('계정 삭제 중 오류가 발생했어요.', 'error')
    }
  } finally {
    deleteLoading.value = false
    deleteConfirmText.value = ''
    deletePassword.value = ''
  }
}

const handleLogout = async () => {
  localLoading.value = true
  try {
    await signOut(auth)
    await router.push('/')
    showAlert('로그아웃되었어요. 다음에 또 만나요! 👋')
  } catch (error) {
    console.error('Error logging out:', error)
    showAlert('로그아웃 중 오류가 발생했어요.', 'error')
  } finally {
    localLoading.value = false
  }
}

const openLogoutConfirm = () => {
  showLogoutDialog.value = true
}
</script>

<template>
  <v-container>
    <v-row justify="center">
      <v-col cols="12" sm="8" md="6">
        <!-- 인터페이스 수정 -->
        <v-card class="mb-4">
          <v-card-title>인터페이스</v-card-title>
          <v-card-text>
            <v-list>
              <v-list-item>
                <template v-slot:prepend>
                  <v-icon>mdi-brightness-6</v-icon>
                </template>
                <v-list-item-title>
                  <v-tooltip location="right" text="밝은/어두운 테마를 변경해요">
                    <template v-slot:activator="{ props }">
                      <span v-bind="props">테마 변경하기</span>
                    </template>
                  </v-tooltip>
                </v-list-item-title>
                <template v-slot:append>
                  <v-switch
                    v-model="isDark"
                    hide-details
                    inset
                  ></v-switch>
                </template>
              </v-list-item>
            </v-list>
          </v-card-text>
        </v-card>

        <!-- 로그인하지 않은 경우 안내 메시지 표시 -->
        <v-alert
          v-if="!auth.currentUser"
          type="info"
          class="mb-4"
          :v-btn rounded="lg"
        >
          계정 설정을 보려면 로그인을 해주세요.
        </v-alert>

        <!-- 계정 설정 (로그인한 사용자만) -->
        <template v-if="auth.currentUser">
          <!-- 계정 섹션 -->
          <v-card class="mb-4">
            <v-card-title>계정</v-card-title>
            <v-card-text>
              <v-list>
                <!-- 로그아웃 버튼 -->
                <v-list-item>
                  <template v-slot:prepend>
                    <v-icon>mdi-logout</v-icon>
                  </template>
                  <v-list-item-title>로그아웃</v-list-item-title>
                  <template v-slot:append>
                    <v-btn
                      color="primary"
                      variant="text"
                      @click="openLogoutConfirm"
                      :loading="loading"
                    >
                      로그아웃
                    </v-btn>
                  </template>
                </v-list-item>
                
                <!-- 계정 삭제 버튼 -->
                <v-list-item>
                  <template v-slot:prepend>
                    <v-icon color="error">mdi-delete</v-icon>
                  </template>
                  <v-list-item-title class="text-error">계정 삭제</v-list-item-title>
                  <template v-slot:append>
                    <v-btn
                      color="error"
                      variant="text"
                      @click="showDeleteDialog = true"
                    >
                      계정 삭제
                    </v-btn>
                  </template>
                </v-list-item>
              </v-list>
            </v-card-text>
          </v-card>

          <!-- 프로필 설정 -->
          <v-card class="mb-4">
            <v-card-title>프로필 설정</v-card-title>
            <v-card-text>
              <v-form @submit.prevent="handleUpdateProfile" ref="form">
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

          <!-- 비밀번호 변경 -->
          <v-card class="mb-4">
            <v-card-title>비밀번호 변경</v-card-title>
            <v-card-text>
              <v-form ref="form" @submit.prevent="updateUserPassword">
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

          <!-- 계정 삭제 확인 다이얼로그 -->
          <v-dialog v-model="showDeleteDialog" max-width="500">
            <v-card>
              <v-card-title class="text-error">
                ⚠️ 계정 영구 삭제
              </v-card-title>
              <v-card-text>
                <p class="text-body-1 mb-4">
                  <strong>이 작업은 되돌릴 수 없어요!</strong> 다음과 같은 모든 데이터가 영구적으로 삭제될 거예요:
                </p>
                <ul class="mb-4">
                  <li>모든 게시물 및 댓글</li>
                  <li>프로필 정보</li>
                  <li>활동 기록</li>
                  <li>기타 모든 관련 데이터</li>
                </ul>
                <p class="text-body-1 mb-4">
                  계정을 삭제하려면 아래에 <strong>'{{ CONFIRM_TEXT }}'</strong>를 입력해주세요.
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

          <!-- 로그아웃 확인 다이얼로그 -->
          <v-dialog
            v-model="showLogoutDialog"
            :fullscreen="mobile"
            :transition="mobile ? 'dialog-bottom-transition' : 'dialog-transition'"
            max-width="400"
            class="logout-dialog"
          >
            <v-card :class="{ 'mobile-dialog': mobile }">
              <v-card-title class="text-center pa-4">
                <v-icon size="48" color="primary" class="mb-2">mdi-logout</v-icon>
                <div class="text-h5">정말로 로그아웃 하시겠어요?!?!</div>
              </v-card-title>
              
              <v-card-text class="text-center pb-4">
                <p class="text-body-1">잠시 쉬었다 오시나요?</p>
                <p class="text-body-2">언제든 다시 로그인하실 수 있어요.</p>
              </v-card-text>
              
              <v-card-actions class="pa-4">
                <v-row>
                  <v-col cols="12" :sm="6">
                    <v-btn
                      block
                      variant="outlined"
                      @click="showLogoutDialog = false"
                      class="mb-2 mb-sm-0"
                    >
                      돌아갈래요
                    </v-btn>
                  </v-col>
                  <v-col cols="12" :sm="6">
                    <v-btn
                      block
                      color="primary"
                      @click="handleLogout"
                      :loading="loading"
                    >
                      네, 할래요
                    </v-btn>
                  </v-col>
                </v-row>
              </v-card-actions>
            </v-card>
          </v-dialog>
        </template>
      </v-col>
    </v-row>
  </v-container>
</template>

<style scoped>
.bg-error-lighten-5 {
  background-color: rgb(255, 235, 238) !important;
}

/* 모바일 다이얼로그 스타일 */
.mobile-dialog {
  position: absolute;
  bottom: 0;
  margin: 0;
  padding-bottom: env(safe-area-inset-bottom);
  border-radius: 24px 24px 0 0;
}

/* 데스크톱 다이얼로그 스타일 */
.v-dialog:not(.v-dialog--fullscreen) .v-card {
  border-radius: 16px;
}
</style> 