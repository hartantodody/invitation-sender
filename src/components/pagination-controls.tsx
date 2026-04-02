import { Button } from "@/components/ui/button"

type PaginationControlsProps = {
  page: number
  pageSize: number
  totalCount: number
  isLoading?: boolean
  onPageChange: (page: number) => void
}

function buildVisiblePages(currentPage: number, totalPages: number) {
  if (totalPages <= 5) {
    return Array.from({ length: totalPages }, (_, index) => index + 1)
  }

  const pages = new Set<number>([1, totalPages, currentPage, currentPage - 1, currentPage + 1])
  return Array.from(pages)
    .filter((page) => page >= 1 && page <= totalPages)
    .sort((a, b) => a - b)
}

export function PaginationControls({
  page,
  pageSize,
  totalCount,
  isLoading = false,
  onPageChange,
}: PaginationControlsProps) {
  const totalPages = Math.max(1, Math.ceil(totalCount / pageSize))
  const canGoPrevious = page > 1
  const canGoNext = page < totalPages
  const start = totalCount === 0 ? 0 : (page - 1) * pageSize + 1
  const end = Math.min(totalCount, page * pageSize)
  const visiblePages = buildVisiblePages(page, totalPages)

  if (totalCount <= pageSize) return null

  return (
    <div className="flex flex-col gap-2 rounded-xl border border-border/80 bg-white px-3 py-2 sm:flex-row sm:items-center sm:justify-between">
      <p className="text-xs text-muted-foreground">
        Menampilkan {start}-{end} dari {totalCount} tamu
      </p>

      <div className="flex items-center gap-1">
        <Button
          type="button"
          variant="outline"
          size="sm"
          className="h-8 rounded-lg bg-white px-2.5"
          onClick={() => onPageChange(page - 1)}
          disabled={!canGoPrevious || isLoading}
        >
          Sebelumnya
        </Button>

        {visiblePages.map((visiblePage, index) => {
          const previousPage = visiblePages[index - 1]
          const showGap = previousPage && visiblePage - previousPage > 1

          return (
            <span key={visiblePage} className="flex items-center gap-1">
              {showGap ? <span className="px-1 text-xs text-muted-foreground">...</span> : null}
              <Button
                type="button"
                variant={visiblePage === page ? "secondary" : "outline"}
                size="sm"
                className="h-8 min-w-8 rounded-lg px-2"
                onClick={() => onPageChange(visiblePage)}
                disabled={isLoading}
              >
                {visiblePage}
              </Button>
            </span>
          )
        })}

        <Button
          type="button"
          variant="outline"
          size="sm"
          className="h-8 rounded-lg bg-white px-2.5"
          onClick={() => onPageChange(page + 1)}
          disabled={!canGoNext || isLoading}
        >
          Berikutnya
        </Button>
      </div>
    </div>
  )
}
