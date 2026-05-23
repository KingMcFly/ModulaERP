// FB Core — Email Templates
// Design: institutional, clean — Stripe/Linear inspired
// No decorative bars, no sharp corners, generous whitespace

const C = {
  bg:           '#F4F4F4',
  card:         '#FFFFFF',
  border:       '#E2E2E2',
  text:         '#1A1A1A',
  textMid:      '#4C4C4C',
  textSoft:     '#9A9A9A',
  accent:       '#F2B045',
  accentDark:   '#B07820',
  divider:      '#EBEBEB',
  btnBg:        '#1A1A1A',
  btnText:      '#FFFFFF',
  danger:       '#C0392B',
  dangerBg:     '#FDF3F2',
  dangerLeft:   '#E74C3C',
  warning:      '#92600A',
  warningBg:    '#FDFAF2',
  warningLeft:  '#F0A500',
  neutralLeft:  '#F2B045',
  neutralBg:    '#FDFAF4',
};

const LOGO_URL = 'https://api.fbcore.cloud/public/logo.png';
const FONT     = `-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif`;

// ── Base ──────────────────────────────────────────────────────────────────────

function base({ preheader = '', body, footerNote = '' }) {
  const year = new Date().getFullYear();
  return `<!DOCTYPE html>
<html lang="es" xmlns="http://www.w3.org/1999/xhtml">
<head>
  <meta charset="UTF-8"/>
  <meta name="viewport" content="width=device-width,initial-scale=1.0"/>
  <meta http-equiv="X-UA-Compatible" content="IE=edge"/>
  <title>FB Core</title>
  <style>
    body,table,td,a{-webkit-text-size-adjust:100%;-ms-text-size-adjust:100%;}
    table,td{mso-table-lspace:0pt;mso-table-rspace:0pt;}
    img{border:0;outline:none;text-decoration:none;-ms-interpolation-mode:bicubic;}
    body{margin:0!important;padding:0!important;}
    @media only screen and (max-width:600px){
      .wrap{padding:16px!important;}
      .card-inner{padding:36px 28px!important;}
      .btn-td{display:block!important;width:100%!important;text-align:center!important;}
    }
  </style>
</head>
<body style="margin:0;padding:0;background-color:${C.bg};">
  ${preheader ? `<div style="display:none;max-height:0;overflow:hidden;font-size:1px;line-height:1px;color:${C.bg};">${preheader}&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;</div>` : ''}

  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">
    <tr>
      <td align="center" style="padding:48px 24px;" class="wrap">
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="max-width:560px;">

          <!-- Logo -->
          <tr>
            <td align="center" style="padding-bottom:32px;">
              <a href="https://fbcore.cloud" style="text-decoration:none;border:0;display:block;">
                <img src="${LOGO_URL}" alt="FB Core" width="160" height="auto"
                  style="display:block;margin:0 auto;border:0;max-width:160px;height:auto;" />
              </a>
            </td>
          </tr>

          <!-- Card -->
          <tr>
            <td style="background-color:${C.card};border:1px solid ${C.border};border-radius:12px;">
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">
                <tr>
                  <td style="padding:48px 52px;" class="card-inner">
                    ${body}
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="padding-top:28px;text-align:center;">
              <p style="margin:0 0 6px;font-size:12px;color:${C.textSoft};line-height:1.6;font-family:${FONT};">
                ${footerNote}
              </p>
              <p style="margin:0;font-size:12px;color:${C.textSoft};line-height:1.6;font-family:${FONT};">
                &copy; ${year} <a href="https://fbsystems.cl" style="color:${C.textSoft};text-decoration:underline;">FBSystems SpA</a>
                &nbsp;&middot;&nbsp;
                <a href="https://fbcore.cloud" style="color:${C.textSoft};text-decoration:underline;">fbcore.cloud</a>
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

function h1(text) {
  return `<h1 style="margin:0 0 16px;font-size:22px;font-weight:700;color:${C.text};letter-spacing:-0.4px;line-height:1.3;font-family:${FONT};">${text}</h1>`;
}

function p(text, muted = false) {
  return `<p style="margin:0 0 20px;font-size:15px;color:${muted ? C.textSoft : C.textMid};line-height:1.75;font-family:${FONT};">${text}</p>`;
}

function hr() {
  return `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="margin:28px 0;">
    <tr><td style="border-top:1px solid ${C.divider};line-height:0;font-size:0;">&nbsp;</td></tr>
  </table>`;
}

function btn(href, text) {
  return `<table role="presentation" cellpadding="0" cellspacing="0" border="0" style="margin:28px 0 4px;">
    <tr>
      <td style="border-radius:8px;background-color:${C.btnBg};" class="btn-td">
        <a href="${href}" style="display:inline-block;padding:14px 32px;font-size:15px;font-weight:600;color:${C.btnText};text-decoration:none;letter-spacing:-0.1px;border-radius:8px;font-family:${FONT};">${text}</a>
      </td>
    </tr>
  </table>`;
}

function callout(text, type = 'neutral') {
  const map = {
    neutral: { bg: C.neutralBg,  left: C.neutralLeft,  color: C.accentDark },
    warning: { bg: C.warningBg,  left: C.warningLeft,  color: C.warning    },
    danger:  { bg: C.dangerBg,   left: C.dangerLeft,   color: C.danger     },
  };
  const s = map[type] || map.neutral;
  return `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="margin:20px 0;">
    <tr>
      <td style="background-color:${s.bg};border-radius:8px;border-left:3px solid ${s.left};padding:14px 20px;">
        <p style="margin:0;font-size:14px;color:${s.color};line-height:1.65;font-family:${FONT};">${text}</p>
      </td>
    </tr>
  </table>`;
}

function tableRow(left, right, rightColor = C.textMid) {
  return `<tr>
    <td style="padding:11px 0;border-bottom:1px solid ${C.divider};">
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">
        <tr>
          <td style="font-size:14px;color:${C.text};font-weight:500;vertical-align:middle;font-family:${FONT};">${left}</td>
          <td style="font-size:14px;color:${rightColor};text-align:right;vertical-align:middle;padding-left:16px;white-space:nowrap;font-family:${FONT};">${right}</td>
        </tr>
      </table>
    </td>
  </tr>`;
}

function tableLabel(text) {
  return `<p style="margin:0 0 8px;font-size:11px;font-weight:600;letter-spacing:0.7px;text-transform:uppercase;color:${C.textSoft};font-family:${FONT};">${text}</p>`;
}

// ── 1. Reset Password ─────────────────────────────────────────────────────────

export function resetPasswordEmail({ name, resetUrl }) {
  const body = `
    ${h1('Restablece tu contraseña')}
    ${p(`Hola <strong style="color:${C.text};">${name}</strong>, recibimos una solicitud para cambiar la contraseña de tu cuenta en FB Core.`)}
    ${p(`El enlace es válido por <strong style="color:${C.text};">1 hora</strong>. Si no hiciste esta solicitud, puedes ignorar este correo.`)}
    ${btn(resetUrl, 'Restablecer contraseña')}
    ${hr()}
    <p style="margin:0;font-size:13px;color:${C.textSoft};line-height:1.7;word-break:break-all;font-family:${FONT};">
      Si el botón no funciona, copia este enlace en tu navegador:<br>
      <a href="${resetUrl}" style="color:${C.textSoft};text-decoration:underline;">${resetUrl}</a>
    </p>`;

  return {
    subject: 'Restablecer contraseña — FB Core',
    html: base({
      preheader: 'Restablece tu contraseña de FB Core. El enlace expira en 1 hora.',
      body,
      footerNote: 'Si no solicitaste este correo, puedes ignorarlo sin problema.',
    }),
  };
}

// ── 2. Welcome ────────────────────────────────────────────────────────────────

export function welcomeEmail({ userName, companyName, plan = 'starter_free', mandatoryModules = [], trialModules = [], appUrl, whatsappNumber }) {
  const waText = encodeURIComponent(`Hola, acabo de crear mi empresa "${companyName}" en FB Core y tengo preguntas.`);
  const waUrl  = `https://wa.me/${whatsappNumber}?text=${waText}`;

  const mandatoryRows = mandatoryModules.map(m => tableRow(m, 'Incluido', C.textSoft)).join('');
  const trialRows     = trialModules.map(m => tableRow(m, '30 días de prueba', C.accentDark)).join('');

  const modulesBlock = (mandatoryModules.length || trialModules.length) ? `
    ${hr()}
    ${tableLabel('Módulos activados')}
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">
      ${mandatoryRows}${trialRows}
    </table>
    ${trialModules.length ? callout(`Los módulos de prueba tienen una duración de <strong>30 días</strong>. Contáctanos antes de que venzan para mantener el acceso.`, 'neutral') : ''}` : '';

  const body = `
    ${h1(`Hola, ${userName}`)}
    ${p(`Tu empresa <strong style="color:${C.text};">${companyName}</strong> ya está activa en FB Core. Puedes ingresar y comenzar a trabajar de inmediato.`)}
    ${btn(appUrl, 'Ingresar a FB Core')}
    ${modulesBlock}
    ${hr()}
    <p style="margin:0;font-size:14px;color:${C.textMid};line-height:1.75;font-family:${FONT};">
      ¿Tienes preguntas o necesitas ayuda para comenzar?
      <a href="${waUrl}" style="color:${C.text};font-weight:600;text-decoration:none;">Escríbenos por WhatsApp</a>.
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

// ── 3. Daily Alerts ───────────────────────────────────────────────────────────

export function dailyAlertsEmail({ tenantName, date, alertItems = [] }) {
  const total = alertItems.reduce((sum, i) => sum + (i.count || 0), 0);

  const rows = alertItems.map(item => {
    const isHigh = item.count >= 5;
    const right  = `<strong style="color:${isHigh ? C.danger : C.text};">${item.count}</strong>`;
    const left   = item.detail
      ? `${item.label} <span style="font-size:13px;color:${C.textSoft};font-weight:400;">— ${item.detail}</span>`
      : item.label;
    return tableRow(left, right, isHigh ? C.danger : C.textMid);
  }).join('');

  const body = `
    ${h1(`${total} elemento${total !== 1 ? 's' : ''} requiere${total !== 1 ? 'n' : ''} atención`)}
    ${p(`Resumen del <strong style="color:${C.text};">${date}</strong> para <strong style="color:${C.text};">${tenantName}</strong>.`)}
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="margin:4px 0 24px;">
      ${rows}
    </table>
    ${btn('https://fbcore.cloud', 'Revisar en FB Core')}
    ${hr()}
    ${p('Este resumen se envía automáticamente todos los días a las 09:00 h (hora Chile).', true)}`;

  return {
    subject: `${total} alerta${total !== 1 ? 's' : ''} pendiente${total !== 1 ? 's' : ''} — ${tenantName}`,
    html: base({
      preheader: `${total} elementos requieren tu atención hoy en ${tenantName}.`,
      body,
      footerNote: 'Recibes este resumen porque eres administrador de la cuenta.',
    }),
  };
}

// ── 4. Trial Expiry ───────────────────────────────────────────────────────────

export function trialExpiryEmail({ tenantName, modules = [], waUrl }) {
  const urgent  = modules.some(m => m.daysLeft <= 7);
  const minDays = Math.min(...modules.map(m => m.daysLeft));

  const rows = modules.map(m => {
    const isUrgent = m.daysLeft <= 7;
    const right    = `<strong style="color:${isUrgent ? C.danger : C.warning};">${m.daysLeft} día${m.daysLeft !== 1 ? 's' : ''}</strong>`;
    return tableRow(m.name, right);
  }).join('');

  const headline = urgent ? 'Tu período de prueba está por vencer' : 'Recordatorio de módulos en prueba';
  const intro    = urgent
    ? `Algunos módulos de <strong style="color:${C.text};">${tenantName}</strong> vencen en menos de 7 días. Una vez expirados, el acceso quedará suspendido — tus datos se conservan en todo momento.`
    : `Los siguientes módulos de <strong style="color:${C.text};">${tenantName}</strong> están próximos a vencer. Contáctanos para extender el período o activar un plan.`;

  const body = `
    ${h1(headline)}
    ${p(intro)}
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="margin:4px 0 20px;">
      ${rows}
    </table>
    ${urgent ? callout('Renueva antes de que expire para mantener el acceso sin interrupciones.', 'danger') : ''}
    ${btn(waUrl, 'Extender por WhatsApp')}
    ${hr()}
    ${p('También puedes responder este correo y nuestro equipo te contactará a la brevedad.', true)}`;

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
