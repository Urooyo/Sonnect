// Import the functions you need from the SDKs you need
import { initializeApp } from "firebase/app";
import { getAnalytics } from "firebase/analytics";
import { getFirestore, doc, setDoc, getDoc, 
  increment,
  collection, 
  query, 
  orderBy, 
  onSnapshot, 
  addDoc, 
  updateDoc, 
  deleteDoc, 
  arrayUnion, 
  arrayRemove,
  where,
  writeBatch,
  getDocs
} from 'firebase/firestore'
import { getAuth } from 'firebase/auth'
// TODO: Add SDKs for Firebase products that you want to use
// https://firebase.google.com/docs/web/setup#available-libraries

// Your web app's Firebase configuration
// For Firebase JS SDK v7.20.0 and later, measurementId is optional
const firebaseConfig = {
  apiKey: "AIzaSyBcyrUmsOCPTzmrUKfiZ1McU1rjW1qj8zc",
  authDomain: "labetto-sonnect.firebaseapp.com",
  projectId: "labetto-sonnect",
  storageBucket: "labetto-sonnect.firebasestorage.app",
  messagingSenderId: "361287138121",
  appId: "1:361287138121:web:3061b79f2032ae551e3898",
  measurementId: "G-YTNKKL8W3Y"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
let analytics = null;
// Analytics는 프로덕션 경에서만 초기화
if (process.env.NODE_ENV === 'production') {
  analytics = getAnalytics(app);
}
export const db = getFirestore(app);
export const auth = getAuth(app);

// 사용자의 포스팅 동의 상태 확인
export const checkPostingAgreement = async (userId) => {
  const userDoc = await getDoc(doc(db, 'users', userId))
  return userDoc.exists() && userDoc.data().agreedToPostingGuidelines
}

// 사용자의 포스팅 동의 상태 저장
export const savePostingAgreement = async (userId) => {
  await setDoc(doc(db, 'users', userId), {
    agreedToPostingGuidelines: true
  }, { merge: true })
}

// 사용자 정보 업데이트 및 관련 문서 일괄 업데이트
export const updateUserInfo = async (userId, newData) => {
  const batch = writeBatch(db)
  
  try {
    // 사용자 문서 업데이트
    const userRef = doc(db, 'users', userId)
    batch.update(userRef, newData)
    
    // 포스트 업데이트
    const postsQuery = query(
      collection(db, 'posts'),
      where('authorId', '==', userId)
    )
    const postsSnapshot = await getDocs(postsQuery)
    
    postsSnapshot.forEach((postDoc) => {
      batch.update(doc(db, 'posts', postDoc.id), {
        authorName: newData.displayName,
        authorHandle: newData.handle
      })
    })
    
    // 답글 업데이트
    const repliesQuery = query(
      collection(db, 'posts', postId, 'replies'),
      where('authorId', '==', userId)
    )
    const repliesSnapshot = await getDocs(repliesQuery)
    
    repliesSnapshot.forEach((replyDoc) => {
      batch.update(doc(db, 'replies', replyDoc.id), {
        authorName: newData.displayName,
        authorHandle: newData.handle
      })
    })
    
    // 리트윗된 포스트 업데이트
    const repostsQuery = query(
      collection(db, 'posts'),
      where('originalPost.authorId', '==', userId)
    )
    const repostsSnapshot = await getDocs(repostsQuery)
    
    repostsSnapshot.forEach((repostDoc) => {
      batch.update(doc(db, 'posts', repostDoc.id), {
        'originalPost.authorName': newData.displayName,
        'originalPost.authorHandle': newData.handle
      })
    })
    
    // 일괄 업데이트 실행
    await batch.commit()
    
    return true
  } catch (error) {
    console.error('Error updating user info:', error)
    throw error
  }
}

// 사용자 계정 및 관련 데이터 삭제
export const deleteUserAccount = async (userId) => {
  const batch = writeBatch(db)
  
  try {
    // 1. 사용자의 모든 포스트 찾기
    const postsQuery = query(
      collection(db, 'posts'),
      where('authorId', '==', userId)
    )
    const postsSnapshot = await getDocs(postsQuery)
    
    // 2. 각 포스트의 답글 삭제
    for (const postDoc of postsSnapshot.docs) {
      const repliesQuery = collection(db, 'posts', postDoc.id, 'replies')
      const repliesSnapshot = await getDocs(repliesQuery)
      
      repliesSnapshot.docs.forEach(replyDoc => {
        batch.delete(doc(db, 'posts', postDoc.id, 'replies', replyDoc.id))
      })
      
      // 포스트 삭제
      batch.delete(doc(db, 'posts', postDoc.id))
    }
    
    // 3. 사용자의 모든 답글 찾기 및 삭제 (다른 사용자의 포스트에 달린 답글)
    const allPostsQuery = query(collection(db, 'posts'))
    const allPostsSnapshot = await getDocs(allPostsQuery)
    
    for (const postDoc of allPostsSnapshot.docs) {
      const userRepliesQuery = query(
        collection(db, 'posts', postDoc.id, 'replies'),
        where('authorId', '==', userId)
      )
      const userRepliesSnapshot = await getDocs(userRepliesQuery)
      
      userRepliesSnapshot.docs.forEach(replyDoc => {
        batch.delete(doc(db, 'posts', postDoc.id, 'replies', replyDoc.id))
      })
    }
    
    // 4. 사용자의 리트윗 삭제
    const repostsQuery = query(
      collection(db, 'posts'),
      where('authorId', '==', userId),
      where('isRepost', '==', true)
    )
    const repostsSnapshot = await getDocs(repostsQuery)
    
    repostsSnapshot.docs.forEach(repostDoc => {
      batch.delete(doc(db, 'posts', repostDoc.id))
    })
    
    // 5. 사용자 문서 삭제
    batch.delete(doc(db, 'users', userId))
    
    // 6. 사용자의 알림 삭제
    const notificationsQuery = query(
      collection(db, 'notifications'),
      where('userId', '==', userId)
    )
    const notificationsSnapshot = await getDocs(notificationsQuery)
    
    notificationsSnapshot.docs.forEach(notificationDoc => {
      batch.delete(doc(db, 'notifications', notificationDoc.id))
    })
    
    // 일괄 삭제 실행
    await batch.commit()
    
    return true
  } catch (error) {
    console.error('Error deleting user data:', error)
    throw error
  }
}

// 사용자 문서 생성/업데이트
export const createOrUpdateUser = async (user, additionalData = {}) => {
  try {
    const userRef = doc(db, 'users', user.uid)
    const userData = {
      displayName: user.displayName,
      handle: user.photoURL?.replace(/^@+/, ''),
      email: user.email,
      updatedAt: new Date().toISOString(),
      ...additionalData
    }
    
    await setDoc(userRef, userData, { merge: true })
    return userData
  } catch (error) {
    console.error('Error creating/updating user:', error)
    throw error
  }
}