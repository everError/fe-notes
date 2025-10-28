import { type App } from 'vue'
import PrimeVue from 'primevue/config'
import Aura from '@primeuix/themes/aura'
import Button from 'primevue/button'
import InputText from 'primevue/inputtext'
import ScrollPanel from 'primevue/scrollpanel'
import DataTable from 'primevue/datatable'
import Column from 'primevue/column'
import Accordion from 'primevue/accordion'
import AccordionHeader from 'primevue/accordionheader'
import AccordionPanel from 'primevue/accordionpanel'
import AccordionContent from 'primevue/accordioncontent'
import ProgressSpinner from 'primevue/progressspinner'
import 'primeicons/primeicons.css'

export default {
  install(app: App) {
    app.use(PrimeVue, {
      theme: {
        preset: Aura,
        options: {
          // prefix: 'p',
          cssLayer: {
            name: 'primevue',
            order: 'theme, base, primevue, utilities, components'
          }
        }
      }
    })
    // 글로벌 컴포넌트 등록
    app.component('Button', Button)
    app.component('InputText', InputText)
    app.component('ScrollPanel', ScrollPanel)
    app.component('DataTable', DataTable)
    app.component('Column', Column)
    app.component('Accordion', Accordion)
    app.component('AccordionHeader', AccordionHeader)
    app.component('AccordionPanel', AccordionPanel)
    app.component('AccordionContent', AccordionContent)
    app.component('ProgressSpinner', ProgressSpinner)
  }
}
