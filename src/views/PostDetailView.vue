<script setup>
import { ref, onMounted, inject, onUnmounted } from 'vue'
import { doc, collection, query, orderBy, onSnapshot, deleteDoc } from 'firebase/firestore'
import { db, auth } from '@/firebase'
import { useRoute } from 'vue-router'

const route = useRoute()
const postId = ref(route.params.id)
const comments = ref([])
const showAlert = inject('showAlert')
let unsubscribe = null  // 구독 해제 함수를 저장할 변수

// 댓글 실시간 업데이트 구독
onMounted(() => {
  const commentsRef = collection(db, 'posts', postId.value, 'comments')
  const q = query(commentsRef, orderBy('createdAt', 'desc'))
  
  unsubscribe = onSnapshot(q, (snapshot) => {
    comments.value = snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    }))
  })
})

// 컴포넌트 언마운트 시 구독 해제
onUnmounted(() => {
  if (unsubscribe) {
    unsubscribe()
  }
})

// 댓글 삭제 함수
const deleteComment = async (commentId) => {
  if (!auth.currentUser) return

  try {
    const commentRef = doc(db, 'posts', postId.value, 'comments', commentId)
    await deleteDoc(commentRef)
    showAlert('댓글이 삭제되었습니다.')
  } catch (error) {
    console.error('Error deleting comment:', error)
    showAlert('댓글 삭제 중 오류가 발생했습니다.', 'error')
  }
}
</script>

<template>
  <div class="comments-section">
    <v-list-item
      v-for="comment in comments"
      :key="comment.id"
    >
      <template v-slot:prepend>
        <v-avatar color="primary" size="32">
          <span class="text-h6">{{ comment.authorName?.[0]?.toUpperCase() }}</span>
        </v-avatar>
      </template>
      
      <v-list-item-title>
        {{ comment.authorName }}
        <span class="text-caption text-grey">· {{ formatDate(comment.createdAt) }}</span>
      </v-list-item-title>
      
      <v-list-item-subtitle>{{ comment.content }}</v-list-item-subtitle>
      
      <template v-slot:append>
        <v-btn
          v-if="comment.authorId === auth.currentUser?.uid"
          icon="mdi-delete"
          variant="text"
          size="small"
          color="error"
          @click="deleteComment(comment.id)"
        />
      </template>
    </v-list-item>
  </div>
</template> 