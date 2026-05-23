// FB Core — Email Templates
// Design: minimal, professional — no SVG/emoji (Gmail/Outlook strip them)
// Inspired by Stripe / Linear / Notion email style

const C = {
  bg:           '#F5F5F5',
  card:         '#FFFFFF',
  border:       '#E4E4E4',
  topBar:       '#F2B045',
  text:         '#111111',
  textMid:      '#4B4B4B',
  textSoft:     '#9B9B9B',
  accent:       '#F2B045',
  accentText:   '#7A4F00',
  accentBg:     '#FEF6E4',
  accentBorder: '#F5D48A',
  divider:      '#EBEBEB',
  danger:       '#B91C1C',
  dangerBg:     '#FFF5F5',
  dangerBorder: '#FCA5A5',
  warning:      '#92400E',
  warningBg:    '#FFFBEB',
  warningBorder:'#FCD34D',
  rowHover:     '#FAFAFA',
};

// ── Base Template ─────────────────────────────────────────────────────────────

function base({ preheader = '', body, footerNote = '' }) {
  const year = new Date().getFullYear();
  return `<!DOCTYPE html>
<html lang="es" xmlns="http://www.w3.org/1999/xhtml">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width,initial-scale=1.0" />
  <meta http-equiv="X-UA-Compatible" content="IE=edge" />
  <title>FB Core</title>
  <style>
    body,table,td,a{-webkit-text-size-adjust:100%;-ms-text-size-adjust:100%;}
    table,td{mso-table-lspace:0pt;mso-table-rspace:0pt;}
    img{border:0;outline:none;text-decoration:none;-ms-interpolation-mode:bicubic;}
    body{margin:0!important;padding:0!important;}
    a{color:inherit;}
    @media only screen and (max-width:600px){
      .outer{padding:16px!important;}
      .card-body{padding:32px 24px!important;}
      .btn-cell{display:block!important;width:100%!important;}
    }
  </style>
</head>
<body style="margin:0;padding:0;background-color:${C.bg};">
  ${preheader ? `<div style="display:none;max-height:0;overflow:hidden;font-size:1px;line-height:1px;color:${C.bg};">${preheader}&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;</div>` : ''}

  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background-color:${C.bg};">
    <tr>
      <td align="center" style="padding:48px 24px;" class="outer">
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="max-width:560px;width:100%;">

          <!-- Wordmark -->
          <tr>
            <td style="padding-bottom:24px;">
              <img src="https://fbcore.cloud/logo.png"
                   alt="FB Core"
                   width="120"
                   style="display:block;border:0;outline:none;text-decoration:none;max-width:120px;height:auto;" />
            </td>
          </tr>

          <!-- Card -->
          <tr>
            <td style="background-color:${C.card};border:1px solid ${C.border};border-radius:6px;overflow:hidden;">

              <!-- Top accent bar -->
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">
                <tr><td style="background-color:${C.topBar};height:3px;line-height:3px;font-size:0;">&nbsp;</td></tr>
              </table>

              <!-- Body -->
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">
                <tr>
                  <td style="padding:44px 48px;" class="card-body">
                    ${body}
                  </td>
                </tr>
              </table>

            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="padding-top:24px;">
              <p style="margin:0;font-size:12px;color:${C.textSoft};line-height:1.7;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Helvetica,Arial,sans-serif;">
                ${footerNote ? `${footerNote}<br><br>` : ''}
                &copy; ${year} <a href="https://fbsystems.cl" style="color:${C.textSoft};">FBSystems SpA</a> &nbsp;&middot;&nbsp; <a href="https://fbcore.cloud" style="color:${C.textSoft};">fbcore.cloud</a>
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

// ── Helpers ───────────────────────────────────────────────────────────────────

function label(text) {
  return `<p style="margin:0 0 18px;font-size:11px;font-weight:700;letter-spacing:0.8px;text-transform:uppercase;color:${C.accentText};font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Helvetica,Arial,sans-serif;">${text}</p>`;
}

function heading(text) {
  return `<h1 style="margin:0 0 16px;font-size:24px;font-weight:700;color:${C.text};letter-spacing:-0.5px;line-height:1.3;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Helvetica,Arial,sans-serif;">${text}</h1>`;
}

function para(text, style = '') {
  return `<p style="margin:0 0 20px;font-size:14px;color:${C.textMid};line-height:1.75;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Helvetica,Arial,sans-serif;${style}">${text}</p>`;
}

function divider() {
  return `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="margin:28px 0 24px;">
    <tr><td style="border-top:1px solid ${C.divider};line-height:0;font-size:0;">&nbsp;</td></tr>
  </table>`;
}

function ctaButton(href, label) {
  return `<table role="presentation" cellpadding="0" cellspacing="0" border="0" style="margin:28px 0 6px;">
    <tr>
      <td style="border-radius:5px;background-color:${C.text};" class="btn-cell">
        <a href="${href}"
          style="display:inline-block;padding:13px 30px;font-size:14px;font-weight:600;color:#FFFFFF;text-decoration:none;letter-spacing:-0.1px;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Helvetica,Arial,sans-serif;">
          ${label} &nbsp;&#8594;
        </a>
      </td>
    </tr>
  </table>`;
}

function callout(text, type = 'warning') {
  const styles = {
    warning: { bg: C.warningBg, border: C.warningBorder, color: C.warning },
    danger:  { bg: C.dangerBg,  border: C.dangerBorder,  color: C.danger  },
    neutral: { bg: C.accentBg,  border: C.accentBorder,  color: C.accentText },
  };
  const s = styles[type] || styles.neutral;
  return `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="margin:20px 0;">
    <tr>
      <td style="background-color:${s.bg};border:1px solid ${s.border};border-left:3px solid ${s.border === C.warningBorder ? '#D97706' : s.border === C.dangerBorder ? '#EF4444' : C.accent};border-radius:4px;padding:14px 18px;">
        <p style="margin:0;font-size:13px;color:${s.color};line-height:1.65;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Helvetica,Arial,sans-serif;">${text}</p>
      </td>
    </tr>
  </table>`;
}

function dataRow(left, right, rightColor = C.textMid) {
  return `<tr>
    <td style="padding:11px 0;border-bottom:1px solid ${C.divider};font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Helvetica,Arial,sans-serif;">
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">
        <tr>
          <td style="font-size:13px;color:${C.text};font-weight:500;vertical-align:middle;">${left}</td>
          <td style="font-size:13px;color:${rightColor};text-align:right;vertical-align:middle;padding-left:16px;white-space:nowrap;">${right}</td>
        </tr>
      </table>
    </td>
  </tr>`;
}

function sectionTitle(text) {
  return `<p style="margin:0 0 4px;font-size:11px;font-weight:700;letter-spacing:0.6px;text-transform:uppercase;color:${C.textSoft};font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Helvetica,Arial,sans-serif;">${text}</p>`;
}

// ── 1. Reset Password Email ───────────────────────────────────────────────────

export function resetPasswordEmail({ name, resetUrl }) {
  const body = `
    ${label('Cuenta')}
    ${heading('Restablecer contraseña')}
    ${para(`Hola <strong style="color:${C.text};">${name}</strong>, recibimos una solicitud para cambiar la contraseña de tu cuenta en FB Core.`)}
    ${para(`Si fuiste tú, haz clic en el botón a continuación. El enlace expira en <strong style="color:${C.text};">1 hora</strong>.`)}
    ${ctaButton(resetUrl, 'Restablecer contraseña')}
    ${divider()}
    ${para('Si no solicitaste este cambio, ignora este correo. Tu contraseña permanece sin cambios.')}
    <p style="margin:0;font-size:12px;color:${C.textSoft};line-height:1.7;word-break:break-all;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Helvetica,Arial,sans-serif;">
      Si el botón no funciona, copia este enlace en tu navegador:<br>
      <a href="${resetUrl}" style="color:${C.textSoft};">${resetUrl}</a>
    </p>`;

  return {
    subject: 'Restablecer contraseña — FB Core',
    html: base({
      preheader: 'Restablece tu contraseña. El enlace expira en 1 hora.',
      body,
      footerNote: 'Si no solicitaste este correo, puedes ignorarlo.',
    }),
  };
}

// ── 2. Welcome Email ──────────────────────────────────────────────────────────

export function welcomeEmail({ userName, companyName, plan = 'starter_free', mandatoryModules = [], trialModules = [], appUrl, whatsappNumber }) {
  const waText = encodeURIComponent(`Hola, acabo de crear mi empresa "${companyName}" en FB Core y tengo preguntas.`);
  const waUrl  = `https://wa.me/${whatsappNumber}?text=${waText}`;

  const mandatoryRows = mandatoryModules.map(m => dataRow(m, 'Incluido')).join('');
  const trialRows     = trialModules.map(m => dataRow(m, '30 d&iacute;as de prueba', C.warning)).join('');

  const modulesSection = (mandatoryModules.length || trialModules.length) ? `
    ${divider()}
    ${sectionTitle('M&oacute;dulos activados')}
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="margin-top:10px;">
      ${mandatoryRows}${trialRows}
    </table>` : '';

  const trialNote = trialModules.length
    ? callout(`Tus m&oacute;dulos de prueba est&aacute;n activos por <strong>30 d&iacute;as</strong>. Con&aacute;ctanos antes de que venzan para no perder el acceso.`, 'neutral')
    : '';

  const body = `
    ${label('Bienvenida')}
    ${heading(`Hola, ${userName}`)}
    ${para(`Tu empresa <strong style="color:${C.text};">${companyName}</strong> est&aacute; activa en FB Core. Puedes comenzar a usar la plataforma de inmediato.`)}
    ${ctaButton(appUrl, 'Ingresar a FB Core')}
    ${modulesSection}
    ${trialNote}
    ${divider()}
    <p style="margin:0;font-size:13px;color:${C.textMid};line-height:1.75;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Helvetica,Arial,sans-serif;">
      &iquest;Tienes preguntas? <a href="${waUrl}" style="color:${C.text};font-weight:600;text-decoration:none;">Esc&iacute;benos por WhatsApp</a> y te respondemos a la brevedad.
    </p>`;

  return {
    subject: `Bienvenido a FB Core — ${companyName}`,
    html: base({
      preheader: `${companyName} ya está activa. Ingresa y comienza a gestionar tu empresa.`,
      body,
      footerNote: 'Recibiste este correo porque creaste una cuenta en FB Core.',
    }),
  };
}

