import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';

function isImageAvatar(avatar: string | undefined | null) {
  if (!avatar) return false;
  return avatar.startsWith('data:image/') || avatar.startsWith('http://') || avatar.startsWith('https://') || avatar.startsWith('blob:');
}

function getAvatarFallback(avatar: string | undefined | null, name?: string) {
  if (avatar && !isImageAvatar(avatar)) return avatar;
  if (name?.trim()) return name.trim().charAt(0).toUpperCase();
  return '?';
}

type UserAvatarProps = {
  avatar?: string | null;
  name?: string;
  className?: string;
  fallbackClassName?: string;
  imageClassName?: string;
  online?: boolean;
  statusClassName?: string;
};

export default function UserAvatar({
  avatar,
  name,
  className = '',
  fallbackClassName = '',
  imageClassName = 'object-cover',
  online,
  statusClassName = '',
}: UserAvatarProps) {
  return (
    <div className="relative flex-shrink-0">
      <Avatar className={className}>
        {isImageAvatar(avatar) && <AvatarImage src={avatar || ''} alt={name || 'Avatar'} className={imageClassName} />}
        <AvatarFallback className={fallbackClassName}>{getAvatarFallback(avatar, name)}</AvatarFallback>
      </Avatar>
      {online !== undefined && (
        <span className={statusClassName || `absolute bottom-0 right-0 h-3 w-3 rounded-full border-2 border-card ${online ? 'bg-[#25D366]' : 'bg-muted-foreground'}`} />
      )}
    </div>
  );
}
