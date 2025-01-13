<script setup>
import { ref, computed, onMounted } from 'vue'
import { formatDistanceToNow } from 'date-fns'
import { ko } from 'date-fns/locale'
import { collection, addDoc, deleteDoc, doc, updateDoc, query, orderBy, onSnapshot } from 'firebase/firestore'
import { db } from '@/firebase'

const props = defineProps({
  postId: {
    type: String,
    required: true
  },
  comments: {
    type: Array,
    default: () => []
  },
  currentUser: {
    type: Object,
    default: null
  }
})

const newComment = ref('')
const loading = ref(false)
const replyTo = ref(null)
const showReplies = ref({})
const editingComment = ref(null)
const editedContent = ref('')
const deleteDialog = ref(false)
const commentToDelete = ref(null)

const formatDate = (date) => {
  return formatDistanceToNow(new Date(date), { addSuffix: true, locale: ko })
}

const addComment = async () => {
  if (!newComment.value.trim() || !props.currentUser) return
  
  loading.value = true
  try {
    const commentData = {
      content: newComment.value,
      createdAt: new Date().toISOString(),
      authorId: props.currentUser.uid,
      authorName: props.currentUser.displayName,
      authorHandle: props.currentUser.photoURL,
      replyToId: null
    }
    
    await addDoc(collection(db, `posts/${props.postId}/comments`), commentData)
    newComment.value = ''
  } catch (error) {
    console.error('Error adding comment:', error)
  } finally {
    loading.value = false
  }
}

const deleteComment = async (commentId) => {
  try {
    await deleteDoc(doc(db, `posts/${props.postId}/comments`, commentId))
  } catch (error) {
    console.error('Error deleting comment:', error)
  }
}

const addReply = async (commentId) => {
  if (!newComment.value.trim() || !props.currentUser) return
  
  loading.value = true
  try {
    const replyData = {
      content: newComment.value,
      createdAt: new Date().toISOString(),
      authorId: props.currentUser.uid,
      authorName: props.currentUser.displayName,
      authorHandle: props.currentUser.photoURL,
      replyToId: commentId
    }
    
    await addDoc(collection(db, `posts/${props.postId}/comments`), replyData)
    newComment.value = ''
    replyTo.value = null
  } catch (error) {
    console.error('Error adding reply:', error)
  } finally {
    loading.value = false
  }
}

const getReplies = computed(() => {
  return (commentId) => {
    return props.comments.filter(comment => comment.replyToId === commentId)
  }
})

const mainComments = computed(() => {
  return props.comments.filter(comment => !comment.replyToId)
})

const startEdit = (comment) => {
  editingComment.value = comment.id
  editedContent.value = comment.content
}

const cancelEdit = () => {
  editingComment.value = null
  editedContent.value = ''
}

const saveEdit = async (commentId) => {
  if (!editedContent.value.trim()) return
  
  try {
    await updateDoc(doc(db, `posts/${props.postId}/comments`, commentId), {
      content: editedContent.value,
      updatedAt: new Date().toISOString()
    })
    editingComment.value = null
  } catch (error) {
    console.error('Error updating comment:', error)
  }
}

const confirmDelete = (comment) => {
  commentToDelete.value = comment
  deleteDialog.value = true
}

const handleDelete = async () => {
  if (!commentToDelete.value) return
  
  await deleteComment(commentToDelete.value.id)
  deleteDialog.value = false
  commentToDelete.value = null
}

onMounted(async () => {
  const commentsRef = collection(db, 'posts', props.postId, 'comments')
  const q = query(commentsRef, orderBy('createdAt', 'desc'))
  
  unsubscribe = onSnapshot(q, (snapshot) => {
    console.log('Comments snapshot:', snapshot.docs.length) // 디버깅용
    comments.value = snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    }))
    console.log('Loaded comments:', comments.value) // 디버깅용
  }, (error) => {
    console.error('Error loading comments:', error)
  })
})
</script>

