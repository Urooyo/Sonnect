<script setup>
import { ref, onMounted, onUnmounted } from 'vue'
import { collection, query, where, orderBy, onSnapshot } from 'firebase/firestore'
import { db, auth } from '@/firebase'

const notifications = ref([])
let unsubscribe = null

onMounted(() => {
  if (auth.currentUser) {
    const q = query(
      collection(db, 'notifications'),
      where('userId', '==', auth.currentUser.uid),
      orderBy('createdAt', 'desc')
    )

    unsubscribe = onSnapshot(q, 
      (snapshot) => {
        notifications.value = snapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        }))
      },
      (error) => {
        console.error('Error fetching notifications:', error);
        // 권한 오류인 경우 조용히 처리
        if (error.code === 'permission-denied') {
          notifications.value = [];
        }
      }
    )
  }
})

onUnmounted(() => {
  if (unsubscribe) {
    unsubscribe()
  }
})
</script>

<template>
  <v-menu location="bottom end">
    <template v-slot:activator="{ props }">
      <v-btn
        icon
        v-bind="props"
        class="notification-btn"
      >
        <v-badge
          :content="notifications.filter(n => !n.read).length"
          :value="notifications.filter(n => !n.read).length"
          color="error"
        >
          <v-icon>mdi-bell</v-icon>
        </v-badge>
      </v-btn>
    </template>

    <v-list width="300">
      <v-list-item
        v-for="notification in notifications"
        :key="notification.id"
        :class="{ 'unread': !notification.read }"
      >
        <v-list-item-title>{{ notification.message }}</v-list-item-title>
        <v-list-item-subtitle>
          {{ formatDistanceToNow(new Date(notification.createdAt), { addSuffix: true }) }}
        </v-list-item-subtitle>
      </v-list-item>
    </v-list>
  </v-menu>
</template> 