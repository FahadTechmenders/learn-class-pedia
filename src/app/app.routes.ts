import { Routes } from '@angular/router';

export const routes: Routes = [
  {
    path: '',
    redirectTo: 'course',
    pathMatch: 'full'
  },
  {
    path: 'dashboard',
    loadComponent: () => import('./shared/dashboard/dashboard').then(m => m.DashboardComponent)
  },
  {
    path: 'course',
    loadComponent: () => import('./setup/classroom/classroom').then(m => m.ClassroomComponent)
  },
  {
    path: 'course/classroom',
    loadComponent: () => import('./setup/classroom/classroom').then(m => m.ClassroomComponent)
  },
  {
    path: 'classroom',
    loadComponent: () => import('./setup/classroom/classroom').then(m => m.ClassroomComponent)
  },

  {
    path: '**',
    redirectTo: 'course'
  }
];
