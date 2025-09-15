// https://nuxt.com/docs/api/configuration/nuxt-config
export default defineNuxtConfig({
  modules: ['@nuxt/eslint', '@nuxt/ui', '@nuxtjs/mdc', '@nuxt/image'],
  devtools: { enabled: false },
  compatibilityDate: '2025-07-15',
  css: ['~/assets/css/main.css'],
  mdc: {
    highlight: {
      // noApiRoute: true
      shikiEngine: 'javascript'
    }
  },
  eslint: {
    config: {
      stylistic: {
        commaDangle: 'never',
        braceStyle: '1tbs'
      }
    }
  },
  routeRules: {
    '/api/service/**': {
      proxy: 'http://127.0.0.1:8000/api/**'
    }
  }
})
