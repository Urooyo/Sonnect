<script setup>
import { ref, computed, watch, onMounted, onUnmounted } from 'vue'
import { formatDistanceToNow, format } from 'date-fns'
import { ko } from 'date-fns/locale'
import { doc, updateDoc, arrayUnion, arrayRemove, collection, onSnapshot, query, orderBy, deleteDoc, addDoc, increment } from 'firebase/firestore'
import { db, auth } from '@/firebase'
import { parseText } from '@/utils/textParser'
import { sharePost } from '@/utils/share'
import { useRouter } from 'vue-router'

const props = defineProps({
  post: {
    type: Object,
    required: true
  },
  currentUser: {
    type: Object,
    default: null
  }
})

const emit = defineEmits(['update', 'delete', 'reply', 'repost'])

// 상태 관리
const isEditing = ref(false)
const editedContent = ref('')
const deleteDialog = ref(false)
const showReplies = ref(false)
const replyContent = ref('')
const replies = ref([])
const replyLoading = ref(false)
const likeLoading = ref(false)
const repostLoading = ref(false)
let repliesUnsubscribe = null

const showShareMenu = ref(false)
const showReplyDialog = ref(false)
const showEditDialog = ref(false)
const editContent = ref('')

const showMenu = ref(false)
const showDeleteDialog = ref(false)

const router = useRouter()

// 좋아요 상태
const isLiked = computed(() => {
  return props.currentUser && props.post.likes?.includes(props.currentUser.uid)
})

// 리트윗 상태
const isReposted = computed(() => {
  return props.currentUser && props.post.reposts?.includes(props.currentUser.uid)
})

// 답글 수신 설정
onMounted(() => {
  if (props.post.id) {
    const repliesRef = collection(db, 'posts', props.post.id, 'replies')
    const q = query(repliesRef, orderBy('createdAt', 'desc'))
    
    repliesUnsubscribe = onSnapshot(q, (snapshot) => {
      replies.value = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }))
    })
  }
})

onUnmounted(() => {
  if (repliesUnsubscribe) {
    repliesUnsubscribe()
  }
})

// 좋아요 토글
const toggleLike = async () => {
  if (!props.currentUser) return
  
  const postRef = doc(db, 'posts', props.post.id)
  try {
    if (props.post.likes?.includes(props.currentUser.uid)) {
      await updateDoc(postRef, {
        likes: arrayRemove(props.currentUser.uid)
      })
    } else {
      await updateDoc(postRef, {
        likes: arrayUnion(props.currentUser.uid)
      })
    }
  } catch (error) {
    console.error('Error toggling like:', error)
  }
}

// 리포스트 토글
const toggleRepost = async () => {
  if (!props.currentUser || repostLoading.value) return
  
  repostLoading.value = true
  try {
    // 새 리포스트 포스트 생성
    const repostData = {
      isRepost: true,
      authorId: props.currentUser.uid,
      authorName: props.currentUser.displayName,
      authorHandle: props.currentUser.handle,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      likes: [],
      reposts: [],
      replyCount: 0,
      originalPost: {
        id: props.post.id,
        authorId: props.post.authorId,
        authorName: props.post.authorName,
        authorHandle: props.post.authorHandle,
        content: props.post.content,
        createdAt: props.post.createdAt
      }
    }
    
    // 원본 포스트의 리포스트 카운트 증가
    const originalPostRef = doc(db, 'posts', props.post.id)
    await updateDoc(originalPostRef, {
      reposts: arrayUnion(props.currentUser.uid)
    })
    
    emit('repost', repostData)
  } catch (error) {
    console.error('Error toggling repost:', error)
  } finally {
    repostLoading.value = false
  }
}

// 답글 작성
const handleReplySubmit = async () => {
  if (!replyContent.value.trim() || !props.currentUser) return
  
  replyLoading.value = true
  try {
    emit('reply', {
      postId: props.post.id,
      content: replyContent.value
    })
    replyContent.value = ''
    showReplyDialog.value = false
  } catch (error) {
    console.error('Error creating reply:', error)
  } finally {
    replyLoading.value = false
  }
}

// 누락된 메서드들 추가
const formatDate = (date) => {
  return formatDistanceToNow(new Date(date), { addSuffix: true, locale: ko })
}

