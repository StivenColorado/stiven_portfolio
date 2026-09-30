import { Button, Heading, Link, Section, Text } from '@react-email/components'
import { Layout, MONO, SANS, Small } from './components/Layout.tsx'

export const subject = 'Restablece tu contraseña'

export default function ResetPassword({ url = '{{url}}', minutes = '{{minutes}}' }: { url?: string; minutes?: string }) {
  return (
    <Layout
      preview="Usa este enlace para elegir una nueva contraseña."
      windowTitle="restablecer.mail"
      footer={
        <>
          <Small>Stiven Colorado · negocioempresarial.online</Small>
          <Small>Si no lo pediste, ignora este correo.</Small>
        </>
      }
    >
      <Heading
        as="h1"
        className="h1 tx"
        style={{ margin: '0 0 16px', fontFamily: SANS, fontSize: 34, lineHeight: '40px', fontWeight: 800, color: '#000000' }}
      >
        Restablece tu contraseña
      </Heading>
      <Text className="tx" style={{ margin: '0 0 28px', fontFamily: SANS, fontSize: 16, lineHeight: '24px', color: '#000000' }}>
        Recibimos una solicitud para cambiar la contraseña del panel. Pulsa el botón para elegir una nueva.
      </Text>
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
          <span className="btn-text" style={{ color: '#ffffff' }}>Restablecer contraseña</span>
        </Button>
      </Section>
      <Section className="box" style={{ border: '2px solid #000000', backgroundColor: '#f4f4f4', margin: '0 0 20px' }}>
        <div style={{ padding: '12px 14px' }}>
          <Small>Si el botón no funciona, copia este enlace</Small>
          <Link className="tx" href={url} style={{ fontFamily: MONO, fontSize: 12, lineHeight: '18px', color: '#000000', wordBreak: 'break-all' }}>
            {url}
          </Link>
        </div>
      </Section>
      <Text className="tx" style={{ margin: '0 0 8px', fontFamily: SANS, fontSize: 14, lineHeight: '21px', color: '#000000' }}>
        El enlace vence en <strong>{minutes} minutos</strong> y solo se puede usar una vez.
      </Text>
    </Layout>
  )
}
