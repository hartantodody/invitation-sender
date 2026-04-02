"use client"

import { type FormEvent, useState } from "react"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Textarea } from "@/components/ui/textarea"
import { guestShiftOptions } from "@/lib/guest-shift"
import { buildGuestQueryParam } from "@/lib/invitation-utils"
import type { GuestFormInput } from "@/lib/types"

type GuestFormMode = "add" | "edit"

type GuestFormProps = {
  mode: GuestFormMode
  initialValues?: GuestFormInput
  onSubmit: (values: GuestFormInput) => void
  onCancel: () => void
  isSubmitting?: boolean
}

const defaultValues: GuestFormInput = {
  name: "",
  phone: "",
  shift: "1",
  notes: "",
}

type FormErrors = Partial<Record<keyof GuestFormInput, string>>

function validate(values: GuestFormInput): FormErrors {
  const errors: FormErrors = {}

  if (!values.name.trim()) errors.name = "Nama wajib diisi."
  if (!values.phone.trim()) errors.phone = "Nomor wajib diisi."
  if (!values.shift) errors.shift = "Shift wajib dipilih."

  return errors
}

export function GuestForm({
  mode,
  initialValues,
  onSubmit,
  onCancel,
  isSubmitting = false,
}: GuestFormProps) {
  const [values, setValues] = useState<GuestFormInput>(() => initialValues ?? defaultValues)
  const [errors, setErrors] = useState<FormErrors>({})
  const queryParamPreview = buildGuestQueryParam(values.name)

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    const nextErrors = validate(values)

    if (Object.keys(nextErrors).length > 0) {
      setErrors(nextErrors)
      return
    }

    onSubmit(values)
  }

  return (
    <form className="space-y-4" onSubmit={handleSubmit}>
      <div className="space-y-2">
        <Label htmlFor="guest-name">Nama</Label>
        <Input
          id="guest-name"
          value={values.name}
          onChange={(event) => setValues((prev) => ({ ...prev, name: event.target.value }))}
          className="h-11 rounded-xl bg-white"
          aria-invalid={errors.name ? true : undefined}
        />
        {errors.name ? <p className="text-xs text-destructive">{errors.name}</p> : null}
      </div>

      <div className="space-y-2">
        <Label htmlFor="guest-phone">Nomor WhatsApp</Label>
        <Input
          id="guest-phone"
          value={values.phone}
          onChange={(event) => setValues((prev) => ({ ...prev, phone: event.target.value }))}
          className="h-11 rounded-xl bg-white"
          placeholder="0812xxxx"
          aria-invalid={errors.phone ? true : undefined}
        />
        {errors.phone ? <p className="text-xs text-destructive">{errors.phone}</p> : null}
      </div>

      <div className="space-y-2">
        <Label htmlFor="guest-shift">Shift</Label>
        <Select
          value={values.shift}
          onValueChange={(value) => setValues((prev) => ({ ...prev, shift: value as GuestFormInput["shift"] }))}
        >
          <SelectTrigger id="guest-shift" className="h-11 w-full rounded-xl bg-white">
            <SelectValue placeholder="Pilih shift" />
          </SelectTrigger>
          <SelectContent>
            {guestShiftOptions.map((option) => (
              <SelectItem key={option.value} value={option.value}>
                {option.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        {errors.shift ? <p className="text-xs text-destructive">{errors.shift}</p> : null}
      </div>

      <div className="rounded-xl border border-border/70 bg-[#f7faf7] px-3 py-2">
        <p className="text-xs text-muted-foreground">Query param `to` otomatis dari nama:</p>
        <p className="text-sm font-medium text-foreground">{queryParamPreview || "(Isi nama dulu)"}</p>
      </div>

      <div className="space-y-2">
        <Label htmlFor="guest-notes">Catatan</Label>
        <Textarea
          id="guest-notes"
          value={values.notes}
          onChange={(event) => setValues((prev) => ({ ...prev, notes: event.target.value }))}
          className="min-h-20 rounded-xl bg-white"
          placeholder="Catatan tambahan (opsional)"
        />
      </div>

      <div className="grid grid-cols-2 gap-2 pt-1">
        <Button
          type="button"
          variant="outline"
          className="h-11 rounded-xl bg-white"
          onClick={onCancel}
          disabled={isSubmitting}
        >
          Batal
        </Button>
        <Button
          type="submit"
          className="h-11 rounded-xl bg-[#2f6f44] hover:bg-[#2a663e]"
          disabled={isSubmitting}
        >
          {isSubmitting ? "Menyimpan..." : mode === "add" ? "Tambah Tamu" : "Simpan Perubahan"}
        </Button>
      </div>
    </form>
  )
}
