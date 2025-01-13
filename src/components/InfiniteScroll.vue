<script setup>
import { ref, onMounted, onUnmounted } from 'vue'

const props = defineProps({
  loading: Boolean,
  hasMore: Boolean
})

const emit = defineEmits(['load-more'])
const observer = ref(null)
const target = ref(null)

onMounted(() => {
  observer.value = new IntersectionObserver(([entry]) => {
    if (entry.isIntersecting && !props.loading && props.hasMore) {
      emit('load-more')
    }
  }, {
    rootMargin: '100px'
  })

  if (target.value) {
    observer.value.observe(target.value)
  }
})

onUnmounted(() => {
  if (observer.value) {
    observer.value.disconnect()
  }
})
</script>

<template>
  <div ref="target" class="infinite-scroll-trigger">
    <v-progress-circular
      v-if="loading"
      indeterminate
      color="primary"
    ></v-progress-circular>
  </div>
</template> 