// 수정 다이얼로그를 열 때 현재 내용을 불러옴
const openEditDialog = () => {
  editContent.value = props.post.content
  showEditDialog.value = true
}

// 포스트 수정 처리
const handleEdit = async () => {
  if (!editContent.value.trim()) return
  
  try {
    const postRef = doc(db, 'posts', props.post.id)
    await updateDoc(postRef, {
      content: editContent.value,
      updatedAt: new Date().toISOString()
    })
    showEditDialog.value = false
    showAlert('포스트가 수정되었습니다.')
  } catch (error) {
    console.error('Error updating post:', error)
    showAlert('수정 중 오류가 발생했습니다.', 'error')
  }
}

const handleReplyUpdate = async (data) => {
  try {
    await emit('update', {
      id: data.id,
      content: data.content,
      parentId: props.post.id
    })
  } catch (error) {
    console.error('Error updating reply:', error)
  }
}

const handleReplyDelete = async (replyId) => {
  try {
    await emit('delete', replyId)
  } catch (error) {
    console.error('Error deleting reply:', error)
  }
}

// HTML로 변환된 컨텐츠
const parsedContent = computed(() => {
  return parseText(props.post.content)
})

// 초기값 설정
onMounted(() => {
  if (props.post) {
    editedContent.value = props.post.content
  }
})

// 포스트 공유하기
const handleShare = async () => {
  if (shareLoading.value) return // 이미 공유 중이면 리턴
  shareLoading.value = true

  try {
    await sharePost({
      title: `${props.post.authorName}님의 게시물`,
      text: props.post.content,
      url: `${window.location.origin}/@${props.post.authorHandle}/status/${props.post.id}`
    })
  } catch (error) {
    console.error('Error sharing:', error)
  } finally {
    shareLoading.value = false
  }
}

const canDelete = computed(() => {
  if (!props.currentUser) return false
  if (props.post.authorId === props.currentUser.uid) return true
  if (props.currentUser.role === 'admin') return true
  return false
})

// 댓글 삭제 함수
const deleteComment = async (commentId) => {
  try {
    // 댓글 문서 경로: posts/{postId}/comments/{commentId}
    const commentRef = doc(db, 'posts', props.post.id, 'comments', commentId)
    await deleteDoc(commentRef)
    // 성공 메시지 표시
    showAlert('댓글이 삭제되었습니다.')
  } catch (error) {
    console.error('Error deleting comment:', error)
    showAlert('댓글 삭제 중 오류가 발생했습니다.', 'error')
  }
}

// 현재 사용자가 댓글 작성자인지 확인하는 함수
const canDeleteComment = (comment) => {
  return auth.currentUser && (
    auth.currentUser.uid === comment.userId || // 댓글 작성자
    auth.currentUser.uid === props.post.userId // 게시글 작성자
  )
}

// 작성자 이니셜 계산
const authorInitial = computed(() => {
  return props.post.authorName?.charAt(0)?.toUpperCase() || '?'
})

// 현재 사용자 이니셜 계산
const currentUserInitial = computed(() => {
  return props.currentUser?.displayName?.charAt(0)?.toUpperCase() || '?'
})

const handleReply = async () => {
  if (!replyContent.value.trim()) return
  
  try {
    await addDoc(collection(db, 'posts', props.post.id, 'replies'), {
      content: replyContent.value,
      authorId: auth.currentUser.uid,
      authorName: auth.currentUser.displayName,
      authorHandle: auth.currentUser.photoURL?.replace('@', ''),
      createdAt: new Date().toISOString(),
      likes: [],
      reposts: [],
      replyCount: 0
    })

    // 원본 포스트의 답글 수 증가
    const postRef = doc(db, 'posts', props.post.id)
    await updateDoc(postRef, {
      replyCount: increment(1)
    })

    replyContent.value = ''
    showReplyDialog.value = false
  } catch (error) {
    console.error('Error creating reply:', error)
  }
}

// isOwner 계산 속성 추가 (없는 경우)
const isOwner = computed(() => {
  return props.post.authorId === auth.currentUser?.uid
})

