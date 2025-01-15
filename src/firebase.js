import { initializeApp } from 'firebase/app'
import { getFirestore } from 'firebase/firestore'
import { getAuth, deleteUser, updateProfile } from 'firebase/auth'
import { getStorage } from 'firebase/storage'
import { doc, deleteDoc, collection, query, where, getDocs, updateDoc, getDoc, setDoc } from 'firebase/firestore'

const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID
}

// Firebase 초기화
const app = initializeApp(firebaseConfig)

// Firestore 초기화
const db = getFirestore(app)

// Auth 초기화 
const auth = getAuth(app)
auth.useDeviceLanguage() // 브라우저 언어 설정 사용

// Storage 초기화
const storage = getStorage(app)

// 인증 상태 변경 리스너
auth.onAuthStateChanged(async (user) => {
  if (user) {
    try {
      const userDoc = await getDoc(doc(db, 'users', user.uid))
      if (userDoc.exists()) {
        const userData = userDoc.data()
        // 커스텀 객에 사용자 데이터 저장
        Object.defineProperty(user, 'customData', {
          value: userData,
          writable: true,
          configurable: true
        })
        console.log('User data loaded:', userData) // 디버깅용
      }
    } catch (error) {
      console.error('Error loading user data:', error)
    }
  }
})

// 사용자 계정 삭제 함수
const deleteUserAccount = async (user) => {
  try {
    // 사용자의 포스트 삭제
    const postsQuery = query(
      collection(db, 'posts'),
      where('authorId', '==', user.uid)
    )
    const postsSnapshot = await getDocs(postsQuery)
    const deletePromises = postsSnapshot.docs.map(doc => deleteDoc(doc.ref))
    await Promise.all(deletePromises)

    // Firestore에서 사용자 문서 삭제
    await deleteDoc(doc(db, 'users', user.uid))

    // Firebase Auth에서 사용자 삭제
    await deleteUser(user)

    return { success: true }
  } catch (error) {
    console.error('계정 삭제 중 오류 발생:', error)
    return { 
      success: false, 
      error: error.message 
    }
  }
}

// 사용자 정보 업데이트 함수
const updateUserInfo = async (uid, data) => {
  try {
    const userRef = doc(db, 'users', uid)
    await updateDoc(userRef, {
      ...data,
      updatedAt: new Date().toISOString()
    })
    return true
  } catch (error) {
    console.error('Error updating user info:', error)
    throw error
  }
}

export { db, auth, storage, deleteUserAccount, updateUserInfo }