import { useEffect, useState } from "react"
import { Upload, User } from "lucide-react"
import { useProfile } from "@/hooks/useProfile"
import { uploadAvatar } from "@/lib/storage"
import { updatePassword } from "@/lib/auth"
import { Btn, Input, LoadingState, Toast, useTranslation } from "./shared"

export function ProfileSettingsPanel({ userId }: { userId: string | null }) {
  const { t } = useTranslation()
  const profile = useProfile(userId)
  const [form, setForm] = useState({ firstName: "", lastName: "", phone: "" })
  const [uploading, setUploading] = useState(false)
  const [saving, setSaving] = useState(false)
  const [savingPassword, setSavingPassword] = useState(false)
  const [emailNotifications, setEmailNotifications] = useState(true)
  const [passwordForm, setPasswordForm] = useState({ password: "", confirm: "" })
  const [toast, setToast] = useState<{ msg: string; type: "success" | "error" } | null>(null)

  useEffect(() => {
    setForm({
      firstName: profile.profile?.first_name ?? "",
      lastName: profile.profile?.last_name ?? "",
      phone: profile.profile?.phone ?? "",
    })
  }, [profile.profile?.first_name, profile.profile?.last_name, profile.profile?.phone])

  useEffect(() => {
    setEmailNotifications(profile.profile?.notification_preferences?.email !== false)
  }, [profile.profile?.notification_preferences])

  if (!userId || profile.loading) return <LoadingState label="Loading profile..." />

  const save = async () => {
    if (!form.firstName.trim()) {
      setToast({ msg: "First name is required.", type: "error" })
      return
    }
    setSaving(true)
    const result = await profile.updateProfile({
      first_name: form.firstName.trim(),
      last_name: form.lastName.trim() || null,
      phone: form.phone.trim() || null,
      notification_preferences: { ...(profile.profile?.notification_preferences ?? {}), email: emailNotifications },
    })
    setSaving(false)
    setToast(result.error ? { msg: result.error, type: "error" } : { msg: "Profile updated.", type: "success" })
  }

  const savePassword = async () => {
    if (passwordForm.password.length < 8 || passwordForm.password !== passwordForm.confirm) {
      setToast({ msg: "Passwords must match and contain at least 8 characters.", type: "error" })
      return
    }
    setSavingPassword(true)
    const error = await updatePassword(passwordForm.password)
    setSavingPassword(false)
    if (error) {
      setToast({ msg: error, type: "error" })
      return
    }
    setPasswordForm({ password: "", confirm: "" })
    setToast({ msg: "Password updated successfully.", type: "success" })
  }

  const updateAvatar = async (file?: File) => {
    if (!file) return
    if (!file.type.startsWith("image/") || file.size > 5 * 1024 * 1024) {
      setToast({ msg: "Select an image up to 5 MB.", type: "error" })
      return
    }
    setUploading(true)
    const avatarUrl = await uploadAvatar(userId, file)
    const result = avatarUrl ? await profile.updateProfile({ avatar_url: avatarUrl }) : { error: "Could not upload avatar." }
    setUploading(false)
    setToast(result.error ? { msg: result.error, type: "error" } : { msg: "Profile photo updated.", type: "success" })
  }

  return (
    <div className="max-w-3xl rounded-2xl border border-border bg-card p-6 shadow-sm">
      <h2 className="text-lg font-bold text-foreground">{t("Profile & Settings")}</h2>
      <p className="mt-1 text-sm text-muted-foreground">{t("Manage your personal information and profile photo.")}</p>
      <div className="mt-5 flex flex-wrap items-center gap-4 rounded-xl bg-muted/40 p-4">
        <div className="flex h-20 w-20 items-center justify-center overflow-hidden rounded-full border border-border bg-card">
          {profile.profile?.avatar_url ? <img src={profile.profile.avatar_url} alt="" className="h-full w-full object-cover" /> : <User className="h-8 w-8 text-muted-foreground" />}
        </div>
        <div>
          <p className="text-sm font-semibold text-foreground">{profile.profile?.email}</p>
          <label className="mt-2 inline-flex cursor-pointer items-center gap-2 rounded-xl bg-secondary px-4 py-2 text-sm font-semibold text-secondary-foreground">
            <Upload className="h-4 w-4" /> {uploading ? t("Uploading...") : t("Upload / Replace")}
            <input type="file" accept="image/*" disabled={uploading} className="hidden" onChange={(event) => { void updateAvatar(event.target.files?.[0]); event.currentTarget.value = "" }} />
          </label>
        </div>
      </div>
      <div className="mt-5 grid gap-4 sm:grid-cols-2">
        <Input label="First Name" value={form.firstName} onChange={(firstName) => setForm((current) => ({ ...current, firstName }))} required />
        <Input label="Last Name" value={form.lastName} onChange={(lastName) => setForm((current) => ({ ...current, lastName }))} />
      </div>
      <div className="mt-4">
        <Input label="Phone" value={form.phone} onChange={(phone) => setForm((current) => ({ ...current, phone }))} />
      </div>
      <label className="mt-4 flex items-center gap-3 rounded-xl bg-muted/40 p-3 text-sm font-semibold text-foreground">
        <input type="checkbox" checked={emailNotifications} onChange={(event) => setEmailNotifications(event.target.checked)} />
        {t("Email Notifications")}
      </label>
      <Btn className="mt-5" disabled={saving} onClick={() => void save()}>{saving ? t("Saving...") : t("Save Changes")}</Btn>
      <div className="mt-6 border-t border-border pt-5">
        <h3 className="font-bold text-foreground">{t("Change Password")}</h3>
        <div className="mt-4 grid gap-4 sm:grid-cols-2">
          <Input label="New Password" type="password" value={passwordForm.password} onChange={(password) => setPasswordForm((current) => ({ ...current, password }))} />
          <Input label="Confirm Password" type="password" value={passwordForm.confirm} onChange={(confirm) => setPasswordForm((current) => ({ ...current, confirm }))} />
        </div>
        <Btn className="mt-4" variant="secondary" disabled={savingPassword} onClick={() => void savePassword()}>{savingPassword ? t("Updating Password...") : t("Update Password")}</Btn>
      </div>
      {toast && <Toast message={toast.msg} type={toast.type} onClose={() => setToast(null)} />}
    </div>
  )
}
