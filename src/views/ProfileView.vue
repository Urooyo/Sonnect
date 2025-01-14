<script setup>
import { ref, onMounted, onUnmounted, computed } from 'vue'
import { useRoute } from 'vue-router'
import { 
  collection, 
  query, 
  where,
  orderBy, 
  onSnapshot,
  getDocs,
  doc,
  updateDoc,
  deleteDoc,
  addDoc,
  increment
} from 'firebase/firestore'
import { db, auth } from '@/firebase'
import PostCard from '@/components/PostCard.vue'
import { formatDistanceToNow, format } from 'date-fns'
import { ko } from 'date-fns/locale'

const route = useRoute()
const userHandle = computed(() => route.params.handle)

const user = ref(null)
const posts = ref([])
let unsubscribe = null

// 사용자 정보 로드
const loadUserInfo = async () => {
  console.log('Searching for user with handle:', userHandle.value)
  
  try {
    const usersRef = collection(db, 'users')
    const cleanHandle = userHandle.value.replace(/^@+/, '')
    console.log('Cleaned handle:', cleanHandle)
    
    const q = query(usersRef, where('handle', '==', cleanHandle))
    const snapshot = await getDocs(q)
    
    console.log('Query results:', snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })))
    
    if (!snapshot.empty) {
      user.value = { id: snapshot.docs[0].id, ...snapshot.docs[0].data() }
      console.log('Found user:', user.value)
      loadUserPosts()
    } else {
      console.log('No user found with handle:', cleanHandle)
      user.value = null
    }
  } catch (error) {
    console.error('Error loading user info:', error)
    user.value = null
  }
}

// 사용자의 포스트 로드
const loadUserPosts = () => {
  if (!user.value) return

  try {
    const q = query(
      collection(db, 'posts'),
      where('authorId', '==', user.value.id),
      orderBy('createdAt', 'desc')
    )
    
    if (unsubscribe) {
      unsubscribe()
    }
    
    unsubscribe = onSnapshot(q, async (snapshot) => {
      const postsData = []
      for (const doc of snapshot.docs) {
        const post = { id: doc.id, ...doc.data() }
        
        // 답글 로드
        const repliesQuery = query(
          collection(db, `posts/${doc.id}/replies`),
          orderBy('createdAt', 'desc')
        )
        const repliesSnapshot = await getDocs(repliesQuery)
        post.replies = repliesSnapshot.docs.map(replyDoc => ({
          id: replyDoc.id,
          ...replyDoc.data()
        }))
        
        postsData.push(post)
      }
      posts.value = postsData
    }, (error) => {
      console.error('Error loading posts:', error)
    })
  } catch (error) {
    console.error('Error setting up posts listener:', error)
  }
}

// 포스트 수정 핸들러 추가
const handleUpdatePost = async ({ id, content }) => {
  try {
    const postRef = doc(db, 'posts', id)
    await updateDoc(postRef, {
      content,
      updatedAt: new Date().toISOString()
    })
    // 수정 후 포스트 목록 새로고침
    await loadUserPosts()
  } catch (error) {
    console.error('Error updating post:', error)
  }
}

// 포스트 삭제 핸들러
const handleDeletePost = async (postId) => {
  try {
    await deleteDoc(doc(db, 'posts', postId))
    // 삭제 후 포스트 목록 새로고침
    await loadUserPosts()
  } catch (error) {
    console.error('Error deleting post:', error)
  }
}

// 답글 핸들러 추가
const handleReply = async ({ postId, content, parentId }) => {
  try {
    await addDoc(collection(db, 'posts', postId, 'replies'), {
      content,
      authorId: auth.currentUser.uid,
      authorName: auth.currentUser.displayName,
      authorHandle: auth.currentUser.photoURL,
      createdAt: new Date().toISOString(),
      likes: [],
      parentId
    })
    
    // 답글 수 업데이트
    const postRef = doc(db, 'posts', postId)
    await updateDoc(postRef, {
      replyCount: increment(1)
    })
  } catch (error) {
    console.error('Error creating reply:', error)
  }
}

// 리트윗 핸들러 추가
const handleRepost = async ({ originalPost, userId }) => {
  try {
    await addDoc(collection(db, 'posts'), {
      content: originalPost.content,
      authorId: userId,
      authorName: auth.currentUser.displayName,
      authorHandle: auth.currentUser.photoURL,
      createdAt: new Date().toISOString(),
      likes: [],
      reposts: [],
      replyCount: 0,
      isRepost: true,
      originalPost: {
        id: originalPost.id,
        authorName: originalPost.authorName,
        authorHandle: originalPost.authorHandle
      }
    })
  } catch (error) {
    console.error('Error creating repost:', error)
  }
}

// 계정 생성일 포맷팅 함수
const formatCreationDate = (user) => {
  if (!user?.metadata?.creationTime) return ''
  
  const creationDate = new Date(user.metadata.creationTime)
  return format(creationDate, 'yyyy년 MM월 dd일', { locale: ko })
}

onMounted(() => {
  loadUserInfo()
})

onUnmounted(() => {
  if (unsubscribe) {
    unsubscribe()
  }
})
</script>

<template>
  <v-container class="pa-4">
    <!-- 프로필 헤더 -->
    <v-card v-if="user" class="mb-6">
      <v-card-text>
        <div class="d-flex align-center mb-4">
          <v-avatar size="96" :color="$vuetify.theme.current.dark ? 'white' : 'primary'" class="mr-4">
            <span :class="[
              'text-h4',
              $vuetify.theme.current.dark ? 'text-black' : 'text-white'
            ]">
              {{ user?.displayName?.[0]?.toUpperCase() || '?' }}
            </span>
          </v-avatar>
          <div>
            <div class="text-h5">{{ user.displayName }}</div>
            <div class="text-subtitle-1 text-medium-emphasis">@{{ user.handle || '' }}</div>
            <div class="text-caption text-medium-emphasis mt-1">
              가입일: {{ formatCreationDate(auth.currentUser) }}
            </div>
          </div>
        </div>
        
        <div class="d-flex">
          <div class="mr-4">
            <div class="text-h6">{{ posts.length }}</div>
            <div class="text-caption text-medium-emphasis">포스트</div>
          </div>
        </div>
      </v-card-text>
    </v-card>

    <!-- 사용자를 찾을 수 없는 경우 -->
    <v-alert
      v-else
      type="error"
      class="mb-6"
    >
      바람과 함께 사라진 것 같아요. 아니면, 그냥 찾을 수 없어요.
    </v-alert>

    <!-- 포스트 목록 -->
    <div v-if="user" class="posts-container">
      <PostCard
        v-for="post in posts"
        :key="post.id"
        :post="post"
        :current-user="auth.currentUser"
        @update="handleUpdatePost"
        @delete="handleDeletePost"
        @reply="handleReply"
        @repost="handleRepost"
      />
      <v-alert
        v-if="posts.length === 0"
        type="info"
        class="mt-4"
      >
        아직 작성한 포스트가 없어요.
      </v-alert>
    </div>
  </v-container>
</template> 