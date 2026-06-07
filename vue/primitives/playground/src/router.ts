import type { Component } from 'vue';
import type { RouteRecordRaw } from 'vue-router';
import { createRouter, createWebHistory } from 'vue-router';
import HomeView from './views/Home.vue';
import NotFoundView from './views/NotFound.vue';

// Eager paths, lazy components → each demo ships as its own chunk.
const demoModules = import.meta.glob<{ default: Component }>('./demos/*.vue');

export interface DemoEntry {
  name: string;
  path: string;
  routePath: string;
}

export const demos: DemoEntry[] = Object.keys(demoModules)
  .map((path) => {
    const name = path.replace(/^.*\/demos\//, '').replace(/\.vue$/, '');
    return { name, path, routePath: `/demo/${encodeURIComponent(name)}` };
  })
  .sort((a, b) => a.name.localeCompare(b.name));

const demoRoutes: RouteRecordRaw[] = demos.map(demo => ({
  path: demo.routePath,
  name: `demo:${demo.name}`,
  component: demoModules[demo.path]!,
  meta: { demoName: demo.name },
}));

export const router = createRouter({
  history: createWebHistory(),
  routes: [
    { path: '/', name: 'home', component: HomeView },
    ...demoRoutes,
    { path: '/:pathMatch(.*)*', name: 'not-found', component: NotFoundView },
  ],
});
