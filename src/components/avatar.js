export default function Avatar({ url, name, size = 48 }) {
  const style = { width: size, height: size }

  if (url) {
    return (
      <img
        src={url}
        alt={name || 'Photo'}
        style={style}
        className="rounded-full object-cover shrink-0 bg-gray-100"
      />
    )
  }

  return (
    <div
      style={{ ...style, fontSize: Math.round(size * 0.4) }}
      className="rounded-full bg-green-100 text-green-700 font-bold flex items-center justify-center shrink-0"
    >
      {name?.charAt(0).toUpperCase() || '?'}
    </div>
  )
}
I 
