<script setup>
import { ref } from 'vue'
import { getStorage, ref as storageRef, uploadBytes, getDownloadURL } from 'firebase/storage'

const props = defineProps({
  postId: String
})

const emit = defineEmits(['uploaded'])
const loading = ref(false)
const progress = ref(0)

const handleFileUpload = async (event) => {
  const file = event.target.files[0]
  if (!file) return

  loading.value = true
  const storage = getStorage()
  const fileRef = storageRef(storage, `posts/${props.postId}/${file.name}`)

  try {
    const snapshot = await uploadBytes(fileRef, file)
    const url = await getDownloadURL(snapshot.ref)
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