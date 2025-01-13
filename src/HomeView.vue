<script setup>
import { ref, onMounted } from 'vue'
import { collection, query, orderBy, addDoc, doc, updateDoc, deleteDoc, limit, getDocs, increment } from 'firebase/firestore'
import { db, auth } from '@/firebase'
import PostCard from '@/components/PostCard.vue'

const posts = ref([])
const newPost = ref('')
const loading = ref(false)

// 포스트 작성
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
      likes: []
    })
    newPost.value = ''
    // 포스트 작성 후 목록 새로고침
    await loadPosts()
  } catch (error) {
    console.error('Error creating post:', error)
  } finally {
    loading.value = false
  }
}

// 포스트 목록 로딩
const loadPosts = async () => {
  loading.value = true
  try {
    const postsRef = collection(db, 'posts')
    const q = query(
      postsRef, 
      orderBy('createdAt', 'desc'),
      limit(50)
    )
    
    const snapshot = await getDocs(q)
    posts.value = snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    }))
  } catch (error) {
    console.error('Error loading posts:', error)
  } finally {
    loading.value = false
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
    await loadPosts()  // 수정 후 목록 새로고침
  } catch (error) {
    console.error('Error updating post:', error)
  }
}

// 포스트 삭제
const handleDeletePost = async (postId) => {
  try {
    await deleteDoc(doc(db, 'posts', postId))
    await loadPosts()  // 삭제 후 목록 새로고침
  } catch (error) {
    console.error('Error deleting post:', error)
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

onMounted(() => {
  loadPosts()
})
</script> 