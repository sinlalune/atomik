import { createElement, useEffect, useRef } from 'react'
import type React from 'react'
import { themeOf } from '../../workspace/model'
import { useWorkspace } from '../../workspace/store'
import { hydrateRichMarkdown } from './hydration'

export function RichMarkdownBody({
  as = 'div',
  html,
  className,
  onClick
}: {
  as?: 'article' | 'div'
  html: string
  className?: string
  onClick?: React.MouseEventHandler<HTMLElement>
}): React.JSX.Element {
  const rootRef = useRef<HTMLElement | null>(null)
  const theme = useWorkspace((store) => themeOf(store.state))

  useEffect(() => {
    const root = rootRef.current
    if (!root) return
    const hydration = hydrateRichMarkdown(root)
    return () => hydration.dispose()
  }, [html, theme])

  return createElement(as, {
    ref: rootRef,
    className,
    onClick,
    dangerouslySetInnerHTML: { __html: html }
  })
}
