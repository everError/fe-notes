import { createRouter, createWebHistory, type RouteRecordRaw } from 'vue-router'
import ChatPage from '@/pages/chat/[id].vue'
import IndexPage from '@/pages/Index.vue'
import TestPage from '@/pages/Test.vue'
import { useChatStore } from '@/stores/chat'

// 라우트 정의
const routes: RouteRecordRaw[] = [
  {
    path: '/',
    name: 'Home',
    component: IndexPage
  },
  {
    path: '/chat/:id',
    name: 'Chat',
    component: ChatPage,
    props: true
  },
  ///
  {
    path: '/test',
    name: 'Test',
    component: TestPage
  }
  ///
  // {
  //   path: '/:pathMatch(.*)*', // 404 처리
  //   component: NotFound
  // }
]

const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes
})
// router.beforeEach((to, from, next) => {
//   useChatStore().initCurrentChat()
//   next()
// })

export default router
