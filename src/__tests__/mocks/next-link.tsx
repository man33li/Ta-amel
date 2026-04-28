import React from 'react'

// Stub for next/link — renders a plain <a> so component tests don't need the Next.js runtime.
const Link = ({
  href,
  children,
  className,
}: {
  href: string
  children: React.ReactNode
  className?: string
}) => (
  <a href={href} className={className}>
    {children}
  </a>
)

export default Link
