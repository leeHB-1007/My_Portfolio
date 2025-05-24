# Stage 1: Build the React application
FROM node:18-alpine AS builder
WORKDIR /app
# COPY package.json yarn.lock ./ # Yarn 사용 시
# npm을 사용한다면:
COPY package.json package-lock.json ./

# RUN yarn install --frozen-lockfile # Yarn 사용 시
# npm을 사용한다면:
RUN npm ci

COPY . .
# RUN yarn build # Yarn 사용 시
# npm을 사용한다면:
RUN npm run build

# Stage 2: Serve application with Nginx
FROM nginx:1.25-alpine
# Nginx 설정 파일 복사
COPY nginx.conf /etc/nginx/conf.d/default.conf
# 빌드된 React 앱 파일 복사
# React 프로젝트의 빌드 출력 폴더가 'build'라고 가정합니다. 'dist' 등 다른 이름일 수 있습니다.
# 만약 npm run build 결과가 dist 폴더에 생성된다면 /app/dist 로 수정
COPY --from=builder /app/dist /usr/share/nginx/html

# Nginx가 80 포트에서 수신 대기하도록 설정 (컨테이너 내부 포트)
EXPOSE 80

# Nginx 실행
CMD ["nginx", "-g", "daemon off;"]