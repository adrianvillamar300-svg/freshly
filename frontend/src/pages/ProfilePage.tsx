import { useState, useRef, FormEvent } from 'react'
import { Camera, User, Mail, Calendar, Save, LogOut } from 'lucide-react'
import { format } from 'date-fns'
import { es } from 'date-fns/locale'
import { Card } from '../components/ui/Card'
import { Input } from '../components/ui/Input'
import { Button } from '../components/ui/Button'
import { useAuth } from '../contexts/AuthContext'
import { useToast } from '../components/ui/Toast'
import { usersApi } from '../lib/api'

export function ProfilePage() {
  const { user, logout, refreshUser } = useAuth()
  const { toast } = useToast()
  const fileRef = useRef<HTMLInputElement>(null)

  const [name, setName] = useState(user?.name ?? '')
  const [savingName, setSavingName] = useState(false)
  const [uploadingPhoto, setUploadingPhoto] = useState(false)
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null)

  const handleNameSave = async (e: FormEvent) => {
    e.preventDefault()
    if (!name.trim()) return
    setSavingName(true)
    try {
      await usersApi.updateMe({ name })
      await refreshUser()
      toast('Nombre actualizado')
    } catch {
      toast('Error al actualizar el nombre', 'error')
    } finally {
      setSavingName(false)
    }
  }

  const handlePhotoChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    // Preview
    const reader = new FileReader()
    reader.onload = ev => setAvatarPreview(ev.target?.result as string)
    reader.readAsDataURL(file)

    setUploadingPhoto(true)
    try {
      await usersApi.uploadPhoto(file)
      await refreshUser()
      toast('Foto de perfil actualizada')
    } catch {
      toast('Error al subir la foto', 'error')
      setAvatarPreview(null)
    } finally {
      setUploadingPhoto(false)
    }
  }

  const avatarSrc = avatarPreview ?? user?.profile_image_url ?? null
  const initials = user?.name?.split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase() ?? 'U'

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px', animation: 'fadeIn 0.4s ease', maxWidth: '600px' }}>
      <div>
        <h2 style={{ fontSize: '20px', fontWeight: 700, letterSpacing: '-0.03em', marginBottom: '2px' }}>
          Mi perfil
        </h2>
        <p style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>
          Administra tu información personal
        </p>
      </div>

      {/* Avatar section */}
      <Card>
        <div style={{ display: 'flex', alignItems: 'center', gap: '20px', flexWrap: 'wrap' }}>
          {/* Avatar */}
          <div style={{ position: 'relative', flexShrink: 0 }}>
            <div style={{
              width: '80px', height: '80px', borderRadius: '50%',
              background: 'var(--primary-dim)',
              border: '2px solid var(--border)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              overflow: 'hidden',
              position: 'relative',
            }}>
              {avatarSrc ? (
                <img src={avatarSrc} alt="Foto de perfil" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
              ) : (
                <span style={{ fontSize: '28px', fontWeight: 700, color: 'var(--primary)', fontFamily: 'Space Grotesk' }}>
                  {initials}
                </span>
              )}
              {uploadingPhoto && (
                <div style={{
                  position: 'absolute', inset: 0,
                  background: 'rgba(11,15,14,0.7)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                }}>
                  <div style={{ width: '20px', height: '20px', border: '2px solid var(--primary)', borderTopColor: 'transparent', borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} />
                </div>
              )}
            </div>

            {/* Upload button */}
            <button
              onClick={() => fileRef.current?.click()}
              disabled={uploadingPhoto}
              style={{
                position: 'absolute', bottom: '-2px', right: '-2px',
                width: '28px', height: '28px', borderRadius: '50%',
                background: 'var(--primary)', border: '2px solid var(--bg)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                cursor: 'pointer', color: '#0B0F0E',
                transition: 'all var(--transition)',
              }}
              onMouseEnter={e => e.currentTarget.style.background = 'var(--primary-hover)'}
              onMouseLeave={e => e.currentTarget.style.background = 'var(--primary)'}
            >
              <Camera size={13} />
            </button>
            <input ref={fileRef} type="file" accept="image/*" style={{ display: 'none' }} onChange={handlePhotoChange} />
          </div>

          <div style={{ flex: 1, minWidth: 0 }}>
            <h3 style={{ fontSize: '18px', fontWeight: 600, marginBottom: '4px', letterSpacing: '-0.02em' }}>
              {user?.name}
            </h3>
            <p style={{ fontSize: '13px', color: 'var(--text-secondary)', display: 'flex', alignItems: 'center', gap: '6px' }}>
              <Mail size={13} /> {user?.email}
            </p>
            {user?.created_at && (
              <p style={{ fontSize: '12px', color: 'var(--text-muted)', marginTop: '6px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                <Calendar size={12} />
                Miembro desde {format(new Date(user.created_at), "MMMM yyyy", { locale: es })}
              </p>
            )}
          </div>
        </div>
      </Card>

      {/* Edit name */}
      <Card>
        <h3 style={{ fontSize: '15px', fontWeight: 600, marginBottom: '16px', letterSpacing: '-0.02em' }}>
          Información personal
        </h3>
        <form onSubmit={handleNameSave} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <Input
            label="Nombre"
            value={name}
            onChange={e => setName(e.target.value)}
            icon={<User size={16} />}
            placeholder="Tu nombre completo"
          />
          <Input
            label="Correo electrónico"
            value={user?.email ?? ''}
            disabled
            icon={<Mail size={16} />}
            hint="El correo no se puede cambiar"
          />
          <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
            <Button type="submit" loading={savingName} icon={<Save size={14} />} size="sm">
              Guardar cambios
            </Button>
          </div>
        </form>
      </Card>

      {/* Danger zone */}
      <Card style={{ borderColor: 'rgba(255,107,107,0.15)' }}>
        <h3 style={{ fontSize: '15px', fontWeight: 600, color: 'var(--danger)', marginBottom: '12px' }}>
          Cerrar sesión
        </h3>
        <p style={{ fontSize: '13px', color: 'var(--text-secondary)', marginBottom: '16px' }}>
          Al cerrar sesión se eliminarán los datos de autenticación de este dispositivo.
        </p>
        <Button variant="danger" icon={<LogOut size={14} />} onClick={logout}>
          Cerrar sesión
        </Button>
      </Card>
    </div>
  )
}
