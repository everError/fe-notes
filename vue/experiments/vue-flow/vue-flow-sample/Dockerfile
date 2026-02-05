# --------------------
# build stage
# --------------------
FROM node:20-alpine AS build

WORKDIR /app

# 패키지 
COPY package*.json ./

RUN npm install

# 소스 복사
COPY . .

# 타입체크 + 빌드
RUN npm run build


# --------------------
# runtime stage
# --------------------
FROM nginx:alpine

# 기본 nginx 설정 제거
RUN rm -rf /usr/share/nginx/html/*

# Vite build 결과 복사
COPY --from=build /app/dist /usr/share/nginx/html

EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]
