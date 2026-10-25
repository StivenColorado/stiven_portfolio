import { Heading, Section, Text } from '@react-email/components'
import { Layout, MONO, SANS, Small } from './components/Layout.tsx'

const COPY = {
  es: {
    preview: 'Tu copia firmada va adjunta.',
    document: 'Documento',
    signedAt: 'Firmado el',
    hash: 'Huella SHA-256',
    note: 'La huella identifica el contenido exacto que se firmó; también aparece en el PDF adjunto.',
    footer: 'Guarda este correo como constancia.',
  },
  en: {
    preview: 'Your signed copy is attached.',
    document: 'Document',
    signedAt: 'Signed on',
    hash: 'SHA-256 fingerprint',
    note: 'The fingerprint identifies the exact content that was signed; it also appears in the attached PDF.',
    footer: 'Keep this email as a record.',
  },
} as const

export default function ContractSigned({ lang = 'es' }: { lang?: 'es' | 'en' }) {
  const c = COPY[lang]
  const row = { margin: '0 0 12px', fontFamily: SANS, fontSize: 15, lineHeight: '22px', color: '#000000' } as const
  return (
    <Layout
      lang={lang}
      preview={c.preview}
      windowTitle="firmado.mail"
      footer={
        <>
          <Small>Stiven Colorado · negocioempresarial.online</Small>
          <Small>{c.footer}</Small>
        </>
      }
    >
      <Heading
        as="h1"
        className="h1 tx"
        style={{ margin: '0 0 16px', fontFamily: SANS, fontSize: 34, lineHeight: '40px', fontWeight: 800, color: '#000000' }}
      >
        {'{{heading}}'}
      </Heading>
      <Text className="tx" style={{ margin: '0 0 24px', fontFamily: SANS, fontSize: 16, lineHeight: '24px', color: '#000000' }}>
        {'{{intro}}'}
      </Text>
      <Section className="box" style={{ border: '2px solid #000000', backgroundColor: '#f4f4f4', margin: '0 0 20px' }}>
        <div style={{ padding: '12px 14px' }}>
          <Small>{c.document}</Small>
          <Text className="tx" style={row}><strong>{'{{docTitle}}'}</strong></Text>
          <Small>{c.signedAt}</Small>
          <Text className="tx" style={row}>{'{{signedAt}}'}</Text>
          <Small>{c.hash}</Small>
          <Text className="tx" style={{ ...row, margin: 0, fontFamily: MONO, fontSize: 12, lineHeight: '18px', wordBreak: 'break-all' }}>
            {'{{hash}}'}
          </Text>
        </div>
      </Section>
      <Text className="tx" style={{ margin: '0 0 8px', fontFamily: SANS, fontSize: 14, lineHeight: '21px', color: '#000000' }}>
        {c.note}
      </Text>
    </Layout>
  )
}
