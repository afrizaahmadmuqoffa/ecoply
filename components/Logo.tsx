export default function Logo({
  height = 36,
  className = '',
  src = '/logo.png',
}: {
  height?: number
  className?: string
  src?: string
}) {
  return (
    <img
      src={src}
      alt="ECOPLY"
      className={`h-auto w-auto ${className}`}
      style={{ height, width: 'auto', maxWidth: '100%' }}
    />
  )
}