// ── 3. Daily Alerts Email ─────────────────────────────────────────────────────

export function dailyAlertsEmail({ tenantName, date, alertItems = [] }) {
  const total = alertItems.reduce((sum, i) => sum + (i.count || 0), 0);

  const rows = alertItems.map(item => {
    const isHigh   = item.count >= 5;
    const countHtml = `<strong style="color:${isHigh ? C.danger : C.text};">${item.count}</strong>`;
    const detail    = item.detail
      ? `<span style="color:${C.textSoft};font-size:12px;"> &nbsp;&mdash; ${item.detail}</span>`
      : '';
    return dataRow(`${item.label}${detail}`, countHtml, isHigh ? C.danger : C.textMid);
  }).join('');

  const body = `
    ${label('Resumen diario')}
    ${heading(`${total} elemento${total !== 1 ? 's' : ''} requiere${total !== 1 ? 'n' : ''} atenci&oacute;n`)}
    ${para(`Revisi&oacute;n del <strong style="color:${C.text};">${date}</strong> para <strong style="color:${C.text};">${tenantName}</strong>.`)}
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="margin:4px 0 24px;">
      ${rows}
    </table>
    ${ctaButton('https://fbcore.cloud', 'Revisar en FB Core')}
    ${divider()}
    ${para('Este resumen se env&iacute;a autom&aacute;ticamente todos los d&iacute;as a las 09:00 h (Chile).', `color:${C.textSoft};font-size:13px;`)}`;

  return {
    subject: `${total} alerta${total !== 1 ? 's' : ''} pendiente${total !== 1 ? 's' : ''} — ${tenantName}`,
    html: base({
      preheader: `${total} elementos requieren tu atención hoy en ${tenantName}.`,
      body,
      footerNote: 'Recibes este resumen porque eres administrador de la cuenta.',
    }),
  };
}

