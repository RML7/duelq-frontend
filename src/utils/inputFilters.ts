export function filterIntegerInput(event: Event): string {
  const input = event.target as HTMLInputElement
  return input.value.replace(/[^0-9]/g, '')
}
