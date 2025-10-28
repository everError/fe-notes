import { createApp } from 'vue'
import { createPinia } from 'pinia'
import PrimeVuePlugin from '@/plugins/primevue'
import App from './App.vue'
import router from './router'
import '@/assets/tailwind.css'
import {
  Chart as ChartJS,
  Title,
  Tooltip,
  Legend,
  BarElement,
  CategoryScale,
  LinearScale,
  ArcElement,
  LineElement,
  PointElement,
  Filler
} from 'chart.js'
import ChartDataLabels from 'chartjs-plugin-datalabels'
import ConfirmationService from 'primevue/confirmationservice'
import ToastService from 'primevue/toastservice'

ChartJS.register(
  Title,
  Tooltip,
  Legend,
  BarElement,
  CategoryScale,
  LinearScale,
  ArcElement,
  ChartDataLabels,
  LineElement,
  PointElement,
  Filler
)

const app = createApp(App)
app.use(ConfirmationService)
app.use(ToastService)

app.use(createPinia())
app.use(router)

app.use(PrimeVuePlugin)

app.mount('#app')