// ── 4. Trial Expiry Email ─────────────────────────────────────────────────────

export function trialExpiryEmail({ tenantName, modules = [], waUrl }) {
  const urgent     = modules.some(m => m.daysLeft <= 7);
  const minDays    = Math.min(...modules.map(m => m.daysLeft));

  const rows = modules.map(m => {
    const isUrgent   = m.daysLeft <= 7;
    const daysLabel  = `${m.daysLeft} d&iacute;a${m.daysLeft !== 1 ? 's' : ''}`;
    const rightColor = isUrgent ? C.danger : C.warning;
    return dataRow(m.name, `<strong style="color:${rightColor};">${daysLabel}</strong>`, rightColor);
  }).join('');

  const headline = urgent ? 'Tu per&iacute;odo de prueba vence pronto' : 'Recordatorio de prueba';
  const intro    = urgent
    ? `Algunos m&oacute;dulos de <strong style="color:${C.text};">${tenantName}</strong> vencen en menos de 7 d&iacute;as. Una vez expirados, el acceso quedar&aacute; suspendido hasta activar un plan &mdash; tus datos se conservan.`
    : `Los siguientes m&oacute;dulos de <strong style="color:${C.text};">${tenantName}</strong> est&aacute;n pr&oacute;ximos a vencer. Cont&aacute;ctanos para extender o activar tu plan.`;

  const urgentNote = urgent
    ? callout('Renueva antes de que expire para mantener el acceso sin interrupciones.', 'danger')
    : '';

  const body = `
    ${label('Per&iacute;odo de prueba')}
    ${heading(headline)}
    ${para(intro)}
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="margin:4px 0 20px;">
      ${rows}
    </table>
    ${urgentNote}
    ${ctaButton(waUrl, 'Extender por WhatsApp')}
    ${divider()}
    ${para('Tambi&eacute;n puedes responder este correo y nuestro equipo te contactar&aacute; a la brevedad.', `color:${C.textSoft};font-size:13px;`)}`;

  return {
    subject: urgent
      ? `Tu prueba vence en ${minDays} día${minDays !== 1 ? 's' : ''} — FB Core`
      : `Módulos de prueba por vencer — FB Core`,
    html: base({
      preheader: urgent
        ? `Renueva ahora para no perder acceso en ${tenantName}.`
        : `Tus módulos de prueba en ${tenantName} están próximos a vencer.`,
      body,
      footerNote: 'Recibes este correo porque eres administrador de la cuenta.',
    }),
  };
}
