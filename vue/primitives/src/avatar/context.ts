import type { Ref } from 'vue';
import { useContextFactory } from '@robonen/vue';

export type AvatarImageLoadingStatus = 'idle' | 'loading' | 'loaded' | 'error';

export interface AvatarContext {
  imageLoadingStatus: Ref<AvatarImageLoadingStatus>;
  onImageLoadingStatusChange: (status: AvatarImageLoadingStatus) => void;
}

const ctx = useContextFactory<AvatarContext>('AvatarContext');

export const provideAvatarContext = ctx.provide;
export const useAvatarContext = ctx.inject;
