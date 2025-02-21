> 저 혼자 놀려고 만든 것이니, 실제 프로젝트에 사용하지 말 것을 알립니다.

# Sonnect Community

Sonnect Community는 Vue 3와 Firebase를 기반으로 한 실시간 소셜 네트워킹 플랫폼입니다. 사용자들이 생각을 공유하고 소통할 수 있는 공간을 제공합니다.

## 주요 기능

- 📝 실시간 포스트 작성 및 공유
- 💬 댓글과 답글 시스템
- 🌓 다크/라이트 테마 지원
- 📱 반응형 디자인
- 👤 사용자 프로필 관리
- 🔄 리포스트 기능
- 📊 관리자 대시보드

## 기술 스택

- Vue 3 + Composition API
- Vite
- Vuetify 3
- Firebase (Authentication, Firestore, Storage)
- PWA 지원

## 시작하기

### 준비사항

1. Node.js 18.0.0 이상
2. Firebase 프로젝트
3. npm 또는 yarn

### Firebase 설정

1. [Firebase Console](https://console.firebase.google.com/)에서 새 프로젝트 생성
2. 웹 앱 추가 (Add Web App)
3. Firebase Authentication에서 이메일/비밀번호 로그인 활성화
4. Firestore Database 생성
5. Storage 활성화

### 설치 및 실행

1. 저장소 클론
```bash
git clone https://github.com/your-username/sonnect.git
cd sonnect
```

2. 의존성 설치
```bash
npm install
```

3. 환경 변수 설정
`.env` 파일을 생성하고 Firebase 설정 추가:
```env
VITE_FIREBASE_API_KEY=your_api_key
VITE_FIREBASE_AUTH_DOMAIN=your_auth_domain
VITE_FIREBASE_PROJECT_ID=your_project_id
VITE_FIREBASE_STORAGE_BUCKET=your_storage_bucket
VITE_FIREBASE_MESSAGING_SENDER_ID=your_messaging_sender_id
VITE_FIREBASE_APP_ID=your_app_id
VITE_FIREBASE_MEASUREMENT_ID=your_measurement_id
```

4. 개발 서버 실행
```bash
npm run dev
```

5. 프로덕션 빌드
```bash
npm run build
```

## Firestore 인덱스 설정

다음 컬렉션에 대한 복합 인덱스가 필요합니다:

1. `posts` 컬렉션:
   - `createdAt` (Descending)

2. `announcements` 컬렉션:
   - `active` (Ascending)
   - `createdAt` (Descending)

## 배포

Cloudflare Pages에 배포하는 경우:

1. 저장소를 Cloudflare Pages에 연결
2. 빌드 설정:
   - 빌드 명령어: `npm run build`
   - 빌드 출력 디렉토리: `dist`
3. 환경 변수 설정 (위의 Firebase 설정과 동일)

## 기여하기

1. Fork the Project
2. Create your Feature Branch (`git checkout -b feature/AmazingFeature`)
3. Commit your Changes (`git commit -m 'Add some AmazingFeature'`)
4. Push to the Branch (`git push origin feature/AmazingFeature`)
5. Open a Pull Request

## 라이선스

이 프로젝트는 MIT 라이선스를 따릅니다. 자세한 내용은 [LICENSE](LICENSE) 파일을 참조하세요.

## 연락처

Uroyo - [@DowawonJi](https://twitter.com/DowawonJi)
> 딱히 Sonnect 관리를 하지는 않을 거예요. 저는 Sonnect를 미스키로 바꿀 거니까요.

프로젝트 링크: [여기](https://github.com/Monokii/Sonnect)
