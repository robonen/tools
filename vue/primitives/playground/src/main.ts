import { createApp } from 'vue';
import App from './App.vue';
import { router } from './router';
import './styles.css';

const app = createApp(App).use(router);

app.config.performance = true;

app.mount('#app');
