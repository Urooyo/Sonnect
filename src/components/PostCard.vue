<script setup>
import { ref, computed, watch, onMounted, onUnmounted } from 'vue'
import { formatDistanceToNow, format } from 'date-fns'
import { ko } from 'date-fns/locale'
import { doc, updateDoc, arrayUnion, arrayRemove, collection, onSnapshot, query, orderBy, deleteDoc } from 'firebase/firestore'
import { db, auth } from '@/firebase'
import { parseText } from '@/utils/textParser'
import { sharePost } from '@/utils/share'

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

// 리트윗 토글
const toggleRepost = async () => {
  if (!props.currentUser) return
  
  repostLoading.value = true
  try {
    const postRef = doc(db, 'posts', props.post.id)
    const userId = props.currentUser.uid
    
    if (!isReposted.value) {
      // 리트윗 생성
      emit('repost', {
        originalPost: props.post,
        userId: props.currentUser.uid
      })
    }
    
    await updateDoc(postRef, {
      reposts: isReposted.value ? arrayRemove(userId) : arrayUnion(userId)
    })
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

const handleEdit = async () => {
  if (!editedContent.value.trim()) return
  
  try {
    await emit('update', {
      id: props.post.id,
      content: editedContent.value.trim()
    })
    isEditing.value = false
  } catch (error) {
    console.error('Error editing post:', error)
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
  try {
    await navigator.share({
      title: '포스트 공유',
      text: props.post.content,
      url: window.location.href
    })
  } catch (error) {
    console.error('Error sharing:', error)
  }
}

const canDelete = computed(() => {
  if (!props.currentUser) return false
  if (props.post.authorId === props.currentUser.uid) return true
  if (props.currentUser.role === 'admin') return true
  return false
})

// 댓글 삭제 함수 추가
const deleteComment = async (commentId) => {
  try {
    const commentRef = doc(db, 'posts', props.post.id, 'comments', commentId)
    await deleteDoc(commentRef)
  } catch (error) {
    console.error('Error deleting comment:', error)
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
</script>

<template>
  <div class="post-card">
    <!-- 삭제 확인 다이얼로그 -->
    <v-dialog v-model="deleteDialog" max-width="400">
      <v-card>
        <v-card-title>포스트 삭제</v-card-title>
        <v-card-text>
          이 포스트를 삭제하시겠습니까?
        </v-card-text>
        <v-card-actions>
          <v-spacer></v-spacer>
          <v-btn variant="text" @click="deleteDialog = false">취소</v-btn>
          <v-btn 
            color="error" 
            variant="text" 
            @click="emit('delete', post.id)"
          >
            삭제
          </v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>

    <!-- 리트스트더 -->
    <div v-if="post.isRepost" class="repost-header mb-2">
      <v-icon size="small" class="mr-1">mdi-repeat</v-icon>
      <span>{{ post.authorName }}님이 리트스트했습니다</span>
    </div>

    <!-- 메인 포스트 컨텐츠 -->
    <div class="post-content d-flex">
      <!-- 작성자 아바타 -->
      <router-link 
        :to="`/@${post.authorHandle}`" 
        class="mr-4"
      >
        <v-avatar size="40" :color="$vuetify.theme.current.dark ? 'white' : 'primary'">
          <span :class="[
            'text-h6',
            $vuetify.theme.current.dark ? 'text-black' : 'text-white'
          ]">
            {{ authorInitial }}
          </span>
        </v-avatar>
      </router-link>

      <!-- 포스트 본문 -->
      <div class="flex-grow-1">
        <!-- 작성자 정보 및 메뉴 -->
        <div class="d-flex justify-space-between align-center">
          <div class="d-flex align-center">
            <!-- 원본 포스트 작성자 정보 -->
            <div v-if="post.isRepost">
              <div class="d-flex align-center">
                <span class="font-weight-bold">{{ post.originalPost.authorName }}</span>
                <span class="text-grey mx-1">·</span>
                <span class="text-grey">@{{ post.originalPost.authorHandle }}</span>
              </div>
            </div>
            <!-- 일반 포스트 작성자 정보 -->
            <div v-else>
              <span class="font-weight-bold">{{ post.authorName }}</span>
              <span class="text-grey mx-1">·</span>
              <span class="text-grey">@{{ post.authorHandle }}</span>
            </div>
          </div>
          <span class="text-caption text-medium-emphasis mx-1">·</span>
          <span class="text-caption text-medium-emphasis">
            {{ formatDate(post.createdAt) }}
          </span>
          <!-- 더보기 메뉴 -->
          <v-menu location="bottom end">
            <template v-slot:activator="{ props }">
              <v-btn
                icon="mdi-dots-horizontal"
                variant="text"
                density="comfortable"
                size="small"
                v-bind="props"
              ></v-btn>
            </template>
            <v-list>
              <v-list-item
                v-if="post.authorId === currentUser?.uid"
                @click="isEditing = true"
              >
                <template v-slot:prepend>
                  <v-icon>mdi-pencil</v-icon>
                </template>
                <v-list-item-title>수정</v-list-item-title>
              </v-list-item>
              <v-list-item
                v-if="post.authorId === currentUser?.uid"
                @click="deleteDialog = true"
                color="error"
              >
                <template v-slot:prepend>
                  <v-icon>mdi-delete</v-icon>
                </template>
                <v-list-item-title>삭제</v-list-item-title>
              </v-list-item>
            </v-list>
          </v-menu>
        </div>

        <!-- 포스트 내용 -->
        <div v-if="!isEditing" class="post-text my-2">
          <div v-html="parsedContent"></div>
          <span v-if="post.updatedAt" class="text-caption text-medium-emphasis ml-2">
            (수정됨)
          </span>
          <!-- 미디어 표시 -->
          <div v-if="post.mediaUrls?.length" class="media-grid mt-2">
            <v-img
              v-for="(url, index) in post.mediaUrls"
              :key="index"
              :src="url"
              :aspect-ratio="16/9"
              cover
              class="rounded-lg"
            ></v-img>
          </div>
        </div>

        <!-- 수정 폼 -->
        <div v-else class="edit-form my-2">
          <v-textarea
            v-model="editedContent"
            auto-grow
            rows="3"
            hide-details
            variant="outlined"
            density="comfortable"
          ></v-textarea>
          <div class="d-flex justify-end mt-2">
            <v-btn
              variant="text"
              class="mr-2"
              @click="isEditing = false"
            >
              취소
            </v-btn>
            <v-btn
              color="primary"
              @click="handleEdit"
              :disabled="!editedContent.trim()"
            >
              저장
            </v-btn>
          </div>
        </div>

        <!-- 액션 버튼들 -->
        <div class="post-actions d-flex align-center justify-space-between mt-2">
          <!-- 답글 버튼 -->
          <div class="action-button">
            <v-btn
              icon
              variant="text"
              size="small"
              @click="showReplies = !showReplies"
              :color="showReplies ? 'primary' : undefined"
            >
              <v-icon>mdi-comment-outline</v-icon>
            </v-btn>
            <span class="text-caption">{{ replies.length }}</span>
          </div>

          <!-- 리트윗 버튼 -->
          <div class="action-button">
            <v-btn
              icon
              variant="text"
              size="small"
              @click="toggleRepost"
              :loading="repostLoading"
              :color="isReposted ? 'success' : undefined"
            >
              <v-icon>mdi-repeat</v-icon>
            </v-btn>
            <span class="text-caption">{{ post.reposts?.length || 0 }}</span>
          </div>

          <!-- 좋아요 버튼 -->
          <div class="action-button">
            <v-btn
              icon
              variant="text"
              size="small"
              @click="toggleLike"
              :loading="likeLoading"
              :color="isLiked ? 'error' : undefined"
              class="like-button"
            >
              <v-icon>{{ isLiked ? 'mdi-heart' : 'mdi-heart-outline' }}</v-icon>
            </v-btn>
            <span class="text-caption">{{ post.likes?.length || 0 }}</span>
          </div>

          <!-- 공유 버튼 -->
          <div class="action-button">
            <v-btn
              icon
              variant="text"
              size="small"
              @click="handleShare"
            >
              <v-icon>mdi-share-variant</v-icon>
            </v-btn>
          </div>
        </div>

        <!-- 답글 섹션 -->
        <v-expand-transition>
          <div v-if="showReplies" class="replies-section mt-4">
            <v-divider class="mb-4"></v-divider>
            
            <!-- 답글 작성 폼 -->
            <div v-if="currentUser" class="reply-form mb-4">
              <div class="d-flex">
                <v-avatar size="32" :color="$vuetify.theme.current.dark ? 'white' : 'primary'" class="mr-3">
                  <span :class="[
                    'text-subtitle-2',
                    $vuetify.theme.current.dark ? 'text-black' : 'text-white'
                  ]">
                    {{ currentUserInitial }}
                  </span>
                </v-avatar>
                <div class="flex-grow-1">
                  <v-textarea
                    v-model="replyContent"
                    placeholder="답글 작성하기"
                    auto-grow
                    rows="1"
                    hide-details
                    variant="plain"
                    density="comfortable"
                    class="reply-textarea"
                  ></v-textarea>
                  <div class="d-flex justify-end mt-2">
                    <v-btn
                      color="primary"
                      size="small"
                      rounded="pill"
                      :disabled="!replyContent.trim()"
                      :loading="replyLoading"
                      @click="handleReplySubmit"
                    >
                      답글
                    </v-btn>
                  </div>
                </div>
              </div>
            </div>

            <!-- 답글 목록 -->
            <div class="replies-list">
              <div 
                v-for="reply in replies" 
                :key="reply.id"
                class="reply-item mb-4"
              >
                <!-- 답글 컴포넌트를 재귀적으로 사용 -->
                <PostCard
                  :post="reply"
                  :current-user="currentUser"
                  @update="handleReplyUpdate"
                  @delete="handleReplyDelete"
                />
              </div>
            </div>
          </div>
        </v-expand-transition>
      </div>
    </div>
  </div>
</template>

<style scoped>
.post-card {
  padding: 1rem;
  border-bottom: 1px solid rgba(0, 0, 0, 0.12);
}

.post-card:hover {
  background-color: rgba(0, 0, 0, 0.02);
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
  color: rgba(0, 0, 0, 0.6);
  font-size: 0.875rem;
  margin-left: 52px;
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
</style> 