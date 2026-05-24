// Supabase Edge Function: Create Midtrans Snap Token
// Deploy: supabase functions deploy midtrans-create-token
// URL: https://YOUR_PROJECT.supabase.co/functions/v1/midtrans-create-token

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.0";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL") || "";
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || "";

// Initialize Supabase client with Service Role to bypass RLS
const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

interface TransactionRequest {
  order_id: string;
  gross_amount: number;
  customer_details?: {
    first_name: string;
    email: string;
    phone: string;
  };
  item_details?: Array<{
    id: string;
    price: number;
    quantity: number;
    name: string;
  }>;
  enabled_payments?: string[];
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
    // Parse request body
    const body: TransactionRequest = await req.json();

    // Validate required fields
    if (!body.order_id || !body.gross_amount) {
      return new Response(
        JSON.stringify({ error: "order_id and gross_amount are required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Fetch Midtrans Server Key from database
    const { data: pengaturan, error: fetchError } = await supabase
      .from("pengaturan_rahasia")
      .select("midtrans_server_key, midtrans_is_production")
      .eq("id", 1)
      .single();

    if (fetchError || !pengaturan) {
      console.error("Failed to fetch settings:", fetchError);
      return new Response(
        JSON.stringify({ error: "Failed to fetch configuration" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const MIDTRANS_SERVER_KEY = pengaturan.midtrans_server_key;
    const IS_PRODUCTION = pengaturan.midtrans_is_production;

    if (!MIDTRANS_SERVER_KEY) {
      return new Response(
        JSON.stringify({ error: "MIDTRANS_SERVER_KEY not configured in database" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const SNAP_API_URL = IS_PRODUCTION
      ? "https://app.midtrans.com/snap/v1/transactions"
      : "https://app.sandbox.midtrans.com/snap/v1/transactions";

    // Prepare request body for Midtrans
    const requestBody = {
      transaction_details: {
        order_id: body.order_id,
        gross_amount: Math.round(body.gross_amount),
      },
      customer_details: body.customer_details || {
        first_name: "Customer",
        email: "customer@example.com",
        phone: "08123456789",
      },
      item_details: body.item_details || [
        {
          id: "item-1",
          price: Math.round(body.gross_amount),
          quantity: 1,
          name: "Transaction",
        },
      ],
      enabled_payments: body.enabled_payments || ["qris", "bank_transfer"],
      callbacks: {
        finish: `${req.headers.get("origin") || ""}/payment/success`,
        unfinish: `${req.headers.get("origin") || ""}/payment/pending`,
        error: `${req.headers.get("origin") || ""}/payment/error`,
      },
    };

    // Create authorization header (Base64 encode of Server Key)
    const authString = btoa(MIDTRANS_SERVER_KEY + ":");

    // Call Midtrans Snap API
    const response = await fetch(SNAP_API_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Basic ${authString}`,
        "Accept": "application/json",
      },
      body: JSON.stringify(requestBody),
    });

    if (!response.ok) {
      const errorData = await response.json();
      console.error("Midtrans API Error:", errorData);
      return new Response(
        JSON.stringify({
          error: errorData.error_messages?.[0] || "Failed to create Snap token",
          details: errorData,
        }),
        { status: response.status, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const data = await response.json();

    // Return success response
    return new Response(
      JSON.stringify({
        success: true,
        token: data.token,
        redirect_url: data.redirect_url,
      }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Edge Function Error:", error);
    return new Response(
      JSON.stringify({
        error: error.message || "Internal server error",
      }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
