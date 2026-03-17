import { Routes } from '@angular/router';

const chatRoutes: Routes = [
  {
    path: '',
    loadComponent: () => import('./pages/chat-page/chat-page').then((m) => m.ChatPage),
    title: 'Chat',
  },
];

export default chatRoutes;
