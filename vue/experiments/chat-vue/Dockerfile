# 빌드 스테이지: Node.js로 Vue 앱 빌드
FROM node:20-alpine AS builder

# pnpm 활성화 (Corepack 사용)
RUN corepack enable && corepack prepare pnpm@latest --activate

# 작업 디렉토리 설정
WORKDIR /app

# 패키지 파일 복사 및 의존성 설치 (pnpm-lock.yaml도 필요)
COPY package.json pnpm-lock.yaml ./
RUN pnpm install --frozen-lockfile

# 소스 코드 복사
COPY . .

# Vite 빌드 (dist 폴더 생성)
RUN pnpm run build

# 런타임 스테이지: Nginx로 정적 파일 서빙
FROM nginx:1.25-alpine

# Nginx 설정 파일 복사 (필요 시 커스텀 nginx.conf 추가)
COPY nginx.conf /etc/nginx/conf.d/default.conf

# 빌드된 파일 복사
COPY --from=builder /app/dist /usr/share/nginx/html/agent

# Nginx 포트 노출
EXPOSE 80

# Nginx 시작 (기본 설정으로)
CMD ["nginx", "-g", "daemon off;"]