// 포스트 삭제
const handleDelete = async () => {
  try {
    await deleteDoc(doc(db, 'posts', props.post.id))
    
    // 리포스트인 경우 원본 포스트의 리포스트 카운트 감소
    if (props.post.isRepost) {
      const originalPostRef = doc(db, 'posts', props.post.originalPost.id)
      await updateDoc(originalPostRef, {
        reposts: arrayRemove(props.post.authorId)
      })
    }
    
    showDeleteDialog.value = false
    showAlert('포스트가 삭제되었습니다.')
  } catch (error) {
    console.error('Error deleting post:', error)
    showAlert('삭제 중 오류가 발생했습니다.', 'error')
  }
}

// 공유 로딩 상태
const shareLoading = ref(false)

// 프로필 페이지로 이동하는 함수
const navigateToProfile = (handle) => {
  // 이벤트 전파 중지 (다른 클릭 이벤트와 충돌 방지)
  event?.stopPropagation()
  router.push(`/@${handle}`)
}
</script>

<template>
  <v-card class="post-card" flat>
    <!-- 리포스트 표시 -->
    <div v-if="post.isRepost" class="repost-header mb-2">
      <v-icon size="small" class="mr-2">mdi-repeat</v-icon>
      <span class="text-caption">{{ post.authorName }}님이 리포스트했습니다</span>
    </div>

    <!-- 원본 포스트 내용 -->
    <div class="d-flex">
      <v-avatar 
        size="40" 
        class="mr-3 cursor-pointer" 
        color="grey-lighten-3"
        @click="navigateToProfile(post.isRepost ? post.originalPost.authorHandle : post.authorHandle)"
      >
        <span class="text-h6">
          {{ post.isRepost ? post.originalPost.authorName?.[0]?.toUpperCase() : post.authorName?.[0]?.toUpperCase() }}
        </span>
      </v-avatar>
      
      <div class="flex-grow-1">
        <div 
          class="d-flex align-center user-info"
          @click="navigateToProfile(post.isRepost ? post.originalPost.authorHandle : post.authorHandle)"
        >
          <span class="font-weight-medium">
            {{ post.isRepost ? post.originalPost.authorName : post.authorName }}
          </span>
          <span class="text-grey mx-1">
            @{{ post.isRepost ? post.originalPost.authorHandle : post.authorHandle }}
          </span>
        </div>
        <div class="post-content mt-1">
          {{ post.isRepost ? post.originalPost.content : post.content }}
        </div>
      </div>
      
      <!-- 더보기 메뉴 -->
      <v-menu v-if="post.authorId === currentUser?.uid">
        <template v-slot:activator="{ props }">
          <v-btn
            icon="mdi-dots-vertical"
            variant="text"
            size="small"
            v-bind="props"
          />
        </template>

        <v-list>
          <!-- 일반 포스트인 경우 수정/삭제 -->
          <template v-if="!post.isRepost">
            <v-list-item @click="openEditDialog">
              <template v-slot:prepend>
                <v-icon>mdi-pencil</v-icon>
              </template>
              <v-list-item-title>수정</v-list-item-title>
            </v-list-item>
          </template>
          
          <v-list-item @click="showDeleteDialog = true" color="error">
            <template v-slot:prepend>
              <v-icon>mdi-delete</v-icon>
            </template>
            <v-list-item-title>삭제</v-list-item-title>
          </v-list-item>
        </v-list>
      </v-menu>
    </div>

    <!-- 포스트 액션 버튼들 -->
    <div class="d-flex align-center mt-3">
      <!-- 댓글 버튼 -->
      <v-btn
        variant="text"
        size="small"
        class="action-button"
        @click="showReplyDialog = true"
      >
        <v-icon size="small" class="mr-1">mdi-comment-outline</v-icon>
        <span>{{ post.replyCount || 0 }}</span>
      </v-btn>

      <!-- 리포스트 버튼 (리포스트가 아닌 경우에만 표시) -->
      <v-btn
        v-if="!post.isRepost"
        variant="text"
        size="small"
        class="action-button"
        :color="isReposted ? 'success' : undefined"
        :loading="repostLoading"
        @click="toggleRepost"
      >
        <v-icon size="small" class="mr-1">mdi-repeat</v-icon>
        <span>{{ post.reposts?.length || 0 }}</span>
      </v-btn>

      <!-- 좋아요 버튼 -->
      <v-btn
        variant="text"
        size="small"
        class="action-button"
        :color="isLiked ? 'error' : undefined"
        :loading="likeLoading"
        @click="toggleLike"
      >
        <v-icon size="small" class="mr-1">
          {{ isLiked ? 'mdi-heart' : 'mdi-heart-outline' }}
        </v-icon>
        <span>{{ post.likes?.length || 0 }}</span>
      </v-btn>

      <!-- 공유 버튼 -->
      <v-btn
        variant="text"
        size="small"
        class="action-button"
        @click="handleShare"
      >
        <v-icon size="small">mdi-share-variant-outline</v-icon>
      </v-btn>
    </div>

    <!-- 수정 다이얼로그 -->
    <v-dialog v-model="showEditDialog" max-width="500">
      <v-card>
        <v-card-title>포스트 수정</v-card-title>
        <v-card-text>
          <v-textarea
            v-model="editContent"
            label="내용"
            rows="3"
            auto-grow
          />
        </v-card-text>
        <v-card-actions>
          <v-spacer />
          <v-btn
            variant="text"
            @click="showEditDialog = false"
          >
            취소
          </v-btn>
          <v-btn
            color="primary"
            @click="handleEdit"
            :disabled="!editContent.trim()"
          >
            수정
          </v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>

    <!-- 삭제 확인 다이얼로그 -->
    <v-dialog v-model="showDeleteDialog" max-width="400">
      <v-card>
        <v-card-title>포스트 삭제</v-card-title>
        <v-card-text>
          정말 이 {{ post.isRepost ? '리포스트' : '포스트' }}를 삭제하시겠습니까?
        </v-card-text>
        <v-card-actions>
          <v-spacer />
          <v-btn
            variant="text"
            @click="showDeleteDialog = false"
          >
            취소
          </v-btn>
          <v-btn
            color="error"
            @click="handleDelete"
          >
            삭제
          </v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>
  </v-card>
