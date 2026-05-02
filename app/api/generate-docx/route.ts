import { NextRequest, NextResponse } from 'next/server'

export async function POST(req: NextRequest) {
  try {
    const { problemSet, settings } = await req.json()

    // Dynamically import docx (avoids edge runtime issues)
    const {
      Document, Packer, Paragraph, TextRun, HeadingLevel,
      AlignmentType, BorderStyle,
    } = await import('docx')

    const accent = settings?.accentColor || '#E26B4F'
    const showFooter = settings?.showKelviFooter !== false
    const showNumbers = settings?.showProblemNumbers !== false
    const workSize = settings?.workSpaceSize || 'medium'

    // Convert hex to docx RGB object
    function hexToDocxColor(hex: string) {
      const h = hex.replace('#', '')
      return h.toUpperCase()
    }

    const accentHex = hexToDocxColor(accent)
    const FOREST    = '2D4A3D'
    const MUTED     = '6B6B6B'
    const FAINT     = '9A9488'
    const RULE      = 'E8E3DA'

    // Work space lines
    const workLines = workSize === 'none' ? 0
      : workSize === 'small'  ? 3
      : workSize === 'large'  ? 8
      : 5  // medium

    const workSpaceParagraphs = Array.from({ length: workLines }, () =>
      new Paragraph({
        children: [new TextRun({ text: '', size: 24 })],
        border: { bottom: { style: BorderStyle.SINGLE, size: 2, color: RULE } },
        spacing: { before: 160, after: 80 },
      })
    )

    // Build problem paragraphs
    const problemChildren: any[] = []

    for (const p of problemSet.problems) {
      const idx = p.number ?? problemSet.problems.indexOf(p) + 1

      if (showNumbers) {
        problemChildren.push(
          new Paragraph({
            children: [new TextRun({
              text: `PROBLEM ${idx}${p.title ? ` · ${p.title.toUpperCase()}` : ''}`,
              font: 'Courier New',
              size: 16,
              color: accentHex,
              bold: true,
            })],
            spacing: { before: 360, after: 80 },
          })
        )
      } else if (p.title) {
        problemChildren.push(
          new Paragraph({
            children: [new TextRun({
              text: p.title,
              font: 'Georgia',
              size: 24,
              bold: true,
              color: FOREST,
            })],
            spacing: { before: 360, after: 80 },
          })
        )
      }

      // Problem body
      problemChildren.push(
        new Paragraph({
          children: [new TextRun({ text: p.body || '', font: 'Arial', size: 22, color: '1A1A1A' })],
          spacing: { after: 120 },
        })
      )

      // Subparts
      for (const [j, sub] of (p.subparts || []).entries()) {
        problemChildren.push(
          new Paragraph({
            children: [new TextRun({ text: `${String.fromCharCode(97 + j)})  ${sub}`, font: 'Arial', size: 22, color: '1A1A1A' })],
            indent: { left: 440 },
            spacing: { after: 80 },
          })
        )
      }

      // Work space
      if (workSize !== 'none') {
        problemChildren.push(...workSpaceParagraphs.map(p => p))
      }
    }

    const doc = new Document({
      sections: [{
        properties: {
          page: {
            size: { width: 12240, height: 15840 },
            margin: { top: 1440, right: 1440, bottom: 1440, left: 1440 },
          },
        },
        children: [
          // Header rule (simulated with thick border paragraph)
          new Paragraph({
            children: [
              new TextRun({ text: problemSet.title, font: 'Georgia', size: 48, color: FOREST, bold: false }),
            ],
            spacing: { before: 0, after: 80 },
            border: { bottom: { style: BorderStyle.THICK, size: 24, color: accentHex } },
          }),

          // Meta line
          new Paragraph({
            children: [
              new TextRun({
                text: [
                  problemSet.duration_minutes ? `${problemSet.duration_minutes} minutes` : '',
                  `${problemSet.problems.length} problem${problemSet.problems.length !== 1 ? 's' : ''}`,
                ].filter(Boolean).join('  ·  '),
                font: 'Courier New',
                size: 16,
                color: MUTED,
              }),
            ],
            spacing: { before: 80, after: 360 },
          }),

          // Problems
          ...problemChildren,

          // Footer
          ...(showFooter ? [
            new Paragraph({
              children: [new TextRun({ text: `kelvi.io  ·  ${new Date().toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}`, font: 'Courier New', size: 14, color: FAINT })],
              alignment: AlignmentType.CENTER,
              border: { top: { style: BorderStyle.SINGLE, size: 2, color: RULE } },
              spacing: { before: 480 },
            }),
          ] : []),
        ],
      }],
    })

    const buffer = await Packer.toBuffer(doc)

    return new NextResponse(buffer as unknown as BodyInit, {
      headers: {
        'Content-Type': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        'Content-Disposition': `attachment; filename="${encodeURIComponent(problemSet.title)}.docx"`,
      },
    })
  } catch (e: any) {
    console.error('[generate-docx]', e.message)
    return NextResponse.json({ error: e.message }, { status: 500 })
  }
}
