import { createRouter, createWebHashHistory } from 'vue-router'
import { useAuth } from './stores/auth'
import DashboardView from './views/DashboardView.vue'
import LoginView from './views/LoginView.vue'
import ProductEditView from './views/ProductEditView.vue'
import ProductView from './views/ProductView.vue'

// Hash history: funciona no GitHub Pages sem configuração de servidor.
export const router = createRouter({
  history: createWebHashHistory(),
  routes: [
    { path: '/', name: 'dashboard', component: DashboardView },
    { path: '/login', name: 'login', component: LoginView, meta: { public: true } },
    { path: '/produtos/novo', name: 'product-new', component: ProductEditView },
    { path: '/produtos/:id', name: 'product', component: ProductView, props: true },
    { path: '/produtos/:id/editar', name: 'product-edit', component: ProductEditView, props: true },
    { path: '/:pathMatch(.*)*', redirect: '/' },
  ],
})

router.beforeEach(async (to) => {
  const auth = useAuth()
  await auth.init()
  if (!to.meta.public && !auth.loggedIn) return { name: 'login' }
  if (to.name === 'login' && auth.loggedIn) return { name: 'dashboard' }
})
