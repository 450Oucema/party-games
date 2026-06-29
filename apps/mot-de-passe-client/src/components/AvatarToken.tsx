import { getAvatarSrc } from '../avatars'

type Props = {
  avatar: number
  className?: string
  imageClassName?: string
}

export default function AvatarToken({ avatar, className = '', imageClassName = '' }: Props) {
  return (
    <span className={`avatar-token overflow-hidden bg-white ${className}`}>
      <img
        src={getAvatarSrc(avatar)}
        alt=""
        className={`h-full w-full object-cover object-top ${imageClassName}`}
        draggable={false}
      />
    </span>
  )
}
