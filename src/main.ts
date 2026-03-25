import { createApp } from 'vue';
import { createPinia } from 'pinia';
import { install as VueMonacoEditorPlugin } from '@guolao/vue-monaco-editor';
import * as Sentry from '@sentry/vue';
import App from './App.vue';
import router from './router';
import './styles/main.css';

const app = createApp(App);

// Sentry error tracking
Sentry.init({
  app,
  dsn: 'https://1b3fbab3f097b65e9fb8b8c978383c2e@o4505191293779968.ingest.us.sentry.io/4511106667970560',
  integrations: [
    Sentry.browserTracingIntegration({ router }),
  ],
  tracesSampleRate: 0.1,
  environment: import.meta.env.MODE,
  release: 'shazam-dashboard@0.3.0',
  beforeSend(event) {
    // Don't send in dev mode
    if (import.meta.env.DEV) return null;
    return event;
  },
});

app.use(createPinia());
app.use(router);
app.use(VueMonacoEditorPlugin);
app.mount('#app');
