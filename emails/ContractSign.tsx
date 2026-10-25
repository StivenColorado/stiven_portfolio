import { Button, Heading, Link, Section, Text } from '@react-email/components'
import { Layout, MONO, SANS, Small } from './components/Layout.tsx'

const COPY = {
  es: {
    preview: 'Tienes un documento pendiente de firma.',
    greeting: 'Hola',
    button: 'Revisar y firmar',
    fallback: 'Si el botón no funciona, copia este enlace',
    note: ['Este enlace es personal: no lo compartas. Vence en ', ' días.'],
    footer: 'Si no esperabas este correo, puedes ignorarlo.',
  },
  en: {
    preview: 'You have a document waiting for your signature.',
    greeting: 'Hi',
    button: 'Review and sign',
    fallback: "If the button doesn't work, copy this link",
    note: ['This link is personal: please do not share it. It expires in ', ' days.'],
    footer: "If you weren't expecting this email, you can ignore it.",
  },
} as const

type Props = { lang?: 'es' | 'en' }

export default function ContractSign({ lang = 'es' }: Props) {
  const c = COPY[lang]
  const url = '{{url}}'
  return (
    <Layout
      lang={lang}
      preview={c.preview}
      windowTitle="firmar.mail"
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
      <Text className="tx" style={{ margin: '0 0 12px', fontFamily: SANS, fontSize: 16, lineHeight: '24px', color: '#000000' }}>
        {c.greeting} {'{{clientName}}'},
      </Text>
      <Text className="tx" style={{ margin: '0 0 20px', fontFamily: SANS, fontSize: 16, lineHeight: '24px', color: '#000000' }}>
        {'{{intro}}'}
      </Text>
      <Section className="box" style={{ border: '2px solid #000000', backgroundColor: '#f4f4f4', margin: '0 0 24px' }}>
        <div style={{ padding: '12px 14px' }}>
          <Small>{'{{ownerName}}'}</Small>
          <Text className="tx" style={{ margin: 0, fontFamily: SANS, fontSize: 15, lineHeight: '22px', color: '#000000' }}>
            {'{{message}}'}
          </Text>
        </div>
      </Section>
      <Section style={{ margin: '0 0 28px' }}>
        <Button
          href={url}
          className="btn"
          style={{
            backgroundColor: '#000000',
            color: '#ffffff',
            fontFamily: SANS,
            fontSize: 16,
            fontWeight: 800,
            lineHeight: '20px',
            textDecoration: 'none',
            display: 'inline-block',
            padding: '14px 26px',
            border: '2px solid #000000',
            borderBottom: '6px solid #6b6b6b',
            borderRight: '6px solid #6b6b6b',
          }}
        >
          <span className="btn-text" style={{ color: '#ffffff' }}>{c.button}</span>
        </Button>
      </Section>
      <Section className="box" style={{ border: '2px solid #000000', backgroundColor: '#f4f4f4', margin: '0 0 20px' }}>
        <div style={{ padding: '12px 14px' }}>
          <Small>{c.fallback}</Small>
          <Link className="tx" href={url} style={{ fontFamily: MONO, fontSize: 12, lineHeight: '18px', color: '#000000', wordBreak: 'break-all' }}>
            {url}
          </Link>
        </div>
      </Section>
      <Text className="tx" style={{ margin: '0 0 8px', fontFamily: SANS, fontSize: 14, lineHeight: '21px', color: '#000000' }}>
        {c.note[0]}
        <strong>{'{{days}}'}</strong>
        {c.note[1]}
      </Text>
    </Layout>
  )
}
