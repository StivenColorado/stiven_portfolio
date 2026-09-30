import { Body, Container, Head, Html, Preview, Section, Text, Font } from '@react-email/components'
import type { ReactNode } from 'react'

export const SANS = "Nunito, Arial, Helvetica, sans-serif"
export const MONO = "'SFMono-Regular', Menlo, Consolas, 'Liberation Mono', 'Courier New', monospace"

const darkCss = `
:root { color-scheme: light dark; supported-color-schemes: light dark; }
@media (prefers-color-scheme: dark) {
  html, body, .bg-page { background-color: #111111 !important; }
  .bg-card { background-color: #1c1c1c !important; border-color: #f2f2f2 !important; }
  .bg-bar { background-color: #3a3a3a !important; border-color: #f2f2f2 !important; }
  .tx { color: #f2f2f2 !important; }
  .tx-soft { color: #bdbdbd !important; }
  .dot { border-color: #f2f2f2 !important; background-color: #1c1c1c !important; }
  .btn { background-color: #f2f2f2 !important; color: #000000 !important; border-color: #f2f2f2 !important; border-bottom-color: #8a8a8a !important; border-right-color: #8a8a8a !important; }
  .btn-text { color: #000000 !important; }
  .box { border-color: #f2f2f2 !important; background-color: #262626 !important; }
  .rule { border-color: #555555 !important; }
}
@media only screen and (max-width: 480px) {
  .pad { padding-left: 20px !important; padding-right: 20px !important; }
  .h1 { font-size: 28px !important; line-height: 34px !important; }
}
`

interface LayoutProps {
  preview: string
  windowTitle: string
  children: ReactNode
  footer: ReactNode
}

export function Layout({ preview, windowTitle, children, footer }: LayoutProps) {
  return (
    <Html lang="es">
      <Head>
        <meta name="color-scheme" content="light dark" />
        <meta name="supported-color-schemes" content="light dark" />
        <Font
          fontFamily="Nunito"
          fallbackFontFamily={['Arial', 'Helvetica', 'sans-serif']}
          webFont={{ url: 'https://fonts.gstatic.com/s/nunito/v26/XRXI3I6Li01BKofiOc5wtlZ2di8HDLshdTQ3jw.woff2', format: 'woff2' }}
          fontWeight={400}
          fontStyle="normal"
        />
        <style>{darkCss}</style>
      </Head>
      <Preview>{preview}</Preview>
      <Body className="bg-page" style={{ margin: 0, padding: 0, backgroundColor: '#e9e9e9', fontFamily: SANS }}>
        <table role="presentation" width="100%" cellPadding={0} cellSpacing={0} className="bg-page" style={{ width: '100%', backgroundColor: '#e9e9e9' }}>
          <tbody>
            <tr>
              <td className="bg-page" style={{ padding: '32px 12px', backgroundColor: '#e9e9e9' }}>
        <Container
          className="bg-card"
          style={{ maxWidth: 560, width: '100%', backgroundColor: '#ffffff', border: '3px solid #000000', margin: '0 auto' }}
        >
          <Section className="bg-bar" style={{ backgroundColor: '#d4d4d4', borderBottom: '3px solid #000000' }}>
            <table role="presentation" width="100%" cellPadding={0} cellSpacing={0} style={{ width: '100%' }}>
              <tbody>
                <tr>
                  <td style={{ padding: '10px 14px', width: 48, whiteSpace: 'nowrap' }}>
                    <span className="dot" style={dot}>&nbsp;</span>
                    <span className="dot" style={{ ...dot, marginLeft: 6 }}>&nbsp;</span>
                  </td>
                  <td className="tx" style={{ padding: '10px 14px 10px 0', fontFamily: MONO, fontSize: 13, fontWeight: 700, color: '#000000', letterSpacing: 0.5 }}>
                    {windowTitle}
                  </td>
                </tr>
              </tbody>
            </table>
          </Section>
          <Section className="pad" style={{ padding: '36px 36px 8px' }}>
            {children}
          </Section>
          <Section className="pad" style={{ padding: '8px 36px 28px' }}>
            <div className="rule" style={{ borderTop: '1px solid #000000', margin: '0 0 16px' }} />
            {footer}
          </Section>
        </Container>
              </td>
            </tr>
          </tbody>
        </table>
      </Body>
    </Html>
  )
}

const dot = {
  display: 'inline-block',
  width: 12,
  height: 12,
  lineHeight: '12px',
  fontSize: 12,
  border: '2px solid #000000',
  borderRadius: 12,
  backgroundColor: '#ffffff',
} as const

export function Small({ children, mono = false }: { children: ReactNode; mono?: boolean }) {
  return (
    <Text className="tx-soft" style={{ margin: '0 0 4px', fontFamily: mono ? MONO : SANS, fontSize: 12, lineHeight: '18px', color: '#555555' }}>
      {children}
    </Text>
  )
}
