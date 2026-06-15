export { default as AccordionRoot } from './AccordionRoot.vue';
export { default as AccordionItem } from './AccordionItem.vue';
export { default as AccordionHeader } from './AccordionHeader.vue';
export { default as AccordionTrigger } from './AccordionTrigger.vue';
export { default as AccordionContent } from './AccordionContent.vue';

export { provideAccordionContext, useAccordionContext, provideAccordionItemContext, useAccordionItemContext } from './context';

export type { AccordionRootProps, AccordionRootEmits, AccordionType } from './AccordionRoot.vue';
export type { AccordionItemProps } from './AccordionItem.vue';
export type { AccordionHeaderProps } from './AccordionHeader.vue';
export type { AccordionTriggerProps } from './AccordionTrigger.vue';
export type { AccordionContentProps, AccordionContentEmits } from './AccordionContent.vue';
export type { AccordionContext, AccordionItemContext } from './context';
