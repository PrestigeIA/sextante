/**
 * Bilingual (PT + EN) password-reset email. The server doesn't know the
 * reader's language, so both versions are in one message, Portuguese first.
 */

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

export function buildResetPasswordEmail(url: string): {
  subject: string;
  html: string;
  text: string;
} {
  const safeUrl = escapeHtml(url);
  const subject = "Redefinir sua senha do Sextante / Reset your Sextante password";

  const text = [
    "Sextante — redefinição de senha",
    "",
    "Recebemos um pedido para redefinir a senha da sua conta. Abra o link abaixo para criar uma nova senha. O link vale por 1 hora e só pode ser usado uma vez:",
    url,
    "",
    "Se você não pediu isso, ignore este e-mail. Sua senha continua a mesma.",
    "",
    "----",
    "",
    "Sextante — password reset",
    "",
    "We received a request to reset your account password. Open the link below to choose a new one. It is valid for 1 hour and can be used once:",
    url,
    "",
    "If you didn't ask for this, ignore this email. Your password stays the same.",
  ].join("\n");

  const button = (label: string) =>
    `<p style="margin:20px 0"><a href="${safeUrl}" style="background:#264a44;color:#ffffff;text-decoration:none;padding:12px 22px;border-radius:8px;font-weight:600;display:inline-block">${label}</a></p>`;

  const html = `<!doctype html>
<html lang="pt-BR"><body style="margin:0;padding:24px;background:#f4f5f4;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;color:#1a1a1a">
<div style="max-width:520px;margin:0 auto;background:#ffffff;border-radius:12px;padding:28px">
<h1 style="font-size:20px;margin:0 0 12px">Sextante — redefinição de senha</h1>
<p style="line-height:1.5;margin:0">Recebemos um pedido para redefinir a senha da sua conta. Toque no botão para criar uma nova senha. O link vale por 1 hora e só pode ser usado uma vez.</p>
${button("Criar nova senha")}
<p style="line-height:1.5;margin:0;color:#555;font-size:14px">Se você não pediu isso, ignore este e-mail. Sua senha continua a mesma.</p>
<hr style="border:none;border-top:1px solid #e3e5e3;margin:24px 0">
<h2 style="font-size:16px;margin:0 0 12px">Sextante — password reset</h2>
<p style="line-height:1.5;margin:0">We received a request to reset your account password. Tap the button to choose a new one. The link is valid for 1 hour and can be used once.</p>
${button("Choose a new password")}
<p style="line-height:1.5;margin:0;color:#555;font-size:14px">If you didn't ask for this, ignore this email. Your password stays the same.</p>
<p style="line-height:1.5;margin:20px 0 0;color:#777;font-size:12px;word-break:break-all">${safeUrl}</p>
</div></body></html>`;

  return { subject, html, text };
}
