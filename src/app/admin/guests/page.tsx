"use client"

import { type ChangeEvent, useCallback, useEffect, useMemo, useRef, useState } from "react"
import { useRouter } from "next/navigation"
import {
  Edit3Icon,
  FileSpreadsheetIcon,
  InboxIcon,
  Loader2Icon,
  PlusIcon,
  Trash2Icon,
  UsersRoundIcon,
} from "lucide-react"
import { toast } from "sonner"

import { AppShell } from "@/components/app-shell"
import { EmptyState } from "@/components/empty-state"
import { GuestForm } from "@/components/guest-form"
import { MobileHeader } from "@/components/mobile-header"
import { PaginationControls } from "@/components/pagination-controls"
import { SearchInput } from "@/components/search-input"
import { SignOutButton } from "@/components/sign-out-button"
import { StatusBadge } from "@/components/status-badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { getGuestShiftLabel } from "@/lib/guest-shift"
import { protectedNavItems } from "@/lib/navigation"
import { createClient } from "@/lib/supabase/client"
import {
  AUTH_REQUIRED_ERROR,
  createGuest,
  createGuestsBulk,
  deleteGuestById,
  fetchGuestsPage,
  getAuthenticatedUserId,
  updateGuestById,
} from "@/lib/supabase/data"
import { hasSupabasePublicEnv, missingSupabaseEnvMessage } from "@/lib/supabase/env"
import { getSupabaseErrorMessage } from "@/lib/supabase/error"
import type { Guest, GuestFormInput } from "@/lib/types"

const PAGE_SIZE = 12
const SEARCH_DEBOUNCE_MS = 350

function formatSentAt(sentAt: string | null) {
  if (!sentAt) return "-"

  return new Date(sentAt).toLocaleString("id-ID", {
    day: "2-digit",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  })
}

function toFormValues(guest: Guest): GuestFormInput {
  return {
    name: guest.name,
    phone: guest.phone ?? "",
    guestFrom: guest.guestFrom,
    shift: guest.shift,
    notes: guest.notes ?? "",
  }
}

const guestHeaderAliases = {
  name: ["name", "nama", "guestname", "namatamu"],
  phone: ["phone", "nomor", "nomorwa", "wa", "whatsapp", "nohp", "nomorhp"],
  guestFrom: ["guestfrom", "dari", "darisiapa", "source", "from", "asal", "keluarga"],
  shift: ["shift", "sesi", "session"],
  notes: ["notes", "catatan", "keterangan"],
} as const

function normalizeHeader(value: string) {
  return value.toLowerCase().replace(/[^a-z0-9]/g, "")
}

function pickCellValue(row: Record<string, unknown>, aliases: readonly string[]): string {
  const normalizedAliases = new Set(aliases.map((alias) => normalizeHeader(alias)))

  for (const [key, rawValue] of Object.entries(row)) {
    if (!normalizedAliases.has(normalizeHeader(key))) continue
    return String(rawValue ?? "").trim()
  }

  return ""
}

function parseShiftValue(rawShift: string): GuestFormInput["shift"] | null {
  const normalized = rawShift.trim().toLowerCase()
  if (!normalized) return "1"
  if (normalized === "1" || normalized.includes("shift 1")) return "1"
  if (normalized === "2" || normalized.includes("shift 2")) return "2"
  if (normalized === "3" || normalized.includes("shift 3")) return "3"

  if (["10-12", "10.00-12.00", "10:00-12:00"].some((value) => normalized.includes(value))) return "1"
  if (["13-15", "13.00-15.00", "13:00-15:00"].some((value) => normalized.includes(value))) return "2"
  if (["15-17", "15.00-17.00", "15:00-17:00"].some((value) => normalized.includes(value))) return "3"

  return null
}

function parseBulkGuestRows(rows: Record<string, unknown>[]) {
  const validRows: GuestFormInput[] = []
  const skippedRows: string[] = []

  rows.forEach((row, index) => {
    const rowNumber = index + 2
    const name = pickCellValue(row, guestHeaderAliases.name)
    const phone = pickCellValue(row, guestHeaderAliases.phone)
    const guestFrom = pickCellValue(row, guestHeaderAliases.guestFrom)
    const shift = parseShiftValue(pickCellValue(row, guestHeaderAliases.shift))
    const notes = pickCellValue(row, guestHeaderAliases.notes)

    if (!name || !guestFrom) {
      skippedRows.push(`Baris ${rowNumber}: nama dan "guest dari siapa" wajib diisi.`)
      return
    }

    if (!shift) {
      skippedRows.push(`Baris ${rowNumber}: nilai shift tidak valid (pakai 1/2/3).`)
      return
    }

    validRows.push({
      name,
      phone,
      guestFrom,
      shift,
      notes,
    })
  })

  return { validRows, skippedRows }
}

