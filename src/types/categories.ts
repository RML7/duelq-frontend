import type { DuelCategory } from '@/api/types'

export interface Category {
  label: string
  value: DuelCategory
}

export const CATEGORIES: Category[] = [
  { label: 'Кино', value: 'cinema' },
]

export function getCategoryLabel(categoryValue: DuelCategory): string {
  const category = CATEGORIES.find(c => c.value === categoryValue)
  return category ? category.label : categoryValue
}
