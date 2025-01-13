<script setup>
import { ref, onMounted } from 'vue'
import { collection, query, getDocs, updateDoc, doc, increment, setDoc, deleteDoc } from 'firebase/firestore'
import { db } from '@/firebase'

const users = ref([])
const registrationEnabled = ref(true)

onMounted(async () => {
  const q = query(collection(db, 'users'))
  const snapshot = await getDocs(q)
  users.value = snapshot.docs.map(doc => ({
    id: doc.id,
    ...doc.data()
  }))
})

const warnUser = async (userId) => {
  const userRef = doc(db, 'users', userId)
  await updateDoc(userRef, {
    warnings: increment(1)
  })
}

const toggleRegistration = async () => {
  registrationEnabled.value = !registrationEnabled.value
  // 전역 설정 저장
  const configRef = doc(db, 'config', 'registration')
  await setDoc(configRef, {
    enabled: registrationEnabled.value
  })
}

const deletePost = async (postId) => {
  await deleteDoc(doc(db, 'posts', postId))
}
</script>

<template>
  <v-card>
    <v-card-title>관리자 패널</v-card-title>
    <v-card-text>
      <v-switch
        v-model="registrationEnabled"
        label="회원가입 허용"
        @change="toggleRegistration"
      ></v-switch>
      
      <v-list>
        <v-list-item
          v-for="user in users"
          :key="user.id"
        >
          <v-list-item-title>
            {{ user.displayName }} (@{{ user.handle }})
          </v-list-item-title>
          <template v-slot:append>
            <v-btn
              color="warning"
              @click="warnUser(user.id)"
            >
              경고 ({{ user.warnings || 0 }})
            </v-btn>
          </template>
        </v-list-item>
      </v-list>
    </v-card-text>
  </v-card>
</template> 