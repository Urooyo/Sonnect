<script setup>
import { ref, onMounted, inject, computed } from 'vue'
import { collection, addDoc, doc, getDoc } from 'firebase/firestore'
import { db, auth } from '@/firebase'
import RulesAgreementDialog from './RulesAgreementDialog.vue'

const emit = defineEmits(['post-created'])
const showAlert = inject('showAlert')
const showLoading = inject('showLoading')

const content = ref('')
const localLoading = ref(false)
const loading = computed({
  get: () => localLoading.value,
  set: (value) => {
    localLoading.value = value
    showLoading(value)
  }
})
const showRulesDialog = ref(false)
const hasAgreed = ref(false)

onMounted(async () => {
  if (auth.currentUser) {
    const userDoc = await getDoc(doc(db, 'users', auth.currentUser.uid))
    hasAgreed.value = userDoc.data()?.agreedToRules || false
  }
})

const createPost = async () => {
  if (!content.value.trim() || !auth.currentUser) return
  
  if (!hasAgreed.value) {
    showRulesDialog.value = true
    return
  }
  
  loading.value = true
  try {
    await addDoc(collection(db, 'posts'), {
      content: content.value,
      authorId: auth.currentUser.uid,
      authorName: auth.currentUser.displayName,
      authorHandle: auth.currentUser.photoURL,
      createdAt: new Date().toISOString(),
      likes: [],
      reposts: [],
      replyCount: 0,
      isRepost: false
    })
    content.value = ''
    emit('post-created')
    showAlert('포스트가 작성되었어요! 🎉')
  } catch (error) {
    console.error('Error creating post:', error)
    showAlert('포스트 작성 중 오류가 발생했어요.', 'error')
  } finally {
    loading.value = false
  }
}

const handleRulesAgreed = () => {
  hasAgreed.value = true
}

const handleTextareaFocus = () => {
  if (!hasAgreed.value) {
    showRulesDialog.value = true
  }
}
</script>

<template>
  <v-card class="mb-6">
    <v-card-text>
      <div class="d-flex">
        <v-avatar size="40" class="mr-3">
          <v-icon>mdi-account</v-icon>
        </v-avatar>
        <div class="flex-grow-1">
          <v-textarea
            v-model="content"
            placeholder="무슨 일이 일어나고 있나요?"
            auto-grow
            rows="3"
            hide-details
            variant="plain"
            density="comfortable"
            no-resize
            class="post-textarea"
            @focus="handleTextareaFocus"
          ></v-textarea>
          
          <div class="d-flex align-center justify-space-between mt-2">
            <div class="d-flex align-center">
              <v-btn
                icon
                variant="text"
                size="small"
                class="mr-2"
                @click="!hasAgreed && handleTextareaFocus()"
              >
                <v-icon>mdi-image</v-icon>
              </v-btn>
            </div>
            
            <v-btn
              color="primary"
              rounded="pill"
              @click="createPost"
              :loading="loading"
              :disabled="!content.trim() || !hasAgreed"
            >
              게시하기
            </v-btn>
          </div>
        </div>
      </div>
    </v-card-text>
  </v-card>
  
  <RulesAgreementDialog
    v-model="showRulesDialog"
    @agreed="handleRulesAgreed"
  />
</template>

<style scoped>
.post-textarea {
  border: none !important;
  outline: none !important;
  box-shadow: none !important;
  font-size: 1.25rem !important;
}

:deep(.v-field__outline) {
  display: none !important;
}
</style> 