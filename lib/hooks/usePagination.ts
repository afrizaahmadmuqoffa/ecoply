'use client'

import { useMemo, useState } from 'react'

export default function usePagination<T>(items: T[], pageSize = 10) {
  const [page, setPage] = useState(1)

  const totalPages = Math.max(1, Math.ceil(items.length / pageSize))
  const current = Math.min(Math.max(page, 1), totalPages)

  return {
    page: current,
    goToPage: (p: number) => setPage(Math.max(1, Math.min(Math.round(p), totalPages))),
    pageItems: useMemo(
      () => items.slice((current - 1) * pageSize, current * pageSize),
      [items, current, pageSize],
    ),
    totalPages,
    total: items.length,
    pageSize,
  }
}