export default function AdminGuestsPage() {
  const router = useRouter()
  const supabase = useMemo(() => createClient(), [])
  const isSupabaseConfigured = hasSupabasePublicEnv()

  const [guests, setGuests] = useState<Guest[]>([])
  const [userId, setUserId] = useState<string | null>(null)
  const [totalGuests, setTotalGuests] = useState(0)
  const [currentPage, setCurrentPage] = useState(1)
  const [searchInput, setSearchInput] = useState("")
  const [searchQuery, setSearchQuery] = useState("")
  const [isLoading, setIsLoading] = useState(true)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [isBulkImporting, setIsBulkImporting] = useState(false)
  const [deletingGuestId, setDeletingGuestId] = useState<string | null>(null)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)
  const [dialogOpen, setDialogOpen] = useState(false)
  const [editingGuest, setEditingGuest] = useState<Guest | null>(null)
  const importInputRef = useRef<HTMLInputElement | null>(null)

  useEffect(() => {
    const timerId = window.setTimeout(() => {
      setSearchQuery(searchInput.trim())
    }, SEARCH_DEBOUNCE_MS)

    return () => {
      window.clearTimeout(timerId)
    }
  }, [searchInput])

  const loadGuestsPage = useCallback(
    async (activeUserId?: string, pageOverride?: number) => {
      const resolvedUserId = activeUserId ?? userId
      const resolvedPage = pageOverride ?? currentPage

      if (!resolvedUserId) return

      setIsLoading(true)
      setErrorMessage(null)

      if (!isSupabaseConfigured) {
        setErrorMessage(missingSupabaseEnvMessage)
        setIsLoading(false)
        return
      }

      try {
        const { guests: nextGuests, totalCount } = await fetchGuestsPage(supabase, {
          userId: resolvedUserId,
          page: resolvedPage,
          pageSize: PAGE_SIZE,
          searchQuery,
        })

        const totalPages = Math.max(1, Math.ceil(totalCount / PAGE_SIZE))

        if (resolvedPage > totalPages) {
          setCurrentPage(totalPages)
          return
        }

        setGuests(nextGuests)
        setTotalGuests(totalCount)
      } catch (error) {
        if (error instanceof Error && error.message === AUTH_REQUIRED_ERROR) {
          router.replace("/login")
          return
        }

        setErrorMessage(getSupabaseErrorMessage(error, "Data tamu belum bisa dimuat dari Supabase."))
      } finally {
        setIsLoading(false)
      }
    },
    [currentPage, isSupabaseConfigured, router, searchQuery, supabase, userId]
  )

  const initializePage = useCallback(async () => {
    setIsLoading(true)
    setErrorMessage(null)

    if (!isSupabaseConfigured) {
      setErrorMessage(missingSupabaseEnvMessage)
      setIsLoading(false)
      return
    }

    try {
      const nextUserId = await getAuthenticatedUserId(supabase)
      setUserId(nextUserId)
    } catch (error) {
      if (error instanceof Error && error.message === AUTH_REQUIRED_ERROR) {
        router.replace("/login")
        return
      }

      setErrorMessage(getSupabaseErrorMessage(error, "Data tamu belum bisa dimuat dari Supabase."))
      setIsLoading(false)
    }
  }, [isSupabaseConfigured, router, supabase])

  useEffect(() => {
    void initializePage()
  }, [initializePage])

  useEffect(() => {
    if (!userId) return
    void loadGuestsPage(userId)
  }, [currentPage, loadGuestsPage, searchQuery, userId])

  const openAddDialog = () => {
    setEditingGuest(null)
    setDialogOpen(true)
  }

  const openEditDialog = (guest: Guest) => {
    setEditingGuest(guest)
    setDialogOpen(true)
  }

  const closeDialog = () => {
    setDialogOpen(false)
    setEditingGuest(null)
  }

  const handleSubmit = async (values: GuestFormInput) => {
    if (!userId) return

    setIsSubmitting(true)

    try {
      if (editingGuest) {
        await updateGuestById(supabase, userId, editingGuest.id, values)
        toast.success("Data tamu berhasil diperbarui")
        await loadGuestsPage(userId)
      } else {
        await createGuest(supabase, userId, values)
        toast.success("Tamu berhasil ditambahkan")
        setCurrentPage(1)
        await loadGuestsPage(userId, 1)
      }

      closeDialog()
    } catch (error) {
      const message = error instanceof Error ? error.message : "Data tamu belum bisa disimpan."
      toast.error(message)
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleDelete = async (guest: Guest) => {
    if (!userId) return

    const isConfirmed = window.confirm(`Hapus ${guest.name} dari daftar tamu?`)
    if (!isConfirmed) return

    setDeletingGuestId(guest.id)

    try {
      await deleteGuestById(supabase, userId, guest.id)
      toast.success("Tamu berhasil dihapus")
      await loadGuestsPage(userId)
    } catch (error) {
      const message = error instanceof Error ? error.message : "Tamu belum bisa dihapus."
      toast.error(message)
    } finally {
      setDeletingGuestId(null)
    }
  }

  const triggerBulkImport = () => {
    importInputRef.current?.click()
  }

  const handleBulkFileChange = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    event.target.value = ""

    if (!file || !userId) return

    setIsBulkImporting(true)

    try {
      const XLSX = await import("xlsx")
      const buffer = await file.arrayBuffer()
      const workbook = XLSX.read(buffer, { type: "array" })
      const firstSheetName = workbook.SheetNames[0]

      if (!firstSheetName) {
        toast.error("File kosong. Pastikan ada minimal 1 sheet.")
        return
      }

      const firstSheet = workbook.Sheets[firstSheetName]
      const rows = XLSX.utils.sheet_to_json<Record<string, unknown>>(firstSheet, {
        defval: "",
      })

      const { validRows, skippedRows } = parseBulkGuestRows(rows)

      if (validRows.length === 0) {
        toast.error("Tidak ada data valid untuk diimport.")
        if (skippedRows.length > 0) {
          toast.info(skippedRows[0])
        }
        return
      }

      await createGuestsBulk(supabase, userId, validRows)
      toast.success(`${validRows.length} tamu berhasil diimport.`)

      if (skippedRows.length > 0) {
        toast.warning(`${skippedRows.length} baris dilewati karena data tidak valid.`)
      }

      setCurrentPage(1)
      await loadGuestsPage(userId, 1)
    } catch (error) {
      const message = error instanceof Error ? error.message : "Import Excel gagal diproses."
      toast.error(message)
    } finally {
      setIsBulkImporting(false)
    }
  }

  const hasSearch = Boolean(searchQuery)

  return (
    <AppShell size="xl">
      <div className="mx-auto w-full max-w-6xl space-y-4">
        <MobileHeader
          title="Kelola Tamu"
          subtitle="Tambah, ubah, dan rapikan data tamu sebelum kirim undangan."
          navItems={protectedNavItems}
          action={<SignOutButton />}
        />

        <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
          <div className="flex-1">
            <SearchInput
              value={searchInput}
              onChange={(value) => {
                setSearchInput(value)
                setCurrentPage(1)
              }}
              placeholder="Cari nama, guest dari, nomor, atau query param..."
            />
          </div>
          <div className="grid grid-cols-2 gap-2 sm:flex sm:w-auto">
            <Button
              variant="outline"
              className="h-11 rounded-xl bg-white"
              onClick={triggerBulkImport}
              disabled={isLoading || Boolean(errorMessage) || isBulkImporting || isSubmitting}
            >
              {isBulkImporting ? (
                <Loader2Icon className="size-4 animate-spin" />
              ) : (
                <FileSpreadsheetIcon className="size-4" />
              )}
              Import Excel
            </Button>
            <Button
              className="h-11 rounded-xl bg-[#2f6f44] hover:bg-[#2a663e]"
              onClick={openAddDialog}
              disabled={isLoading || Boolean(errorMessage)}
            >
              <PlusIcon className="size-4" />
              Tambah Tamu
            </Button>
          </div>
        </div>

        <input
          ref={importInputRef}
          type="file"
          accept=".xlsx,.xls,.csv"
          className="hidden"
          onChange={(event) => {
            void handleBulkFileChange(event)
          }}
        />

        <p className="text-xs text-muted-foreground">
          Import Excel: wajib punya kolom nama dan guest dari siapa. Kolom nomor/shift opsional (default shift 1).
        </p>

        {isLoading ? (
          <Card className="rounded-2xl border border-border/80 bg-white py-0 shadow-none">
            <CardContent className="flex items-center gap-2 px-4 py-5 text-sm text-muted-foreground">
              <Loader2Icon className="size-4 animate-spin text-[#2f6f44]" />
              Memuat data tamu...
            </CardContent>
          </Card>
        ) : errorMessage ? (
          <EmptyState
            icon={InboxIcon}
            title="Data tamu belum bisa dimuat"
            description={errorMessage}
            actionLabel="Coba Lagi"
            onAction={() => {
              void initializePage()
            }}
          />
        ) : guests.length === 0 ? (
          <EmptyState
            icon={UsersRoundIcon}
            title={hasSearch ? "Tamu tidak ditemukan" : "Belum ada data tamu"}
            description={
              hasSearch
                ? "Coba ubah kata kunci pencarian."
                : "Mulai dengan menambahkan tamu pertama."
            }
            actionLabel={hasSearch ? "Reset Pencarian" : "Tambah Tamu"}
            onAction={
              hasSearch
                ? () => {
                    setSearchInput("")
                    setSearchQuery("")
                    setCurrentPage(1)
                  }
                : openAddDialog
            }
          />
        ) : (
          <>
            <div className="space-y-3 md:hidden">
              {guests.map((guest) => (
                <Card key={guest.id} className="rounded-2xl border border-border/80 bg-white py-0 shadow-none">
                  <CardHeader className="space-y-2 border-b border-border/70 px-4 py-4">
                    <div className="flex items-start justify-between gap-2">
                      <CardTitle className="text-base">{guest.name}</CardTitle>
                      <StatusBadge status={guest.status} />
                    </div>
                    <div className="space-y-0.5 text-sm text-muted-foreground">
                      <p>{guest.phone ?? "-"}</p>
                      <p className="text-xs">Guest dari: {guest.guestFrom}</p>
                      <p className="text-xs">{getGuestShiftLabel(guest.shift)}</p>
                      <p className="text-xs">Query: {guest.queryParam}</p>
                      <p className="text-xs">Terkirim: {formatSentAt(guest.sentAt)}</p>
                    </div>
                  </CardHeader>
                  <CardContent className="grid grid-cols-2 gap-2 px-4 py-3">
                    <Button
                      variant="outline"
                      className="h-10 rounded-xl bg-white"
                      onClick={() => openEditDialog(guest)}
                      disabled={isSubmitting || deletingGuestId === guest.id}
                    >
                      <Edit3Icon className="size-4" />
                      Ubah
                    </Button>
                    <Button
                      variant="destructive"
                      className="h-10 rounded-xl"
                      onClick={() => {
                        void handleDelete(guest)
                      }}
                      disabled={isSubmitting || deletingGuestId === guest.id}
                    >
                      <Trash2Icon className="size-4" />
                      {deletingGuestId === guest.id ? "Menghapus..." : "Hapus"}
                    </Button>
                  </CardContent>
                </Card>
              ))}
            </div>

            <div className="hidden rounded-2xl border border-border/80 bg-white md:block">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Nama</TableHead>
                    <TableHead>Nomor</TableHead>
                    <TableHead>Guest Dari</TableHead>
                    <TableHead>Shift</TableHead>
                    <TableHead>Query</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Waktu Terkirim</TableHead>
                    <TableHead className="text-right">Aksi</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {guests.map((guest) => (
                    <TableRow key={guest.id}>
                      <TableCell className="font-medium">{guest.name}</TableCell>
                      <TableCell>{guest.phone ?? "-"}</TableCell>
                      <TableCell>{guest.guestFrom}</TableCell>
                      <TableCell>{getGuestShiftLabel(guest.shift)}</TableCell>
                      <TableCell>{guest.queryParam}</TableCell>
                      <TableCell>
                        <StatusBadge status={guest.status} />
                      </TableCell>
                      <TableCell>{formatSentAt(guest.sentAt)}</TableCell>
                      <TableCell>
                        <div className="flex justify-end gap-2">
                          <Button
                            variant="outline"
                            size="sm"
                            className="h-8 rounded-lg bg-white"
                            onClick={() => openEditDialog(guest)}
                            disabled={isSubmitting || deletingGuestId === guest.id}
                          >
                            Ubah
                          </Button>
                          <Button
                            variant="destructive"
                            size="sm"
                            className="h-8 rounded-lg"
                            onClick={() => {
                              void handleDelete(guest)
                            }}
                            disabled={isSubmitting || deletingGuestId === guest.id}
                          >
                            {deletingGuestId === guest.id ? "Menghapus..." : "Hapus"}
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>

            <PaginationControls
              page={currentPage}
              pageSize={PAGE_SIZE}
              totalCount={totalGuests}
              isLoading={isLoading}
              onPageChange={setCurrentPage}
            />
          </>
        )}

        <Dialog
          open={dialogOpen}
          onOpenChange={(open) => {
            if (!open) closeDialog()
            setDialogOpen(open)
          }}
        >
          <DialogContent className="rounded-2xl p-0 sm:max-w-md">
            <div className="space-y-4 p-4">
              <DialogHeader>
                <DialogTitle>{editingGuest ? "Ubah Tamu" : "Tambah Tamu"}</DialogTitle>
                <DialogDescription>
                  Isi data tamu. Query param `to` dibuat otomatis dari nama.
                </DialogDescription>
              </DialogHeader>
              <GuestForm
                key={editingGuest ? editingGuest.id : "new-guest"}
                mode={editingGuest ? "edit" : "add"}
                initialValues={editingGuest ? toFormValues(editingGuest) : undefined}
                onSubmit={(values) => {
                  void handleSubmit(values)
                }}
                onCancel={closeDialog}
                isSubmitting={isSubmitting}
              />
            </div>
          </DialogContent>
        </Dialog>
      </div>
    </AppShell>
  )
}
