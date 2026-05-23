// FB Core — Email Templates
// Design: institutional SaaS B2B — dark header + light card, gold accent
// Compatible: Gmail, Outlook, Apple Mail, mobile

const C = {
  outerBg:         '#F4F4F5',
  headerBg:        '#000000',
  headerAccent:    '#F2B045',
  cardBg:          '#FFFFFF',
  cardBorder:      '#E4E4E7',
  divider:         '#F0F0F0',
  text:            '#18181B',
  textSub:         '#3F3F46',
  textMuted:       '#71717A',
  textLight:       '#A1A1AA',
  btnBg:           '#131316',
  btnText:         '#FFFFFF',
  // Status badges
  greenBg:         '#F0FDF4',
  greenText:       '#15803D',
  amberBg:         '#FEF9EC',
  amberText:       '#B45309',
  redBg:           '#FEF2F2',
  redText:         '#B91C1C',
  // Alerts
  goldAlertBg:     '#FFFDF7',
  goldAlertBorder: '#F2B045',
  goldAlertText:   '#92400E',
  redAlertBg:      '#FFF5F5',
  redAlertBorder:  '#EF4444',
  redAlertText:    '#991B1B',
  blueAlertBg:     '#F8F9FF',
  blueAlertBorder: '#6366F1',
  blueAlertText:   '#3730A3',
};

const LOGO   = 'https://api.fbcore.cloud/public/logo.png';
const F      = `Inter, Arial, Helvetica, sans-serif`;

// ─── Base layout ──────────────────────────────────────────────────────────────

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
    @media only screen and (max-width:640px){
      .ow{padding:16px!important;}
      .hc{padding:28px 24px!important;}
      .cc{padding:36px 24px!important;}
      .btn-td{display:block!important;width:100%!important;}
      .btn-a{display:block!important;text-align:center!important;}
      .logo-img{max-width:110px!important;width:110px!important;}
    }
  </style>
</head>
<body style="margin:0;padding:0;background-color:${C.outerBg};">
  ${preheader ? `<div style="display:none;max-height:0;overflow:hidden;font-size:1px;line-height:1px;color:${C.outerBg};">${preheader}&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;</div>` : ''}

  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background-color:${C.outerBg};">
    <tr>
      <td align="center" style="padding:44px 20px;" class="ow">
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="max-width:620px;width:100%;">

          <!-- ── Card wrapper (header + content, clipped to rounded corners) -->
          <tr>
            <td style="border-radius:10px;overflow:hidden;border:1px solid ${C.cardBorder};">
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">

                <!-- Dark header -->
                <tr>
                  <td align="center" style="background-color:${C.headerBg};padding:32px 52px;border-bottom:2px solid ${C.headerAccent};" class="hc">
                    <a href="https://fbcore.cloud" style="text-decoration:none;border:0;display:inline-block;">
                      <img src="${LOGO}" alt="FB Core" width="130" height="auto" class="logo-img"
                        style="display:block;max-width:130px;height:auto;border:0;" />
                    </a>
                  </td>
                </tr>

                <!-- White content -->
                <tr>
                  <td style="background-color:${C.cardBg};padding:48px 52px;" class="cc">
                    ${body}
                  </td>
                </tr>

              </table>
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="padding:28px 8px 4px;text-align:center;">
              ${footerNote ? `<p style="margin:0 0 8px;font-size:12px;color:${C.textMuted};line-height:1.6;font-family:${F};">${footerNote}</p>` : ''}
              <p style="margin:0 0 5px;font-size:12px;color:${C.textMuted};line-height:1.6;font-family:${F};">
                &copy; ${year}&nbsp;
                <a href="https://fbsystems.cl" style="color:${C.textMuted};text-decoration:underline;">FBSystems SpA</a>
                &nbsp;&middot;&nbsp;
                <a href="https://fbcore.cloud" style="color:${C.textMuted};text-decoration:underline;">fbcore.cloud</a>
              </p>
              <p style="margin:0;font-size:11px;color:${C.textLight};line-height:1.5;font-family:${F};">
                Este es un correo autom&aacute;tico. No compartas enlaces de acceso o recuperaci&oacute;n.
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

// ─── Components ───────────────────────────────────────────────────────────────

function h1(text) {
  return `<h1 style="margin:0 0 14px;font-size:22px;font-weight:700;color:${C.text};letter-spacing:-0.4px;line-height:1.3;font-family:${F};">${text}</h1>`;
}