<template>
  <div class="mt-4">
    <!-- 삭제 확인 모달 -->
    <v-dialog v-model="deleteDialog" max-width="400">
      <v-card>
        <v-card-title class="text-h6">
          {{ commentToDelete?.replyToId ? '답글' : '댓글' }} 삭제
        </v-card-title>
        <v-card-text>
          정말 이 {{ commentToDelete?.replyToId ? '답글' : '댓글' }}을 삭제하시겠습니까?
          <div class="mt-4 text-medium-emphasis">
            {{ commentToDelete?.content }}
          </div>
        </v-card-text>
        <v-card-actions>
          <v-spacer></v-spacer>
          <v-btn
            color="grey-darken-1"
            variant="text"
            @click="deleteDialog = false"
          >
            취소
          </v-btn>
          <v-btn
            color="error"
            variant="tonal"
            @click="handleDelete"
          >
            삭제
          </v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>

    <!-- 댓글 작성 폼 -->
    <div v-if="currentUser && !replyTo" class="d-flex align-center mb-4">
      <v-text-field
        v-model="newComment"
        placeholder="댓글을 입력하세요..."
        density="comfortable"
        variant="outlined"
        hide-details
        class="mr-2"
        @keyup.enter="addComment"
      ></v-text-field>
      <v-btn
        color="primary"
        :disabled="!newComment.trim()"
        :loading="loading"
        @click="addComment"
      >
        댓글
      </v-btn>
    </div>

    <!-- 댓글 목록 -->
    <div v-for="comment in mainComments" :key="comment.id" class="mb-3">
      <div class="d-flex justify-space-between align-center">
        <div class="d-flex align-center">
          <v-avatar size="24" class="mr-2">
            <v-icon size="small">mdi-account</v-icon>
          </v-avatar>
          <div>
            <div class="d-flex align-center">
              <span class="font-weight-medium text-subtitle-2">{{ comment.authorName }}</span>
              <span class="text-caption text-medium-emphasis ml-2">{{ comment.authorHandle }}</span>
            </div>
            <span class="text-caption text-medium-emphasis">{{ formatDate(comment.createdAt) }}</span>
          </div>
        </div>
        <div v-if="comment.authorId === currentUser?.uid" class="d-flex align-center">
          <v-btn
            icon="mdi-pencil"
            size="x-small"
            variant="text"
            class="mr-2"
            @click="startEdit(comment)"
          ></v-btn>
          <v-btn
            icon="mdi-delete"
            size="x-small"
            variant="text"
            color="error"
            @click="confirmDelete(comment)"
          ></v-btn>
        </div>
      </div>
      
      <!-- 댓글 내용 (수정 모드) -->
      <div v-if="editingComment === comment.id" class="ml-9">
        <v-textarea
          v-model="editedContent"
          auto-grow
          rows="2"
          hide-details
          variant="outlined"
          density="comfortable"
          class="mb-2"
        ></v-textarea>
        <div class="d-flex justify-end">
          <v-btn
            variant="text"
            class="mr-2"
            @click="cancelEdit"
          >
            취소
          </v-btn>
          <v-btn
            color="primary"
            @click="saveEdit(comment.id)"
            :disabled="!editedContent.trim() || editedContent === comment.content"
          >
            저장
          </v-btn>
        </div>
      </div>
      
      <!-- 댓글 내용 (일반 모드) -->
      <div v-else class="text-body-2 ml-9">
        {{ comment.content }}
        <span v-if="comment.updatedAt" class="text-caption text-medium-emphasis ml-2">(수정됨)</span>
      </div>

      <!-- 댓글 액션 -->
      <div class="ml-9 mt-1">
        <v-btn
          variant="text"
          density="comfortable"
          size="small"
          @click="replyTo = replyTo === comment.id ? null : comment.id"
        >
          답글
        </v-btn>
      </div>
      
      <!-- 답글 작성 폼 -->
      <div v-if="replyTo === comment.id" class="ml-9 mt-2">
        <div class="d-flex align-center">
          <v-text-field
            v-model="newComment"
            placeholder="답글을 입력하세요..."
            density="comfortable"
            variant="outlined"
            hide-details
            class="mr-2"
            @keyup.enter="addReply(comment.id)"
          ></v-text-field>
          <v-btn
            color="primary"
            :disabled="!newComment.trim()"
            :loading="loading"
            @click="addReply(comment.id)"
          >
            답글
          </v-btn>
        </div>
      </div>
      
      <!-- 답글 목록 -->
      <div v-if="getReplies(comment.id).length > 0" class="ml-9 mt-2">
        <div
          v-for="reply in getReplies(comment.id)"
          :key="reply.id"
          class="mb-2"
        >
          <div class="d-flex justify-space-between align-center">
            <div class="d-flex align-center">
              <v-avatar size="20" class="mr-2">
                <v-icon size="small">mdi-account</v-icon>
              </v-avatar>
              <div>
                <div class="d-flex align-center">
                  <span class="font-weight-medium text-subtitle-2">{{ reply.authorName }}</span>
                  <span class="text-caption text-medium-emphasis ml-2">{{ reply.authorHandle }}</span>
                </div>
                <span class="text-caption text-medium-emphasis">{{ formatDate(reply.createdAt) }}</span>
              </div>
            </div>
            <div v-if="reply.authorId === currentUser?.uid" class="d-flex align-center">
              <v-btn
                icon="mdi-pencil"
                size="x-small"
                variant="text"
                class="mr-2"
                @click="startEdit(reply)"
              ></v-btn>
              <v-btn
                icon="mdi-delete"
                size="x-small"
                variant="text"
                color="error"
                @click="confirmDelete(reply)"
              ></v-btn>
            </div>
          </div>
          
          <!-- 답글 내용 (수정 모드) -->
          <div v-if="editingComment === reply.id" class="ml-7">
            <v-textarea
              v-model="editedContent"
              auto-grow
              rows="2"
              hide-details
              variant="outlined"
              density="comfortable"
              class="mb-2"
            ></v-textarea>
            <div class="d-flex justify-end">
              <v-btn
                variant="text"
                class="mr-2"
                @click="cancelEdit"
              >
                취소
              </v-btn>
              <v-btn
                color="primary"
                @click="saveEdit(reply.id)"
                :disabled="!editedContent.trim() || editedContent === reply.content"
              >
                저장
              </v-btn>
            </div>
          </div>
          
          <!-- 답글 내용 (일반 모드) -->
          <div v-else class="text-body-2 ml-7">
            {{ reply.content }}
            <span v-if="reply.updatedAt" class="text-caption text-medium-emphasis ml-2">(수정됨)</span>
          </div>
        </div>
      </div>
    </div>
  </div>
</template> 