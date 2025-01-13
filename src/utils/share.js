export const sharePost = async (post) => {
  const shareData = {
    title: '라베토 포스트 공유',
    text: post.content,
    url: `${window.location.origin}/@${post.authorHandle}/status/${post.id}`
  }

  try {
    if (navigator.share) {
      await navigator.share(shareData)
    } else {
      await navigator.clipboard.writeText(shareData.url)
      // 클립보드 복사 성공 알림
    }
  } catch (error) {
    console.error('Error sharing:', error)
  }
} 