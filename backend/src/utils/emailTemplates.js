// FB Core — Email Templates
// Versión mejorada: institucional SaaS B2B, compatible con email clients
// Compatible: Gmail, Outlook, Apple Mail, móvil

const C = {
  outerBg: '#F4F4F5',
  headerBg: '#0B0B0D',
  headerBg2: '#151517',
  headerAccent: '#F2B045',
  cardBg: '#FFFFFF',
  cardBorder: '#E4E4E7',
  divider: '#ECECEF',
  rowBg: '#FAFAFA',
  text: '#18181B',
  textSub: '#3F3F46',
  textMuted: '#71717A',
  textLight: '#A1A1AA',
  btnBg: '#18181B',
  btnText: '#FFFFFF',
  greenBg: '#F0FDF4',
  greenText: '#166534',
  amberBg: '#FFF7E6',
  amberText: '#A16207',
  redBg: '#FEF2F2',
  redText: '#B91C1C',
  blueBg: '#EEF2FF',
  blueText: '#3730A3',
  goldAlertBg: '#FFF9EC',
  goldAlertBorder: '#F2B045',
  goldAlertText: '#854D0E',
  redAlertBg: '#FFF1F2',
  redAlertBorder: '#EF4444',
  redAlertText: '#991B1B',
  blueAlertBg: '#F5F7FF',
  blueAlertBorder: '#6366F1',
  blueAlertText: '#3730A3',
};

const LOGO = 'https://api.fbcore.cloud/public/logo.png';
const BRAND_URL = 'https://fbcore.cloud';
const F = 'Inter, Arial, Helvetica, sans-serif';

