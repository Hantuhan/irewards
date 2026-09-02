export type DeepseekMessage = {
  role: "system" | "user" | "assistant";
  content: string;
};

export function isDeepseekConfigured(): boolean {
  return Boolean(process.env.DEEPSEEK_API_KEY?.trim());
}

export async function deepseekChat(
  messages: DeepseekMessage[],
  options?: { temperature?: number; json?: boolean },
): Promise<string | null> {
  const apiKey = process.env.DEEPSEEK_API_KEY?.trim();
  if (!apiKey) return null;

  const base = (process.env.DEEPSEEK_API_BASE ?? "https://api.deepseek.com").replace(/\/$/, "");
  const model = process.env.DEEPSEEK_MODEL ?? "deepseek-chat";

  const response = await fetch(`${base}/v1/chat/completions`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model,
      messages,
      temperature: options?.temperature ?? 0.6,
      ...(options?.json ? { response_format: { type: "json_object" } } : {}),
    }),
  });

  if (!response.ok) {
    const errText = await response.text();
    throw new Error(`DeepSeek error ${response.status}: ${errText.slice(0, 200)}`);
  }

  const data = (await response.json()) as {
    choices?: { message?: { content?: string } }[];
  };
  return data.choices?.[0]?.message?.content?.trim() ?? null;
}

export function parseJsonFromModel<T>(text: string): T | null {
  try {
    return JSON.parse(text) as T;
  } catch {
    const match = text.match(/\{[\s\S]*\}/);
    if (!match) return null;
    try {
      return JSON.parse(match[0]) as T;
    } catch {
      return null;
    }
  }
}
