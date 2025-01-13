<script setup>
import { ref, onMounted, onUnmounted } from 'vue'
import { 
  collection, 
  query, 
  orderBy, 
  onSnapshot,
  addDoc,
  updateDoc,
  deleteDoc,
  doc,
  increment,
  getDocs
} from 'firebase/firestore'
import { db, auth } from '@/firebase'
import PostCard from '@/components/PostCard.vue'

const posts = ref([])
const newPost = ref('')
const loading = ref(false)
let unsubscribe = null

// 포스트 로드
onMounted(() => {
  const q = query(
    collection(db, 'posts'),
    orderBy('createdAt', 'desc')
  )
  
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
    console.log('Loaded posts:', postsData)
  }, (error) => {
    console.error('Error loading posts:', error)
  })
})

onUnmounted(() => {
  if (unsubscribe) {
    unsubscribe()
  }
})

// 답글 핸들러
const handleReply = async ({ postId, content }) => {
  if (!auth.currentUser) return
  
  try {
    await addDoc(collection(db, 'posts', postId, 'replies'), {
      content,
      authorId: auth.currentUser.uid,
      authorName: auth.currentUser.displayName,
      authorHandle: auth.currentUser.photoURL,
      createdAt: new Date().toISOString(),
      likes: []
    })
    
    // 답글 수 증가
    const postRef = doc(db, 'posts', postId)
    await updateDoc(postRef, {
      replyCount: increment(1)
    })
  } catch (error) {
    console.error('Error creating reply:', error)
  }
}

// 리트윗 핸들러
const handleRepost = async (post) => {
  if (!auth.currentUser) return
  
  try {
    await addDoc(collection(db, 'posts'), {
      content: post.content,
      authorId: auth.currentUser.uid,
      authorName: auth.currentUser.displayName,
      authorHandle: auth.currentUser.photoURL,
      createdAt: new Date().toISOString(),
      likes: [],
      reposts: [],
      replyCount: 0,
      isRepost: true,
      originalPost: {
        id: post.id,
        authorName: post.authorName,
        authorHandle: post.authorHandle
      }
    })
  } catch (error) {
    console.error('Error creating repost:', error)
  }
}

// 포스트 수정
const handleUpdatePost = async ({ id, content }) => {
  try {
    const postRef = doc(db, 'posts', id)
    await updateDoc(postRef, {
      content,
      updatedAt: new Date().toISOString()
    })
  } catch (error) {
    console.error('Error updating post:', error)
  }
}

// 포스트 삭제
const handleDeletePost = async (postId) => {
  try {
    await deleteDoc(doc(db, 'posts', postId))
  } catch (error) {
    console.error('Error deleting post:', error)
  }
}

// 포스트 생성
const createPost = async () => {
  if (!newPost.value.trim() || !auth.currentUser) return
  
  loading.value = true
  try {
    await addDoc(collection(db, 'posts'), {
      content: newPost.value,
      authorId: auth.currentUser.uid,
      authorName: auth.currentUser.displayName,
      authorHandle: auth.currentUser.photoURL,
      createdAt: new Date().toISOString(),
      likes: [],
      reposts: [],
      replyCount: 0,
      isRepost: false
    })
    newPost.value = ''
  } catch (error) {
    console.error('Error creating post:', error)
  } finally {
    loading.value = false
  }
}
</script>

<template>
  <v-container>
    <v-card class="mb-6" v-if="auth.currentUser">
      <v-card-text>
        <div class="d-flex">
          <v-avatar size="40" class="mr-3">
            <v-icon>mdi-account</v-icon>
          </v-avatar>
          <div class="flex-grow-1">
            <v-textarea
              v-model="newPost"
              placeholder="무슨 일이 일�나고 있나요?"
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
                :disabled="!newPost.trim()"
              >
                게시하기
              </v-btn>
            </div>
          </div>
        </div>
      </v-card-text>
    </v-card>

    <div class="posts-container">
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
    </div>
  </v-container>
</template>

<style scoped>
.post-textarea {
  border: none !important;
  outline: none !important;
  box-shadow: none !important;
  font-size: 1.25rem !important;
}

.posts-container {
  max-width: 600px;
  margin: 0 auto;
}

:deep(.v-field__outline) {
  display: none !important;
}
</style>
