export const AVATAR_OPTIONS = [
  { id: 'octopus', label: 'Octopus', src: 'avatars/octopus.webp' },
  { id: 'stars', label: 'Stars', src: 'avatars/stars.webp' },
  { id: 'wave', label: 'Wave', src: 'avatars/wave.webp' },
  { id: 'gaming', label: 'Gaming', src: 'avatars/gaming.webp' },
  { id: 'licorne', label: 'Licorne', src: 'avatars/licorne.webp' },
  { id: 'grenouille', label: 'Grenouille', src: 'avatars/grenouille.webp' },
  { id: 'arc-en-ciel', label: 'Arc-en-ciel', src: 'avatars/arc-en-ciel.webp' },
  { id: 'circus', label: 'Circus', src: 'avatars/circus.webp' },
]

export function getAvatarSrc(avatar: number): string {
  const option = AVATAR_OPTIONS[avatar % AVATAR_OPTIONS.length] ?? AVATAR_OPTIONS[0]
  return `${import.meta.env.BASE_URL}${option.src}`
}
