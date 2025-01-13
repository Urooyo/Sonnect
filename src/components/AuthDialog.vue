<script setup>
import { ref, watch, computed } from 'vue'
import { 
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  updateProfile
} from 'firebase/auth'
import { auth } from '@/firebase'
import { doc, setDoc, getDoc, getDocs, collection, query, where } from 'firebase/firestore'
import { db } from '@/firebase'

const props = defineProps({
  modelValue: Boolean,
  initialMode: {
    type: String,
    default: 'login'
  }
})

const emit = defineEmits(['update:modelValue'])

const isLogin = ref(true)
const email = ref('')
const password = ref('')
const displayName = ref('')
const handle = ref('')
const error = ref('')
const loading = ref(false)
const showPassword = ref(false)
const passwordRules = [
  v => !!v || '비밀번호를 입력해주세요',
  v => v?.length >= 6 || '비밀번호는 최소 6자 이상이어야 해요',
  v => /[A-Z]/.test(v) || '대문자를 포함해야 해요',
  v => /[a-z]/.test(v) || '소문자를 포함해야 해요',
  v => /[0-9]/.test(v) || '숫자를 포함해야 해요',
  v => /[!@#$%^&*]/.test(v) || '특수문자(!@#$%^&*)를 포함해야 해요'
]

const form = ref(null)
const isFormValid = ref(false)

const dialog = computed({
  get: () => props.modelValue,
  set: (value) => emit('update:modelValue', value)
})

// initialMode prop이 변경될 때마다 isLogin 값을 업데이트
watch(() => props.initialMode, (newMode) => {
  isLogin.value = newMode === 'login'
}, { immediate: true })

const toggleMode = () => {
  isLogin.value = !isLogin.value
  error.value = ''
  // 폼 초기화
  email.value = ''
  password.value = ''
  displayName.value = ''
  handle.value = ''
}

const handleSubmit = async () => {
  if (!isFormValid.value) return
  
  loading.value = true
  error.value = ''
  
  try {
    if (isLogin.value) {
      await handleLogin()
    } else {
      await handleRegister()
    }
    emit('update:modelValue', false)
  } catch (e) {
    error.value = e.message
  } finally {
    loading.value = false
  }
}

// Firebase 인증 에러 메시지 처리
const getErrorMessage = (code) => {
  switch (code) {
    case 'auth/email-already-in-use':
      return '이미 사용 중인 이메일입니다.'
    case 'auth/invalid-email':
      return '유효하지 않은 이메일 형식이에요.'
    case 'auth/operation-not-allowed':
      return '이메일/비밀번호 로그인이 비활성화되어 있어요.'
    case 'auth/weak-password':
      return '비밀번호가 너무 약해요.'
    case 'auth/user-disabled':
      return '해당 사용자 계정이 비활성화되었어요.'
    case 'auth/user-not-found':
      return '해당 이메일로 등록된 사용자가 없어요.'
    case 'auth/wrong-password':
      return '잘못된 비밀번호입니다.'
    case 'auth/too-many-requests':
      return '너무 많은 로그인 시도가 있었어요. 잠시 후 다시 시도해주세요.'
    default:
      return '로그인 중 오류가 발생했어요.'
  }
}

const handleRegister = async () => {
  if (!form.value.validate()) return
  
  loading.value = true
  error.value = ''
  
  try {
    // 이메일 중복 체크
    const usersRef = collection(db, 'users')
    const handleQuery = query(usersRef, where('handle', '==', handle.value))
    const handleSnapshot = await getDocs(handleQuery)
    
    if (!handleSnapshot.empty) {
      error.value = '이미 사용 중인 핸들이에요.'
      loading.value = false
      return
    }

    // Firebase Auth로 사용자 생�
    const { user } = await createUserWithEmailAndPassword(
      auth,
      email.value,
      password.value
    )
    
    // 사용자 프로필 업데이트
    try {
      await updateProfile(user, {
        displayName: displayName.value.trim(),
        photoURL: `@${handle.value.toLowerCase().trim()}`
      })
    } catch (profileError) {
      console.error('Error updating profile:', profileError)
      // 프로필 업데이트 실패 시에도 계속 진행
    }
    
    // Firestore에 사용자 정보 저장
    await setDoc(doc(db, 'users', user.uid), {
      displayName: displayName.value.trim(),
      handle: handle.value.toLowerCase().trim(),
      email: email.value,
      createdAt: new Date().toISOString(),
      role: 'user',
      bio: '',
      warnings: 0
    })
    
    // 프로필 정보가 제대로 설정되었는지 확인
    const userDoc = await getDoc(doc(db, 'users', user.uid))
    if (!userDoc.exists() || !userDoc.data().displayName) {
      throw new Error('사용자 프로필 설정 실패')
    }
    
    emit('update:modelValue', false)
  } catch (e) {
    console.error('Error during registration:', e)
    if (e.code === 'auth/email-already-in-use') {
      error.value = '이미 사용 중인 이메일이에요.'
    } else if (e.code === 'auth/invalid-email') {
      error.value = '올바른 이메일 형식이 아닙에요.'
    } else if (e.code === 'auth/weak-password') {
      error.value = '비밀번호가 너무 약해요.'
    } else {
      error.value = '회원가입 중 오류가 발생했어요.'
    }
  } finally {
    loading.value = false
  }
}

const handleLogin = async () => {
  if (!form.value.validate()) return
  
  loading.value = true
  error.value = ''
  
  try {
    const userCredential = await signInWithEmailAndPassword(
      auth,
      email.value,
      password.value
    )
    
    emit('update:modelValue', false)
  } catch (error) {
    console.error('Error during login:', error)
    error.value = getErrorMessage(error.code)
  } finally {
    loading.value = false
  }
}

// 핸들 유효성 검사를 위한 정규식
const handleRegex = /^[a-zA-Z0-9]+$/

// 핸들 유효성 검사 규칙
const handleRules = [
  v => !!v || '핸들을 입력해주세요',
  v => !v.includes(' ') || '공백을 포함할 수 없어요',
  v => handleRegex.test(v) || '영문자와 숫자만 사용할 수 있어요',
  v => v.length >= 3 || '최소 3자 이상이어야 해요',
  v => v.length <= 20 || '최대 20자까지 가능해요'
]
</script>

<template>
  <component 
    :is="$vuetify.display.smAndDown ? 'v-bottom-sheet' : 'v-dialog'"
    :model-value="modelValue" 
    @update:model-value="emit('update:modelValue', $event)" 
    :max-width="$vuetify.display.smAndDown ? undefined : '400'"
    :fullscreen="$vuetify.display.smAndDown"
  >
    <v-card>
      <!-- 모바일 헤 -->
      <v-toolbar
        v-if="$vuetify.display.smAndDown"
        color="primary"
        dark
      >
        <v-btn
          icon
          @click="emit('update:modelValue', false)"
        >
          <v-icon>mdi-close</v-icon>
        </v-btn>
        <v-toolbar-title>{{ isLogin ? '로그인' : '회원가입' }}</v-toolbar-title>
      </v-toolbar>

      <v-card-title v-if="!$vuetify.display.smAndDown" class="text-h5">
        {{ isLogin ? '로그인' : '회원가입' }}
      </v-card-title>
      
      <v-card-text>
        <v-form 
          ref="form"
          @submit.prevent="handleSubmit"
          v-model="isFormValid"
          class="mt-4"
        >
          <v-text-field
            v-model="email"
            label="이메일"
            type="email"
            required
            :rules="[v => !!v || '이메일을 입력해주세요']"
          ></v-text-field>
          
          <v-text-field
            v-model="password"
            label="비밀번호"
            :type="showPassword ? 'text' : 'password'"
            :append-inner-icon="showPassword ? 'mdi-eye-off' : 'mdi-eye'"
            @click:append-inner="showPassword = !showPassword"
            required
            :rules="passwordRules"
            placeholder="16자 이상의 비비밀번호를 입력하세요"
            hint="대소문자, 숫자, 특수문자(!@#$%^&*)를 조합하여 16자 이상"
            persistent-hint
          ></v-text-field>
          
          <template v-if="!isLogin">
            <v-text-field
              v-model="displayName"
              label="표시 이름"
              required
              :rules="[v => !!v || '표시 이름을 입력해주세요']"
            ></v-text-field>
            
            <v-text-field
              v-model="handle"
              label="핸들"
              required
              :rules="handleRules"
              hint="영문자와 숫자만 사용 가능해요 (3-20자)"
              persistent-hint
              @input="handle = $event.target.value.toLowerCase()"
            ></v-text-field>
          </template>
          
          <v-alert
            v-if="error"
            type="error"
            class="mb-4"
          >
            {{ error }}
          </v-alert>
          
          <div class="d-flex justify-space-between align-center">
            <v-btn
              variant="text"
              @click="toggleMode"
            >
              {{ isLogin ? '회원가입하기' : '로그인하기' }}
            </v-btn>
            
            <v-btn
              color="primary"
              type="submit"
              :loading="loading"
              variant="elevated"
            >
              {{ isLogin ? '로그인' : '가입하기' }}
            </v-btn>
          </div>
        </v-form>
      </v-card-text>
    </v-card>
  </component>
</template>

<style scoped>
/* 모바일에서 바텀시트 스타일 조정 */
@media (max-width: 599px) {
  .v-bottom-sheet .v-card {
    border-radius: 24px 24px 0 0 !important;
  }
  
  .v-bottom-sheet .v-card-text {
    padding-bottom: 32px;
  }
}
</style> 