function sectionLabel(text) {
  return `<p style="margin:0 0 10px;font-size:11px;font-weight:700;letter-spacing:0.8px;text-transform:uppercase;color:${C.textMuted};font-family:${F};">${text}</p>`;
}

function p(text, muted = false) {
  return `<p style="margin:0 0 18px;font-size:15px;color:${muted ? C.textMuted : C.textSub};line-height:1.75;font-family:${F};">${text}</p>`;
}

function hr() {
  return `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="margin:28px 0;">
    <tr><td style="border-top:1px solid ${C.divider};font-size:0;line-height:0;">&nbsp;</td></tr>
  </table>`;
}

function btn(href, label) {
  return `<table role="presentation" cellpadding="0" cellspacing="0" border="0" style="margin:24px 0 8px;">
    <tr>
      <td style="border-radius:6px;background-color:${C.btnBg};" class="btn-td">
        <a href="${href}" class="btn-a"
          style="display:inline-block;padding:14px 36px;font-size:15px;font-weight:600;color:${C.btnText};text-decoration:none;letter-spacing:-0.1px;font-family:${F};border-radius:6px;">
          ${label}
        </a>
      </td>
    </tr>
  </table>`;
}

function badge(text, type = 'green') {
  const s = {
    green: { bg: C.greenBg, color: C.greenText },
    amber: { bg: C.amberBg, color: C.amberText },
    red:   { bg: C.redBg,   color: C.redText   },
  }[type] || { bg: C.greenBg, color: C.greenText };
  return `<span style="display:inline-block;padding:3px 10px;border-radius:4px;font-size:12px;font-weight:600;background-color:${s.bg};color:${s.color};font-family:${F};">${text}</span>`;
}

function alertBox(text, type = 'gold') {
  const s = {
    gold: { bg: C.goldAlertBg, border: C.goldAlertBorder, color: C.goldAlertText },
    red:  { bg: C.redAlertBg,  border: C.redAlertBorder,  color: C.redAlertText  },
    blue: { bg: C.blueAlertBg, border: C.blueAlertBorder, color: C.blueAlertText },
  }[type] || { bg: C.goldAlertBg, border: C.goldAlertBorder, color: C.goldAlertText };
  return `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="margin:18px 0;">
    <tr>
      <td style="background-color:${s.bg};border-left:3px solid ${s.border};border-radius:0 6px 6px 0;padding:13px 18px;">
        <p style="margin:0;font-size:14px;color:${s.color};line-height:1.65;font-family:${F};">${text}</p>
      </td>
    </tr>
  </table>`;
}

function moduleList(rows) {
  return `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0"
    style="border:1px solid ${C.cardBorder};border-radius:6px;overflow:hidden;margin:4px 0;">
    ${rows}
  </table>`;
}

function moduleRow(name, badgeHtml, last = false) {
  return `<tr>
    <td style="background-color:#FAFAFA;padding:12px 16px;${last ? '' : `border-bottom:1px solid ${C.divider};`}font-family:${F};">
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">
        <tr>
          <td style="font-size:14px;color:${C.text};font-weight:500;vertical-align:middle;">${name}</td>
          <td style="text-align:right;vertical-align:middle;padding-left:12px;white-space:nowrap;">${badgeHtml}</td>
        </tr>
      </table>
    </td>
  </tr>`;
}

// ─── 1. Welcome / Account Activated ──────────────────────────────────────────

