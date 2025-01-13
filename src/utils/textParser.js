export const parseText = (text) => {
  // 해시태그 매칭 정규식
  const hashtagRegex = /#[\w가-힣]+/g
  // 멘션 매칭 정규식
  const mentionRegex = /@[\w가-힣]+/g
  // URL 매칭 정규식
  const urlRegex = /(https?:\/\/[^\s]+)/g

  let result = text
  
  // URL을 링크로 변환
  result = result.replace(urlRegex, '<a href="$1" target="_blank" rel="noopener">$1</a>')
  
  // 해시태그를 링크로 변환
  result = result.replace(hashtagRegex, match => 
    `<router-link to="/hashtag/${match.slice(1)}" class="hashtag">${match}</router-link>`)
  
  // 멘션을 링크로 변환
  result = result.replace(mentionRegex, match => 
    `<router-link to="/@${match.slice(1)}" class="mention">${match}</router-link>`)

  return result
} 