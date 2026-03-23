// ══════════════════════════════════════════════════════════
// LAB LEARNING — Email Service
// Calls /api/send-email (Vercel serverless → Brevo)
// ══════════════════════════════════════════════════════════

var API_URL = "/api/send-email";

export async function sendEmail(options) {
  var senderEmail = localStorage.getItem("ll_brevo_email") || "laoussine.tatah@lab-learning.fr";
  var senderName = localStorage.getItem("ll_brevo_name") || "Lab Learning";
  var apiKey = localStorage.getItem("ll_brevo_key") || "";

  if (!options.to) throw new Error("Destinataire requis");
  if (!options.subject) throw new Error("Objet requis");
  if (!options.html) throw new Error("Contenu HTML requis");

  var payload = {
    to: options.to,
    toName: options.toName || "",
    subject: options.subject,
    html: options.html,
    senderEmail: senderEmail,
    senderName: senderName,
    apiKey: apiKey,
    cc: options.cc || ""
  };

  var response = await fetch(API_URL, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload)
  });

  var result = await response.json();

  if (!response.ok) {
    throw new Error(result.error || "Erreur envoi email (" + response.status + ")");
  }

  return result;
}

export function buildEmailHTML(template, variables) {
  var html = template;
  if (variables) {
    Object.keys(variables).forEach(function(key) {
      var regex = new RegExp("\\{\\{" + key + "\\}\\}", "g");
      html = html.replace(regex, variables[key] || "");
    });
  }
  return html;
}
