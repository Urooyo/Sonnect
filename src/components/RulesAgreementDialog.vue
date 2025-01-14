<script setup>
import { ref, computed } from 'vue'
import { doc, updateDoc } from 'firebase/firestore'
import { db, auth } from '@/firebase'

const props = defineProps({
  modelValue: Boolean
})

const emit = defineEmits(['update:modelValue', 'agreed'])
const loading = ref(false)
const agreements = ref({
  rules: false,
  terms: false,
  privacy: false
})

const handleAgree = async () => {
  if (!agreements.value.rules || !agreements.value.terms || !agreements.value.privacy) return
  
  loading.value = true
  try {
    await updateDoc(doc(db, 'users', auth.currentUser.uid), {
      agreedToRules: true,
      agreedToTerms: true,
      agreedToPrivacy: true,
      agreedAt: new Date().toISOString()
    })
    emit('agreed')
    emit('update:modelValue', false)
  } catch (error) {
    console.error('Error updating agreement status:', error)
  } finally {
    loading.value = false
  }
}

const allAgreed = computed(() => {
  return Object.values(agreements.value).every(v => v)
})
</script>

<template>
  <component 
    :is="$vuetify.display.smAndDown ? 'v-bottom-sheet' : 'v-dialog'"
    :model-value="modelValue"
    @update:model-value="$emit('update:modelValue', $event)"
    :max-width="$vuetify.display.smAndDown ? undefined : '600'"
    :fullscreen="$vuetify.display.smAndDown"
    persistent
  >
    <v-card>
      <v-toolbar
        v-if="$vuetify.display.smAndDown"
        color="primary"
        dark
      >
        <v-toolbar-title>이용 약관 동의</v-toolbar-title>
      </v-toolbar>

      <v-card-title v-else class="text-h5">
        이용 약관 동의
      </v-card-title>

      <v-card-text class="pt-4">
        <v-tabs v-model="tab">
          <v-tab value="rules">커뮤니티 규칙</v-tab>
          <v-tab value="terms">이용약관</v-tab>
          <v-tab value="privacy">개인정보처리방침</v-tab>
        </v-tabs>
        
        <v-window v-model="tab" class="mt-4">
          <v-window-item value="rules">
            <div class="text-body-1">
              <h3 class="text-h6 mb-2">1. 서로를 존중해주세요</h3>
              <p class="mb-4">
                모든 사용자는 동등합니다. 차별적인 발언, 혐오 표현, 욕설은 금지됩니다.
              </p>

              <h3 class="text-h6 mb-2">2. 개인정보를 보호해주세요</h3>
              <p class="mb-4">
                본인 또는 타인의 개인정보(전화번호, 주소 등)를 공개하지 마세요.
              </p>

              <h3 class="text-h6 mb-2">3. 스팸 행위를 하지 마세요</h3>
              <p class="mb-4">
                광고성 게시물, 도배, 의미 없는 내용의 반복 게시는 금지됩니다.
              </p>

              <h3 class="text-h6 mb-2">4. 저작권을 지켜주세요</h3>
              <p class="mb-4">
                타인의 저작물을 무단으로 사용하지 마세요. 출처를 반드시 표기해주세요.
              </p>
            </div>
          </v-window-item>
          
          <v-window-item value="terms">
            <div class="text-body-1">
              <h3 class="text-h6 mb-2">제1조 (목적)</h3>
              <p class="mb-4">
                본 약관은 Sonnect Community(이하 "서비스")의 이용조건 및 절차, 이용자와 당사의 권리, 의무, 책임사항을 규정함을 목적으로 합니다.
              </p>
              
              <h3 class="text-h6 mb-2">제2조 (용어의 정의)</h3>
              <p class="mb-4">
                본 약관에서 사용하는 용어의 정의는 다음과 같습니다:
                1. "서비스"란 당사가 제공하는 모든 서비스를 의미합니다.
                2. "이용자"란 본 약관에 따라 서비스를 이용하는 회원을 말합니다.
              </p>
              
              <h3 class="text-h6 mb-2">제3조 (약관의 효력과 변경)</h3>
              <p class="mb-4">
                본 약관은 서비스를 이용하고자 하는 모든 이용자에 대하여 그 효력을 발생합니다.
              </p>
            </div>
          </v-window-item>
          
          <v-window-item value="privacy">
            <div class="text-body-1">
              <h3 class="text-h6 mb-2">1. 수집하는 개인정보 항목</h3>
              <p class="mb-4">
                - 필수항목: 이메일 주소, 닉네임
                - 선택항목: 프로필 이미지
                - 자동수집항목: IP주소, 접속 로그, 쿠키
              </p>
              
              <h3 class="text-h6 mb-2">2. 개인정보의 수집 및 이용목적</h3>
              <p class="mb-4">
                - 서비스 제공 및 회원관리
                - 신규 서비스 개발 및 마케팅
                - 법령 및 이용약관을 위반하는 회원에 대한 이용 제한 조치
              </p>
              
              <h3 class="text-h6 mb-2">3. 개인정보의 보유 및 이용기간</h3>
              <p class="mb-4">
                회원탈퇴 시까지 또는 법령에서 정한 기간 동안 보관
              </p>
            </div>
          </v-window-item>
        </v-window>

        <div class="mt-6">
          <v-checkbox
            v-model="agreements.rules"
            label="커뮤니티 규칙에 동의합니다"
            :rules="[v => v || '커뮤니티 규칙 동의가 필요합니다']"
          ></v-checkbox>
          
          <v-checkbox
            v-model="agreements.terms"
            label="이용약관에 동의합니다"
            :rules="[v => v || '이용약관 동의가 필요합니다']"
          ></v-checkbox>
          
          <v-checkbox
            v-model="agreements.privacy"
            label="개인정보처리방침에 동의합니다"
            :rules="[v => v || '개인정보처리방침 동의가 필요합니다']"
          ></v-checkbox>
          
          <v-checkbox
            v-model="allAgreed"
            label="모두 동의합니다"
            @click="Object.keys(agreements).forEach(key => agreements[key] = !allAgreed)"
          ></v-checkbox>
        </div>
      </v-card-text>

      <v-card-actions>
        <v-spacer></v-spacer>
        <v-btn
          color="primary"
          :disabled="!allAgreed"
          :loading="loading"
          @click="handleAgree"
        >
          동의하고 시작하기
        </v-btn>
      </v-card-actions>
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