export default async function handler(req, res) {
  // CORS
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");
  if (req.method === "OPTIONS") return res.status(200).end();
  if (req.method !== "POST") return res.status(405).json({ error: "POST only" });

  var body = req.body;
  if (!body || !body.to || !body.subject || !body.html) {
    return res.status(400).json({ error: "Champs manquants: to, subject, html" });
  }

  // Clé Brevo uniquement depuis les variables d'environnement Vercel (sécurisé)
  var apiKey = process.env.BREVO_API_KEY || "";
  if (!apiKey) {
    return res.status(500).json({ error: "BREVO_API_KEY non configurée sur Vercel" });
  }

  var senderEmail = body.senderEmail || "laoussine.tatah@lab-learning.fr";
  var senderName = body.senderName || "Lab Learning";

  var brevoPayload = {
    sender: { name: senderName, email: senderEmail },
    to: [{ email: body.to, name: body.toName || "" }],
    subject: body.subject,
    htmlContent: body.html
  };

  if (body.cc) {
    brevoPayload.cc = [{ email: body.cc }];
  }

  try {
    var response = await fetch("https://api.brevo.com/v3/smtp/email", {
      method: "POST",
      headers: {
        "api-key": apiKey,
        "Content-Type": "application/json",
        "Accept": "application/json"
      },
      body: JSON.stringify(brevoPayload)
    });

    var result = await response.json();

    if (!response.ok) {
      return res.status(response.status).json({
        error: result.message || "Erreur Brevo",
        code: result.code || response.status
      });
    }

    return res.status(200).json({ success: true, messageId: result.messageId || null });
  } catch (err) {
    return res.status(500).json({ error: err.message || "Erreur serveur" });
  }
}
