# 1. 빌드 단계
FROM node:20-alpine AS builder

# pnpm 설치 (이미지 내부에 없는 경우)
RUN npm install -g pnpm

WORKDIR /app

# 의존성 파일 복사 및 설치
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
RUN pnpm install
# 나머지 소스 코드 복사
COPY . .

# 각 앱 빌드 (Nx 명령어를 사용하거나 개별 스크립트 실행)
RUN npx nx build ide
RUN npx nx build canvas-app

# 2. 실행 단계 (Nginx)
FROM nginx:stable-alpine

# Nginx 설정 파일 복사
COPY nginx.conf /etc/nginx/conf.d/default.conf

# 빌드된 결과물을 Nginx 정적 파일 경로로 복사
COPY --from=builder /app/dist/apps/ide /usr/share/nginx/html/ide
COPY --from=builder /app/dist/apps/canvas-app /usr/share/nginx/html/canvas-app

EXPOSE 80
EXPOSE 5174

CMD ["nginx", "-g", "daemon off;"]