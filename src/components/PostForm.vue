<script setup>
import { ref } from 'vue'
import { collection, addDoc } from 'firebase/firestore'
import { db, auth } from '@/firebase'

const emit = defineEmits(['post-created'])

const content = ref('')
const loading = ref(false)

const createPost = async () => {
  if (!content.value.trim() || !auth.currentUser) return
  
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
  } catch (error) {
    console.error('Error creating post:', error)
  } finally {
    loading.value = false
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
          ></v-textarea>
          
          <div class="d-flex align-center justify-space-between mt-2">
            <div class="d-flex align-center">
              <v-btn
                icon
                variant="text"
                size="small"
                class="mr-2"
              >
                <v-icon>mdi-image</v-icon>
              </v-btn>
            </div>
            
            <v-btn
              color="primary"
              rounded="pill"
              @click="createPost"
              :loading="loading"
              :disabled="!content.trim()"
            >
              게시하기
            </v-btn>
          </div>
        </div>
      </div>
    </v-card-text>
  </v-card>
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