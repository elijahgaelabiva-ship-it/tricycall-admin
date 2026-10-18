export default function Stars({ value, size = 16 }) {
  const rounded = Math.round(Number(value) || 0)
  return (
    <span style={{ fontSize: size, letterSpacing: 1 }} aria-label={`${rounded} out of 5 stars`}>
      <span className="text-yellow-400">{'★'.repeat(rounded)}</span>
      <span className="text-gray-300">{'★'.repeat(5 - rounded)}</span>
    </span>
  )
}
