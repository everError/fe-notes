import type { TableColumn } from '@nuxt/ui'

/**
 * 데이터 배열을 기반으로 UTable의 columns prop을 동적으로 생성합니다.
 * @param data - 객체들의 배열
 * @returns TableColumn 타입의 배열
 */
export function useTable<T extends Record<string, any>>(
  data: T[]
): TableColumn<T>[] {
  const firstItem = data[0]

  if (!firstItem) {
    return []
  }

  return Object.keys(firstItem).map((key) => ({
    accessorKey: key,
    header: key.charAt(0).toUpperCase() + key.slice(1)
  }))
}
