<script setup>
import { ref, onMounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { doc, getDoc, collection, query, orderBy, getDocs } from 'firebase/firestore'
import { db, auth } from '@/firebase'
import { format } from 'date-fns'
import { ko } from 'date-fns/locale'
import PostCard from '@/components/PostCard.vue'

const route = useRoute()
const router = useRouter()
const post = ref(null)
const replies = ref([])

const formatDate = (date) => {
  return format(new Date(date), 'a h:mm · yyyy년 M월 d일', { locale: ko })
}

const loadPost = async () => {
  try {
    const postDoc = await getDoc(doc(db, 'posts', route.params.id))
    if (postDoc.exists()) {
      post.value = { id: postDoc.id, ...postDoc.data() }
      
      // 답글 로드
      const repliesQuery = query(
        collection(db, `posts/${route.params.id}/replies`),
        orderBy('createdAt', 'desc')
      )
      const repliesSnapshot = await getDocs(repliesQuery)
      replies.value = repliesSnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }))
    } else {
      router.push('/404')
    }
  } catch (error) {
    console.error('Error loading post:', error)
  }
}

onMounted(() => {
  loadPost()
})
</script>

<template>
  <div>
    <!-- 헤더 -->
    <v-app-bar flat class="border-b">
      <v-btn icon="mdi-arrow-left" @click="router.back()" />
      <v-app-bar-title>포스트</v-app-bar-title>
    </v-app-bar>

    <!-- 포스트 상세 -->
    <div v-if="post" class="post-detail">
      <!-- 작성자 정보 -->
      <div class="d-flex align-center pa-4">
        <v-avatar size="40" class="mr-3" color="grey-lighten-3">
          {{ post.authorName?.[0]?.toUpperCase() }}
        </v-avatar>
        <div>
          <div class="font-weight-bold">{{ post.authorName }}</div>
          <div class="text-subtitle-2 text-grey">@{{ post.authorHandle }}</div>
        </div>
      </div>

      <!-- 포스트 내용 -->
      <div class="px-4 text-body-1">{{ post.content }}</div>

      <!-- 포스트 이미지가 있는 경우 -->
      <v-img
        v-if="post.imageUrl"
        :src="post.imageUrl"
        :aspect-ratio="16/9"
        cover
        class="mt-4"
      />

      <!-- 작성 시간 -->
      <div class="px-4 py-3 text-grey text-subtitle-2">
        {{ formatDate(post.createdAt) }}
      </div>

      <!-- 통계 -->
      <v-divider />
      <div class="d-flex px-4 py-3">
        <span class="mr-4">
          <span class="font-weight-bold">{{ post.reposts?.length || 0 }}</span>
          <span class="text-grey ml-1">리포스트</span>
        </span>
        <span>
          <span class="font-weight-bold">{{ post.likes?.length || 0 }}</span>
          <span class="text-grey ml-1">좋아요</span>
        </span>
      </div>

      <!-- 액션 버튼 -->
      <v-divider />
      <div class="d-flex justify-space-around py-2">
        <v-btn
          icon="mdi-comment-outline"
          variant="text"
          density="comfortable"
        />
        <v-btn
          icon="mdi-repeat"
          variant="text"
          density="comfortable"
        />
        <v-btn
          :icon="post.likes?.includes(auth.currentUser?.uid) ? 'mdi-heart' : 'mdi-heart-outline'"
          :color="post.likes?.includes(auth.currentUser?.uid) ? 'error' : undefined"
          variant="text"
          density="comfortable"
        />
        <v-btn
          icon="mdi-share-outline"
          variant="text"
          density="comfortable"
        />
      </div>
      <v-divider />

      <!-- 답글 목록 -->
      <div class="replies">
        <PostCard
          v-for="reply in replies"
          :key="reply.id"
          :post="reply"
          :current-user="auth.currentUser"
        />
      </div>
    </div>
  </div>
</template>

<style scoped>
.border-b {
  border-bottom: 1px solid rgb(var(--v-theme-border-color));
}

.post-detail {
  max-width: 600px;
  margin: 0 auto;
}
</style> 