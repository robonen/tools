export { default as TabsRoot } from './TabsRoot.vue';
export { default as TabsList } from './TabsList.vue';
export { default as TabsTrigger } from './TabsTrigger.vue';
export { default as TabsContent } from './TabsContent.vue';
export { default as TabsIndicator } from './TabsIndicator.vue';

export { provideTabsContext, useTabsContext } from './context';

export type { TabsRootProps, TabsRootEmits } from './TabsRoot.vue';
export type { TabsListProps } from './TabsList.vue';
export type { TabsTriggerProps } from './TabsTrigger.vue';
export type { TabsContentProps } from './TabsContent.vue';
export type { TabsIndicatorProps } from './TabsIndicator.vue';
export type { TabsContext, TabsValue } from './context';
