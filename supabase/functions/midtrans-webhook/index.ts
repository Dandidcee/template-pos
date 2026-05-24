// Supabase Edge Function: Handle Midtrans Webhook Notification
// Deploy: supabase functions deploy midtrans-webhook
// URL: https://YOUR_PROJECT.supabase.co/functions/v1/midtrans-webhook

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.0";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL") || "";
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || "";

interface MidtransNotification {
  order_id: string;
  transaction_status: string;
  fraud_status?: string;
  payment_type: string;
  gross_amount: string;
  transaction_time: string;
  signature_key: string;
  transaction_id: string;
}

// Generate SHA512 signature for verification
async function generateSignature(
  order_id: string,
  status_code: string,
  gross_amount: string,
  server_key: string
): Promise<string> {
  const string = `${order_id}${status_code}${gross_amount}${server_key}`;
  const encoder = new TextEncoder();
  const data = encoder.encode(string);
  const hashBuffer = await crypto.subtle.digest("SHA-512", data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  const hashHex = hashArray.map((b) => b.toString(16).padStart(2, "0")).join("");
  return hashHex;
}

serve(async (req) => {
  // CORS Headers
  const corsHeaders = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type, Authorization",
  };

  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  // Only allow POST
  if (req.method !== "POST") {
    return new Response(
      JSON.stringify({ error: "Method not allowed" }),
      { status: 405, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }

  try {
    // Parse notification data
    const notification: MidtransNotification = await req.json();

    console.log("Midtrans Notification:", notification);

    // Validate required fields
    if (!notification.order_id || !notification.transaction_status) {
      return new Response(
        JSON.stringify({ error: "Invalid notification data" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Initialize Supabase client
    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    // Fetch Midtrans Server Key from database
    const { data: pengaturan, error: fetchSettingsError } = await supabase
      .from("pengaturan_rahasia")
      .select("midtrans_server_key")
      .eq("id", 1)
      .single();

    if (fetchSettingsError || !pengaturan || !pengaturan.midtrans_server_key) {
      console.error("Failed to fetch server key:", fetchSettingsError);
      return new Response(
        JSON.stringify({ error: "Configuration error" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const MIDTRANS_SERVER_KEY = pengaturan.midtrans_server_key;

    // Verify signature
    const expectedSignature = await generateSignature(
      notification.order_id,
      notification.transaction_status,
      notification.gross_amount,
      MIDTRANS_SERVER_KEY
    );

    if (notification.signature_key !== expectedSignature) {
      console.error("Invalid signature");
      return new Response(
        JSON.stringify({ error: "Invalid signature" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Determine final status
    let finalStatus = "pending";
    if (notification.transaction_status === "capture") {
      finalStatus = notification.fraud_status === "accept" ? "success" : "pending";
    } else if (notification.transaction_status === "settlement") {
      finalStatus = "success";
    } else if (
      notification.transaction_status === "cancel" ||
      notification.transaction_status === "deny" ||
      notification.transaction_status === "expire"
    ) {
      finalStatus = "failed";
    }

    // Get transaction from database
    const { data: transaction, error: fetchError } = await supabase
      .from("transaksi")
      .select("*")
      .eq("order_number", notification.order_id)
      .single();

    if (fetchError || !transaction) {
      console.error("Transaction not found:", fetchError);
      return new Response(
        JSON.stringify({ error: "Transaction not found" }),
        { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Update transaction status
    const { error: updateError } = await supabase
      .from("transaksi")
      .update({
        payment_status: finalStatus,
        midtrans_transaction_id: notification.transaction_id,
        midtrans_payment_type: notification.payment_type,
        midtrans_transaction_time: notification.transaction_time,
        midtrans_response: notification,
        updated_at: new Date().toISOString(),
      })
      .eq("order_number", notification.order_id);

    if (updateError) {
      console.error("Failed to update transaction:", updateError);
      return new Response(
        JSON.stringify({ error: "Failed to update transaction" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // If payment success AND previously was not success, update stock and points
    if (finalStatus === "success" && transaction.payment_status !== "success") {
      if (transaction.items) {
        for (const item of transaction.items) {
          if (item.id) {
            const { data: barang } = await supabase
              .from("barang")
              .select("stok")
              .eq("id", item.id)
              .single();

            if (barang && barang.stok !== null) {
              const newStok = Math.max(0, barang.stok - item.qty);
              await supabase.from("barang").update({ stok: newStok }).eq("id", item.id);
            }
          }
        }
      }

      // Update points if applicable
      if (transaction.pelanggan_id && (transaction.poin_didapat > 0 || transaction.poin_dipakai > 0)) {
        await supabase.rpc('proses_poin_pelanggan', {
          p_pelanggan_id: transaction.pelanggan_id,
          p_poin_didapat: transaction.poin_didapat || 0,
          p_poin_dipakai: transaction.poin_dipakai || 0
        });
      }
    }

    // Create notification for kasir
    if (transaction.kasir_id) {
      const rupiah = (num: number) =>
        new Intl.NumberFormat("id-ID", {
          style: "currency",
          currency: "IDR",
          minimumFractionDigits: 0,
        }).format(num);

      let notifMessage = "";
      if (finalStatus === "success") {
        notifMessage = `Pembayaran ${notification.order_id} sebesar ${rupiah(
          parseFloat(notification.gross_amount)
        )} berhasil via ${notification.payment_type}.`;
      } else if (finalStatus === "failed") {
        notifMessage = `Pembayaran ${notification.order_id} gagal atau dibatalkan.`;
      } else {
        notifMessage = `Pembayaran ${notification.order_id} menunggu konfirmasi.`;
      }

      await supabase.from("notifikasi").insert([
        {
          kasir_id: transaction.kasir_id,
          judul: finalStatus === "success" ? "Pembayaran Berhasil" : "Update Pembayaran",
          pesan: notifMessage,
          tipe: finalStatus === "success" ? "success" : "info",
          dibaca: false,
          created_at: new Date().toISOString(),
        },
      ]);
    }

    // Return success response
    return new Response(
      JSON.stringify({
        success: true,
        status: finalStatus,
        message: "Notification processed successfully",
      }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Webhook Error:", error);
    return new Response(
      JSON.stringify({
        error: error.message || "Internal server error",
      }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
