<template>
  <div class="flex flex-col items-center justify-center h-screen text-center">
    <h1 class="text-6xl font-bold text-red-500">404</h1>
    <p class="text-xl text-gray-600 mt-4">페이지를 찾을 수 없습니다.</p>
    <router-link
      to="/"
      class="mt-6 px-4 py-2 bg-blue-500 text-white rounded-lg shadow-md hover:bg-blue-600 transition"
    >
      홈으로 이동
    </router-link>
  </div>
</template>