function escapeHtml(value = '') {
  return String(value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function safeUrl(url = BRAND_URL) {
  const value = String(url || '').trim();
  if (!value) return BRAND_URL;
  if (/^(https?:|mailto:|tel:)/i.test(value)) return escapeHtml(value);
  return BRAND_URL;
}

function formatDays(days) {
  const n = Number(days || 0);
  return `${n} día${n === 1 ? '' : 's'}`;
}

function normalizeWhatsappNumber(number = '') {
  return String(number).replace(/[^0-9]/g, '');
}

function preheaderText(text = '') {
  if (!text) return '';
  return `<div style="display:none!important;visibility:hidden;opacity:0;color:transparent;height:0;width:0;max-height:0;max-width:0;overflow:hidden;mso-hide:all;font-size:1px;line-height:1px;">${escapeHtml(text)}&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;</div>`;
}

function base({ preheader = '', eyebrow = 'FB Core', body, footerNote = '' }) {
  const year = new Date().getFullYear();

  return `<!DOCTYPE html>
<html lang="es" xmlns="http://www.w3.org/1999/xhtml">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <meta http-equiv="X-UA-Compatible" content="IE=edge" />
  <meta name="format-detection" content="telephone=no,address=no,email=no,date=no,url=no" />
  <meta name="color-scheme" content="light" />
  <meta name="supported-color-schemes" content="light" />
  <title>FB Core</title>
  <style>
    body, table, td, a { -webkit-text-size-adjust:100%; -ms-text-size-adjust:100%; }
    table, td { mso-table-lspace:0pt; mso-table-rspace:0pt; border-collapse:collapse; }
    img { border:0; outline:none; text-decoration:none; -ms-interpolation-mode:bicubic; }
    body { margin:0!important; padding:0!important; width:100%!important; background:${C.outerBg}; }
    a { text-decoration:none; }
    @media only screen and (max-width:640px) {
      .outer-padding { padding:18px!important; }
      .brand-header { padding:28px 22px 24px!important; }
      .content-cell { padding:34px 24px!important; }
      .logo-img { width:122px!important; max-width:122px!important; }
      .h1 { font-size:24px!important; line-height:1.25!important; }
      .btn-td { display:block!important; width:100%!important; }
      .btn-a { display:block!important; text-align:center!important; padding-left:18px!important; padding-right:18px!important; }
      .mobile-stack { display:block!important; width:100%!important; text-align:left!important; padding-top:8px!important; }
    }
  </style>
</head>
<body style="margin:0;padding:0;background-color:${C.outerBg};">
  ${preheaderText(preheader)}
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background-color:${C.outerBg};">
    <tr>
      <td align="center" class="outer-padding" style="padding:42px 20px;">
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="width:100%;max-width:640px;">
          <tr>
            <td style="border:1px solid ${C.cardBorder};border-radius:14px;overflow:hidden;background:${C.cardBg};">
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">
                <tr>
                  <td align="center" class="brand-header" style="background-color:${C.headerBg};padding:34px 48px 30px;border-bottom:3px solid ${C.headerAccent};">
                    <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%">
                      <tr>
                        <td align="center">
                          <a href="${BRAND_URL}" target="_blank" style="display:inline-block;border:0;">
                            <img src="${LOGO}" width="138" alt="FB Core by FBSystems" class="logo-img" style="display:block;width:138px;max-width:138px;height:auto;border:0;" />
                          </a>
                        </td>
                      </tr>
                      <tr>
                        <td align="center" style="padding-top:18px;">
                          <span style="display:inline-block;font-family:${F};font-size:11px;font-weight:700;letter-spacing:1.8px;text-transform:uppercase;color:${C.headerAccent};">${escapeHtml(eyebrow)}</span>
                        </td>
                      </tr>
                    </table>
                  </td>
                </tr>
                <tr>
                  <td class="content-cell" style="background-color:${C.cardBg};padding:48px 54px;">
                    ${body}
                  </td>
                </tr>
              </table>
            </td>
          </tr>
          <tr>
            <td align="center" style="padding:28px 12px 0;">
              ${footerNote ? `<p style="margin:0 0 8px;font-family:${F};font-size:12px;line-height:1.6;color:${C.textMuted};">${footerNote}</p>` : ''}
              <p style="margin:0 0 5px;font-family:${F};font-size:12px;line-height:1.6;color:${C.textMuted};">
                &copy; ${year} <a href="https://fbsystems.cl" target="_blank" style="color:${C.textMuted};text-decoration:underline;">FBSystems SpA</a>
                &nbsp;&middot;&nbsp;
                <a href="${BRAND_URL}" target="_blank" style="color:${C.textMuted};text-decoration:underline;">fbcore.cloud</a>
              </p>
              <p style="margin:0;font-family:${F};font-size:11px;line-height:1.55;color:${C.textLight};">
                Este es un correo automático. No compartas enlaces de acceso, invitación o recuperación.
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

function h1(text) {
  return `<h1 class="h1" style="margin:0 0 16px;font-family:${F};font-size:26px;font-weight:800;letter-spacing:-0.7px;line-height:1.25;color:${C.text};">${text}</h1>`;
}

function p(text, muted = false) {
  return `<p style="margin:0 0 18px;font-family:${F};font-size:15px;line-height:1.75;color:${muted ? C.textMuted : C.textSub};">${text}</p>`;
}

function sectionLabel(text) {
  return `<p style="margin:0 0 12px;font-family:${F};font-size:11px;font-weight:800;letter-spacing:1px;text-transform:uppercase;color:${C.textMuted};">${escapeHtml(text)}</p>`;
}

function hr(space = 30) {
  return `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="margin:${space}px 0;">
    <tr><td style="border-top:1px solid ${C.divider};font-size:0;line-height:0;">&nbsp;</td></tr>
  </table>`;
}

function btn(href, label) {
  return `<table role="presentation" cellpadding="0" cellspacing="0" border="0" style="margin:26px 0 10px;">
    <tr>
      <td class="btn-td" bgcolor="${C.btnBg}" style="border-radius:8px;background-color:${C.btnBg};">
        <a class="btn-a" href="${safeUrl(href)}" target="_blank" style="display:inline-block;padding:15px 34px;font-family:${F};font-size:15px;font-weight:700;letter-spacing:-0.1px;line-height:1.2;color:${C.btnText};background-color:${C.btnBg};border-radius:8px;text-decoration:none;">
          ${escapeHtml(label)}
        </a>
      </td>
    </tr>
  </table>`;
}

function badge(text, type = 'green') {
  const map = {
    green: { bg: C.greenBg, color: C.greenText },
    amber: { bg: C.amberBg, color: C.amberText },
    red: { bg: C.redBg, color: C.redText },
    blue: { bg: C.blueBg, color: C.blueText },
  };
  const s = map[type] || map.green;
  return `<span style="display:inline-block;padding:5px 10px;border-radius:999px;font-family:${F};font-size:12px;font-weight:800;line-height:1.2;background-color:${s.bg};color:${s.color};white-space:nowrap;">${escapeHtml(text)}</span>`;
}

function alertBox(text, type = 'gold') {
  const map = {
    gold: { bg: C.goldAlertBg, border: C.goldAlertBorder, color: C.goldAlertText },
    red: { bg: C.redAlertBg, border: C.redAlertBorder, color: C.redAlertText },
    blue: { bg: C.blueAlertBg, border: C.blueAlertBorder, color: C.blueAlertText },
  };
  const s = map[type] || map.gold;

  return `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="margin:20px 0;">
    <tr>
      <td style="background-color:${s.bg};border-left:4px solid ${s.border};border-radius:8px;padding:15px 18px;">
        <p style="margin:0;font-family:${F};font-size:14px;font-weight:600;line-height:1.65;color:${s.color};">${text}</p>
      </td>
    </tr>
  </table>`;
}

function moduleList(rows) {
  if (!rows) return '';
  return `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="border:1px solid ${C.cardBorder};border-radius:10px;overflow:hidden;background-color:${C.cardBg};">
    ${rows}
  </table>`;
}

function moduleRow(name, statusHtml, last = false) {
  return `<tr>
    <td style="padding:15px 16px;background-color:${C.rowBg};${last ? '' : `border-bottom:1px solid ${C.divider};`}">
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">
        <tr>
          <td style="font-family:${F};font-size:14px;font-weight:700;line-height:1.4;color:${C.text};vertical-align:middle;">${escapeHtml(name)}</td>
          <td class="mobile-stack" align="right" style="font-family:${F};font-size:13px;line-height:1.4;color:${C.textMuted};vertical-align:middle;padding-left:16px;white-space:nowrap;">${statusHtml}</td>
        </tr>
      </table>
    </td>
  </tr>`;
}

function richName(text) {
  return `<strong style="color:${C.text};font-weight:800;">${escapeHtml(text)}</strong>`;
}

export function welcomeEmail({
  userName = 'Usuario',
  companyName = 'tu empresa',
  mandatoryModules = [],
  trialModules = [],
  appUrl = BRAND_URL,
  whatsappNumber = '56920023072',
}) {
  const waNumber = normalizeWhatsappNumber(whatsappNumber);
  const waText = encodeURIComponent(`Hola, acabo de crear mi empresa "${companyName}" en FB Core y necesito ayuda.`);
  const waUrl = `https://wa.me/${waNumber}?text=${waText}`;

  const includedRows = mandatoryModules.map((m, i) =>
    moduleRow(m, badge('Incluido', 'green'), i === mandatoryModules.length - 1 && trialModules.length === 0)
  );

  const trialRows = trialModules.map((m, i) =>
    moduleRow(m, badge('30 días de prueba', 'amber'), i === trialModules.length - 1)
  );

  const rows = [...includedRows, ...trialRows].join('');

  const modulesSection = rows
    ? `${hr()}
       ${sectionLabel('Módulos activados')}
       ${moduleList(rows)}
       ${trialModules.length ? alertBox('Los módulos de prueba tienen una duración de <strong>30 días</strong>. Contáctanos antes de que venzan para mantener el acceso.', 'gold') : ''}`
    : '';

  const body = `
    ${h1(`Hola, ${escapeHtml(userName)}`)}
    ${p(`Tu empresa ${richName(companyName)} ya está activa en FB Core. Puedes ingresar y comenzar a trabajar de inmediato.`)}
    ${btn(appUrl, 'Ingresar a FB Core')}
    ${modulesSection}
    ${hr()}
    <p style="margin:0;font-family:${F};font-size:14px;line-height:1.75;color:${C.textSub};">
      ¿Tienes preguntas o necesitas ayuda para comenzar?<br />
      <a href="${safeUrl(waUrl)}" target="_blank" style="color:${C.text};font-weight:800;text-decoration:none;">Escríbenos por WhatsApp &rarr;</a>
    </p>`;

  return {
    subject: `Bienvenido a FB Core — ${companyName}`,
    html: base({
      preheader: `${companyName} ya está activa. Ingresa y comienza a gestionar tu empresa.`,
      eyebrow: 'Cuenta activada',
      body,
      footerNote: 'Recibiste este correo porque creaste una cuenta en FB Core.',
    }),
  };
}

export function trialExpiryEmail({ tenantName = 'tu empresa', modules = [], waUrl = 'https://wa.me/56920023072' }) {
  const safeModules = Array.isArray(modules) ? modules : [];
  const days = safeModules.map((m) => Number(m.daysLeft || 0)).filter((n) => Number.isFinite(n));
  const minDays = days.length ? Math.min(...days) : 0;
  const urgent = minDays <= 7;

  const rows = safeModules.map((m, i) => {
    const d = Number(m.daysLeft || 0);
    const type = d <= 7 ? 'red' : 'amber';
    const label = d <= 7 ? `${formatDays(d)} · Urgente` : formatDays(d);
    return moduleRow(m.name || 'Módulo', badge(label, type), i === safeModules.length - 1);
  }).join('');

  const body = `
    ${h1(urgent ? 'Tu período de prueba vence pronto' : 'Tus módulos de prueba están por vencer')}
    ${p(urgent
      ? `Algunos módulos de ${richName(tenantName)} vencen en menos de 7 días. Una vez expirados, el acceso quedará suspendido, pero tus datos se conservarán en todo momento.`
      : `Algunos módulos de ${richName(tenantName)} están próximos a vencer. Puedes extender el acceso o activar un plan antes de la fecha de expiración.`
    )}
    ${rows ? moduleList(rows) : alertBox('No hay módulos próximos a vencer registrados para esta cuenta.', 'blue')}
    ${urgent
      ? alertBox('Renueva antes de que expire para mantener el acceso sin interrupciones.', 'red')
      : alertBox('Contáctanos antes de que venzan los módulos para mantener el acceso activo.', 'gold')
    }
    ${btn(waUrl, 'Extender por WhatsApp')}
    ${hr()}
    ${p('También puedes responder este correo y nuestro equipo te contactará a la brevedad.', true)}`;

  return {
    subject: urgent
      ? `Tu prueba vence en ${formatDays(minDays)} — FB Core`
      : 'Módulos de prueba por vencer — FB Core',
    html: base({
      preheader: urgent
        ? `Renueva ahora para mantener el acceso activo en ${tenantName}.`
        : `Tus módulos de prueba en ${tenantName} están próximos a vencer.`,
      eyebrow: urgent ? 'Aviso importante' : 'Recordatorio de prueba',
      body,
      footerNote: 'Recibes este correo porque eres administrador de la cuenta.',
    }),
  };
}

export function resetPasswordEmail({ name = 'Usuario', resetUrl = BRAND_URL }) {
  const body = `
    ${h1('Restablece tu contraseña')}
    ${p(`Hola ${richName(name)}, recibimos una solicitud para cambiar la contraseña de tu cuenta en FB Core.`)}
    ${p(`El enlace es válido por ${richName('1 hora')}. Si no hiciste esta solicitud, puedes ignorar este correo.`)}
    ${btn(resetUrl, 'Restablecer contraseña')}
    ${alertBox('Por seguridad, nunca compartas este enlace con otras personas.', 'blue')}
    ${hr()}
    <p style="margin:0;font-family:${F};font-size:13px;line-height:1.7;color:${C.textMuted};word-break:break-word;">
      Si el botón no funciona, copia este enlace en tu navegador:<br />
      <a href="${safeUrl(resetUrl)}" target="_blank" style="color:${C.textMuted};text-decoration:underline;word-break:break-all;">${escapeHtml(resetUrl)}</a>
    </p>`;

  return {
    subject: 'Restablecer contraseña — FB Core',
    html: base({
      preheader: 'Restablece tu contraseña de FB Core. El enlace expira en 1 hora.',
      eyebrow: 'Seguridad de cuenta',
      body,
      footerNote: 'Si no solicitaste este correo, puedes ignorarlo sin problema.',
    }),
  };
}

export function dailyAlertsEmail({ tenantName = 'tu empresa', date = '', alertItems = [], appUrl = BRAND_URL }) {
  const items = Array.isArray(alertItems) ? alertItems : [];
  const total = items.reduce((sum, i) => sum + Number(i.count || 0), 0);

  const rows = items.map((item, i) => {
    const count = Number(item.count || 0);
    const label = item.detail ? `${item.label} — ${item.detail}` : item.label;
    return moduleRow(label || 'Alerta', badge(String(count), count >= 5 ? 'red' : 'amber'), i === items.length - 1);
  }).join('');

  const body = `
    ${h1(`${total} elemento${total === 1 ? '' : 's'} requiere${total === 1 ? '' : 'n'} atención`)}
    ${p(`Resumen del ${richName(date || 'día')} para ${richName(tenantName)}.`)}
    ${rows ? moduleList(rows) : alertBox('No hay alertas pendientes para revisar hoy.', 'blue')}
    ${btn(appUrl, 'Revisar en FB Core')}
    ${hr()}
    ${p('Este resumen se envía automáticamente todos los días a las 09:00 h, hora Chile.', true)}`;

  return {
    subject: `${total} alerta${total === 1 ? '' : 's'} pendiente${total === 1 ? '' : 's'} — ${tenantName}`,
    html: base({
      preheader: `${total} elemento${total === 1 ? '' : 's'} requiere${total === 1 ? '' : 'n'} tu atención hoy en ${tenantName}.`,
      eyebrow: 'Resumen diario',
      body,
      footerNote: 'Recibes este resumen porque eres administrador de la cuenta.',
    }),
  };
}
