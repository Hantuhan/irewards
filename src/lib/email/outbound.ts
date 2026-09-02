export async function sendEmailMessage(input: {
  to: string;
  subject: string;
  text: string;
  html?: string;
  from?: string;
}) {
  const from = input.from ?? process.env.EMAIL_FROM ?? "receipts@irewards.app";

  if (process.env.PAYMENT_PROVIDER === "dev" || process.env.EMAIL_SKIP_SEND === "true") {
    console.info("[email:dev] →", input.to);
    console.info("[email:dev] subject:", input.subject);
    console.info("[email:dev] body:\n", input.text);
    return { id: "dev-email" };
  }

  const apiKey = process.env.RESEND_API_KEY?.trim();
  if (apiKey) {
    const response = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from,
        to: [input.to],
        subject: input.subject,
        text: input.text,
        html: input.html,
      }),
    });
    if (!response.ok) {
      const err = await response.text();
      throw new Error(`Email send failed: ${err.slice(0, 200)}`);
    }
    return (await response.json()) as { id: string };
  }

  throw new Error("Email is not configured. Set RESEND_API_KEY or use dev mode.");
}