</template>

<style scoped>
.post-card {
  padding: 1rem;
  transition: background-color 0.2s;
}

.post-card:hover {
  background-color: rgba(0, 0, 0, 0.03) !important;
}

/* 다크 모드에서의 호버 색상 */
:deep(.v-theme--dark) .post-card:hover {
  background-color: rgba(255, 255, 255, 0.05) !important;
}

.post-content {
  color: rgb(var(--v-theme-text-primary));
}

.post-actions button {
  color: rgb(var(--v-theme-text-secondary));
}

.post-text {
  white-space: pre-wrap;
  word-wrap: break-word;
}

.action-button {
  display: flex;
  align-items: center;
  gap: 0.5rem;
}

.like-button {
  transition: transform 0.2s;
}

.like-button:active {
  transform: scale(1.2);
}

.reply-textarea {
  border: none !important;
  outline: none !important;
  box-shadow: none !important;
}

.repost-header {
  display: flex;
  align-items: center;
  color: rgba(var(--v-theme-on-surface), 0.6);
  font-size: 0.875rem;
  padding-left: 52px;
}

:deep(.v-field__outline) {
  display: none !important;
}

.media-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
  gap: 8px;
  max-height: 400px;
  overflow: hidden;
}

.hashtag {
  color: var(--v-primary-base);
  text-decoration: none;
}

.hashtag:hover {
  text-decoration: underline;
}

.mention {
  color: var(--v-primary-base);
  text-decoration: none;
}

.mention:hover {
  text-decoration: underline;
}

.original-post {
  padding: 16px;
  border-radius: 16px;
  background-color: rgb(var(--v-theme-surface));
  border: 1px solid rgb(var(--v-theme-border-color));
}

.user-info {
  cursor: pointer;
  min-height: 40px; /* 아바타 크기와 동일하게 */
}

.user-name-line {
  line-height: 1.2;
}

.user-info:hover .font-weight-medium {
  text-decoration: underline;
}

.font-weight-700 {
  font-weight: 700 !important;
}

.action-button {
  margin-right: 8px;
}

.action-button:last-child {
  margin-right: 0;
}

.cursor-pointer {
  cursor: pointer;
}

.user-info {
  cursor: pointer;
}

.user-info:hover .font-weight-medium {
  text-decoration: underline;
}
</style> 