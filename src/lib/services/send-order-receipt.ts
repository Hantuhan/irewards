import { getCustomerById, getMerchantById, getOrderById } from "@/lib/db/repository";
import { getOrderItems } from "@/lib/db/merchant-repository";
import { adminDb } from "@/lib/db/admin";
import { buildReceiptOrderFromDb } from "@/lib/receipt/build-order-from-db";
import type { ReceiptMerchant } from "@/lib/receipt/types";
import {
  deliverOrderReceipt,
  resolveReceiptDestination,
  type ReceiptDeliveryMethod,
} from "@/lib/services/receipt-delivery";

export async function sendOrderReceipt(input: {
  orderId: string;
  method: ReceiptDeliveryMethod;
  destination: string;
}) {
  const order = await getOrderById(input.orderId);
  if (!order) throw new Error("Order not found");
  if (order.status !== "paid") throw new Error("Receipt is available after payment");

  const merchant = await getMerchantById(order.merchant_id);
  if (!merchant) throw new Error("Merchant not found");

  const destination = resolveReceiptDestination({
    method: input.method,
    email: input.method === "email" ? input.destination : null,
    phone: input.method === "whatsapp" ? input.destination : null,
  });
  if (!destination) throw new Error("Invalid email or phone number");

  const items = await getOrderItems(order.id);
  let tableNumber: string | null = null;
  if (order.venue_table_id) {
    const { data: table } = await adminDb()
      .from("venue_tables")
      .select("table_number")
      .eq("id", order.venue_table_id)
      .single();
    tableNumber = (table as { table_number: string } | null)?.table_number ?? null;
  }

  const receiptItems = items.map((item) => ({
    name: item.name,
    quantity: item.quantity,
    unitPriceCents: item.unit_price_cents,
    modifiers: item.modifiers ?? null,
  }));

  const receiptOrder = buildReceiptOrderFromDb(
    order,
    merchant,
    receiptItems,
    order.id.slice(0, 8).toUpperCase(),
    tableNumber,
  );

  const receiptMerchant: ReceiptMerchant = {
    name: merchant.name,
    logoUrl: merchant.logo_url ?? null,
    address: merchant.address ?? null,
    landlineNumber: merchant.landline_number ?? null,
    registrationNumber: merchant.registration_number ?? null,
    sstNumber: merchant.sst_number ?? null,
    gstNumber: merchant.gst_number ?? null,
    receiptFooterText: merchant.receipt_footer_text ?? null,
    receiptShowRegistration: merchant.receipt_show_registration ?? true,
  };

  await deliverOrderReceipt({
    method: input.method,
    destination,
    merchant: receiptMerchant,
    order: receiptOrder,
    tableNumber,
  });

  const { error } = await adminDb()
    .from("orders")
    .update({
      receipt_requested: true,
      receipt_sent_at: new Date().toISOString(),
      receipt_delivery_method: input.method,
      receipt_destination: destination,
    })
    .eq("id", order.id);

  if (error) throw new Error(error.message);

  return { sentAt: new Date().toISOString(), destination, method: input.method };
}

export async function defaultReceiptDestinationForOrder(orderId: string) {
  const order = await getOrderById(orderId);
  if (!order?.customer_id) return null;
  const customer = await getCustomerById(order.customer_id);
  if (!customer) return null;
  if (customer.receipt_delivery_preference === "email" && customer.email) {
    return { method: "email" as const, destination: customer.email };
  }
  if (customer.phone) {
    return { method: "whatsapp" as const, destination: customer.phone };
  }
  if (customer.email) {
    return { method: "email" as const, destination: customer.email };
  }
  return null;
}
