export function getOpenState(open: boolean): 'open' | 'closed' {
  return open ? 'open' : 'closed';
}

export function shouldShowPlaceholder(value: string | undefined): boolean {
  return value === undefined || value === '';
}
