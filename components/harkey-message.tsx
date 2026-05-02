'use client'

import { useState, useEffect } from 'react'

let katexReady = false
function ensureKaTeX(cb: () => void) {
  if (katexReady) { cb(); return }
  if (typeof window === 'undefined') return
  const win = window as any
  if (win.katex) { katexReady = true; cb(); return }
  if (!document.getElementById('katex-css')) {
    const link = document.createElement('link')
    link.id = 'katex-css'; link.rel = 'stylesheet'
    link.href = 'https://cdn.jsdelivr.net/npm/katex@0.16.9/dist/katex.min.css'
    document.head.appendChild(link)
  }
  if (document.getElementById('katex-js')) return
  const s = document.createElement('script')
  s.id = 'katex-js'
  s.src = 'https://cdn.jsdelivr.net/npm/katex@0.16.9/dist/katex.min.js'
  s.onload = () => { katexReady = true; cb() }
  document.head.appendChild(s)
}

function renderKaTeX(latex: string, display: boolean): string {
  const win = window as any
  if (!win.katex) return display ? `$$${latex}$$` : `$${latex}$`
  try { return win.katex.renderToString(latex.trim(), { displayMode: display, throwOnError: false }) }
  catch { return display ? `$$${latex}$$` : `$${latex}$` }
}

function renderTable(block: string): string {
  const lines = block.trim().split('\n').filter(l => l.trim() && l.includes('|'))
  if (lines.length < 2) return block
  const parseRow = (line: string) => line.split('|').map(c => c.trim()).filter((c, i, arr) => i > 0 && i < arr.length - 1 || (i === 0 && c) || (i === arr.length - 1 && c))
  const headerCells = parseRow(lines[0]).map(c => `<th style="padding:8px 14px;text-align:left;font-weight:600;border-bottom:2px solid #E8E3DA;font-size:13px;background:#F5F3EE">${c}</th>`).join('')
  const bodyRows = lines.slice(2).filter(l => !/^[\s|:-]+$/.test(l)).map(line => {
    const cells = parseRow(line).map(c => `<td style="padding:8px 14px;border-bottom:1px solid #F0EDE6;font-size:14px;vertical-align:top">${c}</td>`).join('')
    return `<tr>${cells}</tr>`
  }).join('')
  return `<div style="overflow-x:auto;margin:14px 0"><table style="border-collapse:collapse;width:100%;border:1px solid #E8E3DA;border-radius:8px;overflow:hidden"><thead><tr>${headerCells}</tr></thead><tbody>${bodyRows}</tbody></table></div>`
}

function processMarkdown(text: string): string {
  // Step 1: Extract math, tables, code blocks — replace with placeholders
  const placeholders: string[] = []
  function placeholder(html: string): string {
    const key = `\x00${placeholders.length}\x00`
    placeholders.push(html)
    return key
  }

  // Display math $$...$$
  text = text.replace(/\$\$([\s\S]+?)\$\$/g, (_, latex) => placeholder(renderKaTeX(latex, true)))
  // Inline math $...$
  text = text.replace(/\$([^$\n]+?)\$/g, (_, latex) => placeholder(renderKaTeX(latex, false)))
  // Code blocks
  text = text.replace(/```[\s\S]*?```/g, m => {
    const code = m.slice(3, -3).replace(/^[a-z]+\n/, '').trim()
    return placeholder(`<pre style="background:#F0EDE6;padding:12px 16px;border-radius:6px;font-family:'IBM Plex Mono',monospace;font-size:13px;overflow-x:auto;margin:12px 0"><code>${code.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;')}</code></pre>`)
  })
  // Tables — extract whole table blocks before escaping
  text = text.replace(/(\|.+\|[ \t]*\n)+/g, m => placeholder(renderTable(m)))

  // Step 2: HTML escape the remaining text
  text = text.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;')

  // Step 3: Apply markdown to escaped text
  text = text
    // Headers
    .replace(/^#### (.+)$/gm, '<h4 style="font-family:\'Instrument Serif\',serif;font-size:1rem;font-weight:600;margin:16px 0 4px;color:#1A1A1A">$1</h4>')
    .replace(/^### (.+)$/gm, '<h3 style="font-family:\'Instrument Serif\',serif;font-size:1.15rem;font-weight:600;margin:18px 0 6px;color:#1A1A1A">$1</h3>')
    .replace(/^## (.+)$/gm, '<h2 style="font-family:\'Instrument Serif\',serif;font-size:1.4rem;font-weight:400;margin:22px 0 8px;color:#1A1A1A">$1</h2>')
    .replace(/^# (.+)$/gm, '<h1 style="font-family:\'Instrument Serif\',serif;font-size:1.7rem;font-weight:400;margin:24px 0 10px;color:#1A1A1A">$1</h1>')
    // Bold + italic
    .replace(/\*\*\*(.+?)\*\*\*/g, '<strong><em>$1</em></strong>')
    .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
    .replace(/\*([^*\n]+?)\*/g, '<em>$1</em>')
    // Links [text](url)
    .replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2" style="color:#2D4A3D;text-decoration:underline" target="_blank" rel="noopener">$1</a>')
    // Inline code
    .replace(/`([^`]+)`/g, '<code style="font-family:\'IBM Plex Mono\',monospace;font-size:.875em;background:#F0EDE6;padding:2px 5px;border-radius:3px">$1</code>')
    // Blockquote
    .replace(/^&gt; (.+)$/gm, '<blockquote style="border-left:3px solid #B594DC;padding:4px 12px;margin:8px 0;color:#6B6B6B;font-style:italic">$1</blockquote>')
    // HR
    .replace(/^---$/gm, '<hr style="border:none;border-top:1px solid #E8E3DA;margin:18px 0">')
    // Bullet lists — collect and wrap
    .replace(/(^[-•] .+$(\n^[-•] .+$)*)/gm, m => {
      const items = m.split('\n').map(l => `<li style="margin:4px 0">${l.replace(/^[-•] /, '')}</li>`).join('')
      return `<ul style="padding-left:20px;margin:8px 0;list-style:disc">${items}</ul>`
    })
    // Numbered lists
    .replace(/(^\d+\. .+$(\n^\d+\. .+$)*)/gm, m => {
      const items = m.split('\n').map(l => `<li style="margin:4px 0">${l.replace(/^\d+\. /, '')}</li>`).join('')
      return `<ol style="padding-left:20px;margin:8px 0">${items}</ol>`
    })
    // Paragraphs
    .replace(/\n\n/g, '</p><p style="margin:10px 0">')
    .replace(/\n/g, '<br>')

  // Step 4: Restore placeholders
  placeholders.forEach((html, i) => { text = text.replace(`\x00${i}\x00`, html) })

  return `<p style="margin:0">${text}</p>`
}

export function HarkeyMessage({ text }: { text: string }) {
  const [html, setHtml] = useState(() => {
    // Render immediately without KaTeX on first paint
    if (typeof window !== 'undefined' && katexReady) return processMarkdown(text)
    // Fallback: just apply markdown without KaTeX
    return processMarkdown(text)
  })

  useEffect(() => {
    if (katexReady) { setHtml(processMarkdown(text)); return }
    ensureKaTeX(() => setHtml(processMarkdown(text)))
  }, [text])

  return (
    <div
      style={{ lineHeight: 1.75, wordBreak: 'break-word', fontSize: 15, color: '#1A1A1A' }}
      dangerouslySetInnerHTML={{ __html: html }}
    />
  )
}
