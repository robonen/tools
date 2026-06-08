export { default as DatePickerRoot } from './DatePickerRoot.vue';
export { default as DatePickerTrigger } from './DatePickerTrigger.vue';
export { default as DatePickerAnchor } from './DatePickerAnchor.vue';
export { default as DatePickerPortal } from './DatePickerPortal.vue';
export { default as DatePickerContent } from './DatePickerContent.vue';
export { default as DatePickerArrow } from './DatePickerArrow.vue';
export { default as DatePickerClose } from './DatePickerClose.vue';
export { default as DatePickerCalendar } from './DatePickerCalendar.vue';
export { default as DatePickerField } from './DatePickerField.vue';
export { default as DatePickerInput } from './DatePickerField.vue';

// Calendar subparts re-exported as DatePicker* aliases (share CalendarRootContext provided by DatePickerRoot).
export { default as DatePickerHeader } from '../calendar/CalendarHeader.vue';
export { default as DatePickerHeading } from '../calendar/CalendarHeading.vue';
export { default as DatePickerPrev } from '../calendar/CalendarPrev.vue';
export { default as DatePickerNext } from '../calendar/CalendarNext.vue';
export { default as DatePickerGrid } from '../calendar/CalendarGrid.vue';
export { default as DatePickerGridHead } from '../calendar/CalendarGridHead.vue';
export { default as DatePickerGridBody } from '../calendar/CalendarGridBody.vue';
export { default as DatePickerGridRow } from '../calendar/CalendarGridRow.vue';
export { default as DatePickerHeadCell } from '../calendar/CalendarHeadCell.vue';
export { default as DatePickerCell } from '../calendar/CalendarCell.vue';
export { default as DatePickerCellTrigger } from '../calendar/CalendarCellTrigger.vue';

export { provideDatePickerRootContext, useDatePickerRootContext } from './context';
export type { DatePickerRootContext } from './context';

export type { DatePickerRootEmits, DatePickerRootProps } from './DatePickerRoot.vue';
export type { DatePickerTriggerProps } from './DatePickerTrigger.vue';
export type { DatePickerAnchorProps } from './DatePickerAnchor.vue';
export type { DatePickerPortalProps } from './DatePickerPortal.vue';
export type { DatePickerContentEmits, DatePickerContentProps } from './DatePickerContent.vue';
export type { DatePickerArrowProps } from './DatePickerArrow.vue';
export type { DatePickerCloseProps } from './DatePickerClose.vue';
export type { DatePickerCalendarProps } from './DatePickerCalendar.vue';
export type { DatePickerFieldProps } from './DatePickerField.vue';