export function welcomeEmail({ userName, companyName, mandatoryModules = [], trialModules = [], appUrl, whatsappNumber }) {
  const waText = encodeURIComponent(`Hola, acabo de crear mi empresa "${companyName}" en FB Core y tengo preguntas.`);
  const waUrl  = `https://wa.me/${whatsappNumber}?text=${waText}`;

  const allRows = [
    ...mandatoryModules.map((m, i) =>
      moduleRow(m, badge('Incluido', 'green'),
        i === mandatoryModules.length - 1 && trialModules.length === 0)),
    ...trialModules.map((m, i) =>
      moduleRow(m, badge('30 días de prueba', 'amber'), i === trialModules.length - 1)),
  ].join('');

  const modulesSection = allRows ? `
    ${hr()}
    ${sectionLabel('Módulos activados')}
    ${moduleList(allRows)}
    ${trialModules.length ? alertBox(
      `Los módulos de prueba tienen una duración de <strong>30 días</strong>. Contáctanos antes de que venzan para mantener el acceso.`,
      'gold'
    ) : ''}` : '';

  const body = `
    ${h1(`Hola, ${userName}`)}
    ${p(`Tu empresa <strong style="color:${C.text};font-weight:600;">${companyName}</strong> ya está activa en FB Core. Puedes ingresar y comenzar a trabajar de inmediato.`)}
    ${btn(appUrl, 'Ingresar a FB Core')}
    ${modulesSection}
    ${hr()}
    <p style="margin:0;font-size:14px;color:${C.textSub};line-height:1.75;font-family:${F};">
      &iquest;Tienes preguntas o necesitas ayuda para comenzar?<br>
      <a href="${waUrl}" style="color:${C.text};font-weight:600;text-decoration:none;">Esc&iacute;benos por WhatsApp &rarr;</a>
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

// ─── 2. Trial Expiry Warning ──────────────────────────────────────────────────

export function trialExpiryEmail({ tenantName, modules = [], waUrl }) {
  const urgent  = modules.some(m => m.daysLeft <= 7);
  const minDays = Math.min(...modules.map(m => m.daysLeft));

  const rows = modules.map((m, i) => {
    const isUrgent = m.daysLeft <= 7;
    const label    = isUrgent
      ? `${m.daysLeft} día${m.daysLeft !== 1 ? 's' : ''} — Urgente`
      : `${m.daysLeft} día${m.daysLeft !== 1 ? 's' : ''}`;
    return moduleRow(m.name, badge(label, isUrgent ? 'red' : 'amber'), i === modules.length - 1);
  }).join('');

  const body = `
    ${h1(urgent ? 'Tu período de prueba vence pronto' : 'Recordatorio de módulos en prueba')}
    ${p(urgent
      ? `Algunos módulos de <strong style="color:${C.text};font-weight:600;">${tenantName}</strong> vencen en menos de 7 días. Una vez expirados, el acceso quedará suspendido — tus datos se conservan en todo momento.`
      : `Los siguientes módulos de <strong style="color:${C.text};font-weight:600;">${tenantName}</strong> están próximos a vencer. Contáctanos para extender el período o activar un plan.`
    )}
    ${moduleList(rows)}
    ${urgent
      ? alertBox('Renueva antes de que expire para mantener el acceso sin interrupciones.', 'red')
      : alertBox('Contáctanos antes de que venzan los módulos para no perder el acceso.', 'gold')
    }
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

// ─── 3. Reset Password ────────────────────────────────────────────────────────

export function resetPasswordEmail({ name, resetUrl }) {
  const body = `
    ${h1('Restablece tu contraseña')}
    ${p(`Hola <strong style="color:${C.text};font-weight:600;">${name}</strong>, recibimos una solicitud para cambiar la contraseña de tu cuenta en FB Core.`)}
    ${p(`El enlace es válido por <strong style="color:${C.text};font-weight:600;">1 hora</strong>. Si no hiciste esta solicitud, puedes ignorar este correo tranquilamente.`)}
    ${btn(resetUrl, 'Restablecer contraseña')}
    ${alertBox('Por seguridad, nunca compartas este enlace con otras personas.', 'blue')}
    ${hr()}
    <p style="margin:0;font-size:13px;color:${C.textMuted};line-height:1.7;word-break:break-all;font-family:${F};">
      Si el bot&oacute;n no funciona, copia este enlace en tu navegador:<br>
      <a href="${resetUrl}" style="color:${C.textMuted};text-decoration:underline;">${resetUrl}</a>
    </p>`;

  return {
    subject: 'Restablecer contraseña — FB Core',
    html: base({
      preheader: 'Restablece tu contraseña de FB Core. El enlace expira en 1 hora.',
      body,
      footerNote: 'Si no solicitaste este correo, puedes ignorarlo.',
    }),
  };
}

// ─── 4. Daily Alerts ──────────────────────────────────────────────────────────

export function dailyAlertsEmail({ tenantName, date, alertItems = [] }) {
  const total = alertItems.reduce((sum, i) => sum + (i.count || 0), 0);

  const rows = alertItems.map((item, i) => {
    const isHigh = item.count >= 5;
    const name   = item.detail
      ? `${item.label} <span style="font-size:13px;color:${C.textMuted};font-weight:400;">— ${item.detail}</span>`
      : item.label;
    return moduleRow(name, badge(String(item.count), isHigh ? 'red' : 'amber'), i === alertItems.length - 1);
  }).join('');

  const body = `
    ${h1(`${total} elemento${total !== 1 ? 's' : ''} requiere${total !== 1 ? 'n' : ''} atención`)}
    ${p(`Resumen del <strong style="color:${C.text};font-weight:600;">${date}</strong> para <strong style="color:${C.text};font-weight:600;">${tenantName}</strong>.`)}
    ${moduleList(rows)}
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
