import { Routes } from '@angular/router';
import { Login } from './components/login/login';
import { Dashboard } from './components/dashboard/dashboard';
import { Users } from './components/users/users';
import { Groups } from './components/groups/groups';
import { Channels } from './components/channels/channels';
import { ChatComponent } from './components/chat/chat';
import { Profile } from './components/profile/profile';

export const routes: Routes = [

    { path : '', redirectTo: 'login', pathMatch: 'full' },
    { path : 'login', component: Login },
    { path : 'dashboard', component: Dashboard },
    { path : 'users', component: Users },
    { path : 'groups', component: Groups },
    { path : 'channels/:groupId', component: Channels },
    { path : 'chat/:groupId/:channelId', component: ChatComponent },
    { path : 'profile', component: Profile},
    { path : '**', redirectTo: 'login' }

];
