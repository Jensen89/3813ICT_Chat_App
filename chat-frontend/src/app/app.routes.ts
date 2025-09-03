import { Routes } from '@angular/router';
import { Login } from './components/login/login';
import { Dashboard } from './components/dashboard/dashboard';
import { Users } from './components/users/users';
import { Groups } from './components/groups/groups';
import { Channels } from './components/channels/channels';
import { Chat } from './components/chat/chat';

export const routes: Routes = [

    { path : '', redirectTo: 'login', pathMatch: 'full' },
    { path : 'login', component: Login },
    { path : 'dashboard', component: Dashboard },
    { path : 'users', component: Users },
    { path : 'groups', component: Groups },
    { path : 'channels', component: Channels },
    { path : 'chat/:groupID /:channelId', component: Chat },
    { path : '**', redirectTo: 'login' }

];
