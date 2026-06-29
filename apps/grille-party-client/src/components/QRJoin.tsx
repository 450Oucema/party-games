import { QRCodeSVG } from 'qrcode.react'
import { useState } from 'react'
import { sound } from '../audio/sound'

type Props = {
  roomCode: string
}

type ShareNavigator = Navigator & {
  canShare?: (data?: ShareData) => boolean
}

function getJoinUrl(roomCode: string): string {
  const { protocol, hostname, port } = window.location
  const host = port ? `${hostname}:${port}` : hostname
  return `${protocol}//${host}${import.meta.env.BASE_URL}join/${roomCode}`
}

export default function QRJoin({ roomCode }: Props) {
  const url = getJoinUrl(roomCode)
  const [copied, setCopied] = useState(false)
  const canNativeShare = typeof navigator !== 'undefined' && typeof navigator.share === 'function'

  const copyJoinUrl = async () => {
    sound.playUiClick()
    try {
      if (navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(url)
      } else {
        const textarea = document.createElement('textarea')
        textarea.value = url
        textarea.setAttribute('readonly', '')
        textarea.style.position = 'fixed'
        textarea.style.opacity = '0'
        document.body.appendChild(textarea)
        textarea.select()
        document.execCommand('copy')
        document.body.removeChild(textarea)
      }
      setCopied(true)
      window.setTimeout(() => setCopied(false), 1600)
    } catch (err) {
      console.error('Impossible de copier le lien', err)
    }
  }

  const shareJoinUrl = async () => {
    sound.playUiClick()
    const shareData: ShareData = {
      title: 'Grille Party',
      text: `Rejoins ma partie Grille Party : ${roomCode}`,
      url,
    }
    const shareNavigator = navigator as ShareNavigator
    try {
      if (shareNavigator.canShare && !shareNavigator.canShare(shareData)) {
        await copyJoinUrl()
        return
      }
      await navigator.share(shareData)
    } catch (err) {
      if (err instanceof DOMException && err.name === 'AbortError') return
      console.error('Impossible de partager le lien', err)
    }
  }

  return (
    <div className="cartoon-card flex flex-col items-center gap-4 p-5">
      <div className="rounded-[22px] border-[3px] border-game-purple bg-white p-4 shadow-cartoon-sm">
        <QRCodeSVG value={url} size={190} fgColor="#28104B" />
      </div>
      <div className="text-center">
        <div className="mb-1 text-sm font-black uppercase text-game-purple">Code de partie</div>
        <div className="cartoon-title-sm font-display text-6xl text-game-yellow">
          {roomCode}
        </div>
      </div>
      <div className="grid w-full max-w-[260px] grid-cols-1 gap-2 sm:grid-cols-2">
        <button
          type="button"
          onClick={copyJoinUrl}
          className="btn-secondary px-3 py-2 text-sm"
        >
          {copied ? 'Copié !' : 'Copier'}
        </button>
        {canNativeShare && (
          <button
            type="button"
            onClick={shareJoinUrl}
            className="btn-primary px-3 py-2 text-sm"
          >
            Partager
          </button>
        )}
      </div>
    </div>
  )
}
