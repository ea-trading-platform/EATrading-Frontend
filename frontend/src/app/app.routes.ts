import { Routes } from '@angular/router';
import { Landing } from './features/landing/landing';
import { ClientDashboard } from './features/dashboard/client-dashboard/client-dashboard';
import { AdminDashboard } from './features/dashboard/admin-dashboard/admin-dashboard';
import { Transact } from './features/transact/transact';
import { News } from './features/news/news';
import { guestGuard, roleGuard } from './core/guards/auth.guard';

export const routes: Routes = [
    { path: '', component: Landing, canActivate: [guestGuard] },
    { path: 'dashboard', component: ClientDashboard, canActivate: [roleGuard], data: { roles: ['CLIENT'] } },
    { path: 'transact', component: Transact, canActivate: [roleGuard], data: { roles: ['CLIENT'] } },
    { path: 'news', component: News, canActivate: [roleGuard], data: { roles: ['CLIENT'] } },
    { path: 'admin-dashboard', component: AdminDashboard, canActivate: [roleGuard], data: { roles: ['ADMIN'] } },
    { path: '**', redirectTo: '' },
];
