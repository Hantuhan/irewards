import { adminDb } from "@/lib/db/admin";

function db() {
  return adminDb();
}

export type MemberFeedbackRow = {
  id: string;
  merchant_id: string;
  customer_id: string;
  rating: number;
  source: string;
  note: string | null;
  created_at: string;
  customers?: {
    display_name: string | null;
    phone: string | null;
  } | null;
};

export async function recordMemberFeedback(input: {
  merchantId: string;
  customerId: string;
  rating: number;
  source?: string;
  note?: string | null;
}): Promise<void> {
  const { error } = await db()
    .from("member_feedback")
    .insert([
      {
        merchant_id: input.merchantId,
        customer_id: input.customerId,
        rating: input.rating,
        source: input.source ?? "whatsapp_review_reply",
        note: input.note ?? null,
      },
    ]);
  if (error) throw new Error(error.message);
}

export async function listRecentMemberFeedback(
  merchantId: string,
  limit = 20,
): Promise<MemberFeedbackRow[]> {
  const { data, error } = await db()
    .from("member_feedback")
    .select("id, merchant_id, customer_id, rating, source, note, created_at, customers(display_name, phone)")
    .eq("merchant_id", merchantId)
    .order("created_at", { ascending: false })
    .limit(limit);
  if (error) throw new Error(error.message);
  return (data ?? []).map((row) => {
    const customers = Array.isArray(row.customers) ? row.customers[0] ?? null : row.customers;
    return { ...row, customers } as MemberFeedbackRow;
  });
}
