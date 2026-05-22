const BRAND = {
  bg: '#131316',
  card: '#1B1B1D',
  surface: '#161618',
  border: '#2C2C30',
  primary: '#F2B045',
  accent: '#EDA135',
  text: '#F5F5F5',
  textSecondary: '#919197',
  textOnPrimary: '#131316',
};

function baseTemplate({ preheader = '', body }) {
  return `<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <meta http-equiv="X-UA-Compatible" content="IE=edge" />
  <title>FB Core</title>
  <!--[if mso]><noscript><xml><o:OfficeDocumentSettings><o:PixelsPerInch>96</o:PixelsPerInch></o:OfficeDocumentSettings></xml></noscript><![endif]-->
  <style>
    @import url('https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700&display=swap');
    * { box-sizing: border-box; }
    body { margin: 0; padding: 0; background-color: ${BRAND.bg}; font-family: 'Plus Jakarta Sans', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; }
    a { color: ${BRAND.primary}; }
    @media only screen and (max-width: 600px) {
      .email-wrapper { padding: 16px !important; }
      .email-body { padding: 28px 24px !important; }
    }
  </style>
</head>
<body style="margin:0;padding:0;background-color:${BRAND.bg};">
  ${preheader ? `<div style="display:none;max-height:0;overflow:hidden;mso-hide:all;">${preheader}&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;</div>` : ''}
  <table width="100%" cellpadding="0" cellspacing="0" role="presentation" style="background-color:${BRAND.bg};padding:40px 16px;" class="email-wrapper">
    <tr>
      <td align="center">
        <table width="100%" cellpadding="0" cellspacing="0" role="presentation" style="max-width:580px;width:100%;">

          <!-- HEADER -->
          <tr>
            <td style="border-radius:16px 16px 0 0;overflow:hidden;">
              <table width="100%" cellpadding="0" cellspacing="0" role="presentation"
                style="background-color:${BRAND.surface};border:1px solid ${BRAND.border};border-bottom:none;border-radius:16px 16px 0 0;padding:28px 40px;">
                <tr>
                  <td>
                    <table cellpadding="0" cellspacing="0" role="presentation">
                      <tr>
                        <td>
                          <!-- Logo mark -->
                          <table cellpadding="0" cellspacing="0" role="presentation" style="display:inline-table;vertical-align:middle;">
                            <tr>
                              <td style="background:${BRAND.primary};border-radius:8px;width:32px;height:32px;text-align:center;vertical-align:middle;">
                                <span style="font-size:16px;font-weight:800;color:${BRAND.textOnPrimary};line-height:32px;display:block;">F</span>
                              </td>
                              <td style="padding-left:10px;vertical-align:middle;">
                                <span style="font-size:20px;font-weight:700;color:${BRAND.text};letter-spacing:-0.5px;">FB <span style="color:${BRAND.primary};">Core</span></span>
                              </td>
                            </tr>
                          </table>
                        </td>
                        <td align="right" style="vertical-align:middle;">
                          <span style="font-size:11px;color:${BRAND.textSecondary};letter-spacing:0.5px;text-transform:uppercase;">by FBSystems</span>
                        </td>
                      </tr>
                    </table>
                  </td>
                </tr>
                <!-- Gold accent line -->
                <tr>
                  <td style="padding-top:20px;">
                    <div style="height:1px;background:linear-gradient(90deg,${BRAND.primary} 0%,${BRAND.accent} 40%,transparent 100%);"></div>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- CARD BODY -->
          <tr>
            <td style="background-color:${BRAND.card};border:1px solid ${BRAND.border};border-top:none;border-bottom:none;">
              <div style="padding:40px 48px;" class="email-body">
                ${body}
              </div>
            </td>
          </tr>

          <!-- FOOTER -->
          <tr>
            <td style="background-color:${BRAND.surface};border:1px solid ${BRAND.border};border-top:none;border-radius:0 0 16px 16px;padding:20px 48px;text-align:center;">
              <p style="margin:0;font-size:12px;color:${BRAND.textSecondary};line-height:1.6;">
                Este correo fue generado automáticamente por <strong style="color:${BRAND.primary};">FB Core</strong>.<br />
                Si no solicitaste esta acción, puedes ignorar este mensaje con seguridad.
              </p>
              <p style="margin:10px 0 0;font-size:11px;color:#555559;">
                © ${new Date().getFullYear()} <a href="https://fbsystems.cl" style="color:${BRAND.textSecondary};text-decoration:none;">FBSystems</a> · fbcore.cloud
              </p>
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
}

export function resetPasswordEmail({ name, resetUrl }) {
  const body = `
    <h1 style="margin:0 0 8px;font-size:22px;font-weight:700;color:${BRAND.text};letter-spacing:-0.5px;">
      Recupera tu contraseña
    </h1>
    <p style="margin:0 0 28px;font-size:14px;color:${BRAND.textSecondary};line-height:1.6;">
      Hola <strong style="color:${BRAND.text};">${name}</strong>, recibimos una solicitud para restablecer la contraseña de tu cuenta en FB Core.
    </p>

    <!-- Aviso de expiración -->
    <table width="100%" cellpadding="0" cellspacing="0" role="presentation" style="margin-bottom:28px;">
      <tr>
        <td style="background-color:${BRAND.surface};border:1px solid ${BRAND.border};border-left:3px solid ${BRAND.primary};border-radius:8px;padding:14px 18px;">
          <p style="margin:0;font-size:13px;color:${BRAND.textSecondary};">
            <span style="color:${BRAND.primary};font-weight:600;">⏱ Válido por 1 hora</span> &nbsp;·&nbsp; Generado el ${new Date().toLocaleString('es-CL', { dateStyle: 'medium', timeStyle: 'short' })}
          </p>
        </td>
      </tr>
    </table>

    <!-- Botón CTA -->
    <table width="100%" cellpadding="0" cellspacing="0" role="presentation" style="margin-bottom:32px;">
      <tr>
        <td align="center">
          <a href="${resetUrl}"
            style="display:inline-block;background:${BRAND.primary};color:${BRAND.textOnPrimary};font-size:15px;font-weight:700;text-decoration:none;padding:14px 44px;border-radius:10px;letter-spacing:0.1px;">
            Restablecer contraseña
          </a>
        </td>
      </tr>
    </table>

    <!-- URL de fallback -->
    <table width="100%" cellpadding="0" cellspacing="0" role="presentation">
      <tr>
        <td style="border-top:1px solid ${BRAND.border};padding-top:20px;">
          <p style="margin:0 0 6px;font-size:12px;color:${BRAND.textSecondary};">
            Si el botón no funciona, copia este enlace en tu navegador:
          </p>
          <p style="margin:0;font-size:11px;word-break:break-all;">
            <a href="${resetUrl}" style="color:${BRAND.primary};text-decoration:none;">${resetUrl}</a>
          </p>
        </td>
      </tr>
    </table>
  `;

  return {
    subject: 'Recuperación de contraseña — FB Core',
    html: baseTemplate({
      preheader: 'Restablece tu contraseña de FB Core. El enlace expira en 1 hora.',
      body,
    }),
    text: `Hola ${name},\n\nHaz clic en el siguiente enlace para restablecer tu contraseña (válido 1 hora):\n\n${resetUrl}\n\nSi no solicitaste esto, ignora este correo.\n\nFB Core · FBSystems`,
  };
}

export function dailyAlertsEmail({ tenantName, date, alertItems }) {
  const alertRows = alertItems.map(item => `
    <tr>
      <td style="padding:14px 16px;border-bottom:1px solid ${BRAND.border};">
        <table width="100%" cellpadding="0" cellspacing="0" role="presentation">
          <tr>
            <td style="width:36px;vertical-align:middle;">
              <div style="width:32px;height:32px;background-color:${BRAND.surface};border:1px solid ${BRAND.border};border-radius:8px;text-align:center;line-height:32px;font-size:15px;">
                ${item.icon}
              </div>
            </td>
            <td style="padding-left:12px;vertical-align:middle;">
              <p style="margin:0;font-size:14px;color:${BRAND.text};font-weight:500;">${item.label}</p>
              ${item.detail ? `<p style="margin:2px 0 0;font-size:12px;color:${BRAND.textSecondary};">${item.detail}</p>` : ''}
            </td>
            <td style="text-align:right;vertical-align:middle;white-space:nowrap;">
              <span style="background-color:${BRAND.primary};color:${BRAND.textOnPrimary};font-size:13px;font-weight:700;padding:4px 14px;border-radius:20px;">
                ${item.count}
              </span>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  `).join('');

  const body = `
    <h1 style="margin:0 0 4px;font-size:22px;font-weight:700;color:${BRAND.text};letter-spacing:-0.5px;">
      Resumen diario
    </h1>
    <p style="margin:0 0 28px;font-size:13px;color:${BRAND.textSecondary};">
      ${tenantName} &nbsp;·&nbsp; ${date}
    </p>

    <p style="margin:0 0 14px;font-size:14px;color:${BRAND.textSecondary};line-height:1.6;">
      Se detectaron <strong style="color:${BRAND.text};">${alertItems.length} elemento${alertItems.length !== 1 ? 's' : ''}</strong> que requieren atención:
    </p>

    <!-- Tabla de alertas -->
    <table width="100%" cellpadding="0" cellspacing="0" role="presentation"
      style="background-color:${BRAND.surface};border:1px solid ${BRAND.border};border-radius:12px;overflow:hidden;margin-bottom:32px;">
      ${alertRows}
    </table>

    <!-- CTA -->
    <table width="100%" cellpadding="0" cellspacing="0" role="presentation">
      <tr>
        <td align="center">
          <a href="https://fbcore.cloud"
            style="display:inline-block;background:${BRAND.primary};color:${BRAND.textOnPrimary};font-size:14px;font-weight:700;text-decoration:none;padding:13px 36px;border-radius:10px;">
            Ir a FB Core
          </a>
        </td>
      </tr>
    </table>
  `;

  return {
    subject: `Resumen diario · ${alertItems.length} alerta${alertItems.length !== 1 ? 's' : ''} — ${tenantName}`,
    html: baseTemplate({
      preheader: `${tenantName} tiene ${alertItems.length} elemento${alertItems.length !== 1 ? 's' : ''} que requieren atención hoy.`,
      body,
    }),
  };
}
