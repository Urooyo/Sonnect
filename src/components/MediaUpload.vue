<script setup>
import { ref } from 'vue'
import { ref as storageRef, uploadBytes, getDownloadURL } from 'firebase/storage'
import { storage, auth } from '@/firebase'

const props = defineProps({
  postId: {
    type: String,
    required: true
  }
})

const emit = defineEmits(['uploaded'])
const loading = ref(false)

const handleFileUpload = async (event) => {
  const file = event.target.files[0]
  if (!file) return

  loading.value = true
  try {
    const timestamp = Date.now()
    const path = `posts/${props.postId}/${timestamp}_${file.name}`
    const fileRef = storageRef(storage, path)

    await uploadBytes(fileRef, file)

    const url = await getDownloadURL(fileRef)

    emit('uploaded', url)
  } catch (error) {
    console.error('Error uploading file:', error)
  } finally {
    loading.value = false
  }
}
</script>

<template>
  <div class="media-upload">
    <input
      type="file"
      accept="image/*,video/*"
      @change="handleFileUpload"
      :disabled="loading"
      hidden
      ref="fileInput"
    >
    <v-btn
      icon
      variant="text"
      size="small"
      @click="$refs.fileInput.click()"
      :loading="loading"
    >
      <v-icon>mdi-image</v-icon>
    </v-btn>
  </div>
</template> 