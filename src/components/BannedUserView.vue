<script setup>
import { auth } from '@/firebase'
import { signOut } from 'firebase/auth'
import { useRouter } from 'vue-router'

const router = useRouter()

const handleLogout = async () => {
  try {
    await signOut(auth)
    await router.push('/')
  } catch (error) {
    console.error('Error logging out:', error)
  }
}
</script>

<template>
  <v-container class="fill-height">
    <v-row justify="center" align="center">
      <v-col cols="12" sm="8" md="6">
        <v-card class="text-center pa-6">
          <v-icon
            size="64"
            color="error"
            class="mb-4"
          >mdi-account-cancel</v-icon>
          
          <h1 class="text-h4 mb-4">계정이 차단되었어요</h1>
          
          <p class="text-body-1 mb-6">
            커뮤니티 가이드라인 위반으로 인해 계정이 차단되었습니다.<br>
            자세한 내용은 관리자에게 문의해주세요.
          </p>
          
          <v-btn
            color="error"
            @click="handleLogout"
            size="large"
          >
            로그아웃
          </v-btn>
        </v-card>
      </v-col>
    </v-row>
  </v-container>
</template> 