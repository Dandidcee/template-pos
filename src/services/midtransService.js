import { supabase } from "../lib/supabase";

// Get backend URL from env or fallback to Supabase Edge Functions URL
const BACKEND_URL = import.meta.env.VITE_BACKEND_URL || `${import.meta.env.VITE_SUPABASE_URL}/functions/v1`;
const CREATE_TOKEN_URL = `${BACKEND_URL}/midtrans-create-token`;

// ============================================
// CREATE SNAP TOKEN (via Backend API)
// ============================================
export async function createSnapToken(transactionData) {
  try {
    const {
      order_id,
      gross_amount,
      customer_details,
      item_details,
      enabled_payments = ["qris", "bank_transfer"],
    } = transactionData;

    // Validate required fields
    if (!order_id || !gross_amount) {
      throw new Error("order_id and gross_amount are required");
    }

    // Prepare request body
    const requestBody = {
      order_id,
      gross_amount: Math.round(gross_amount),
      customer_details: customer_details || {
        first_name: "Customer",
        email: "customer@example.com",
        phone: "08123456789",
      },
      item_details: item_details || [
        {
          id: "item-1",
          price: Math.round(gross_amount),
          quantity: 1,
          name: "Transaction",
        },
      ],
      enabled_payments,
    };

    // Call Backend API
    const response = await fetch(CREATE_TOKEN_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${import.meta.env.VITE_SUPABASE_ANON}`
      },
      body: JSON.stringify(requestBody),
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.error || "Failed to create Snap token");
    }

    const data = await response.json();
    return {
      success: true,
      token: data.token,
      redirect_url: data.redirect_url,
      order_id: data.order_id, // Return order_id yang mungkin sudah di-increment
    };
  } catch (error) {
    console.error("Midtrans createSnapToken error:", error);
    return {
      success: false,
      error: error.message,
    };
  }
}

// ============================================
// CANCEL TRANSACTION
// ============================================
export async function cancelTransaction(order_id) {
  try {
    if (!order_id) {
      throw new Error("order_id is required");
    }

    const CANCEL_URL = `${BACKEND_URL}/midtrans-cancel`; // Note: You'll need to create a cancel edge function if required

    const response = await fetch(CANCEL_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${import.meta.env.VITE_SUPABASE_ANON}`
      },
      body: JSON.stringify({ order_id }),
    });

    const data = await response.json();

    if (!response.ok) {
      // Jika error 404 atau 412, transaksi sudah tidak aktif, anggap sukses
      if (data.details?.status_code === '404' || data.details?.status_code === '412') {
        return {
          success: true,
          message: "Transaction already inactive",
        };
      }
      throw new Error(data.error || "Failed to cancel transaction");
    }

    return {
      success: true,
      message: data.message,
    };
  } catch (error) {
    console.error("Midtrans cancelTransaction error:", error);
    return {
      success: false,
      error: error.message,
    };
  }
}

// ============================================
// GET TRANSACTION STATUS (Optional - for manual check)
// ============================================
export async function getTransactionStatus(order_id) {
  try {
    // This can be called from Edge Function if needed
    // For now, we rely on webhook notifications
    console.log("Get transaction status:", order_id);
    return {
      success: true,
      message: "Use webhook for real-time status updates",
    };
  } catch (error) {
    console.error("Midtrans getTransactionStatus error:", error);
    return {
      success: false,
      error: error.message,
    };
  }
}

// ============================================
// HANDLE MIDTRANS NOTIFICATION (Webhook)
// Now handled by Backend API
// ============================================
export async function handleMidtransNotification(notificationData) {
  console.log("Webhook notification received:", notificationData);
  // This function is now handled by Backend: /api/midtrans/webhook
  // Keep this for reference or local testing
  return {
    success: true,
    message: "Webhook handled by Backend API",
  };
}

// ============================================
// LOAD SNAP SCRIPT
// ============================================
export async function loadSnapScript() {
  // Check if already loaded
  if (window.snap) {
    return window.snap;
  }

  // 1. Ambil pengaturan_rahasia dari database (bisa dibaca frontend karena kebijakan update=true/anon read diperbolehkan di edge function case, tapi kita gunakan supabase client)
  // Catatan: Jika read RLS ditutup, kita fallback ke .env dengan VITE_ prefix.
  let IS_PROD = import.meta.env.VITE_MIDTRANS_IS_PRODUCTION === "true" || false;
  
  try {
    const { data } = await supabase
      .from('pengaturan_rahasia')
      .select('midtrans_is_production')
      .eq('id', 1)
      .single();
      
    if (data && data.midtrans_is_production !== undefined) {
      IS_PROD = data.midtrans_is_production;
    }
  } catch (err) {
    console.warn("Gagal membaca status production dari DB, fallback ke env", err);
  }

  const CLIENT_KEY = import.meta.env.VITE_MIDTRANS_CLIENT_KEY || "";

  return new Promise((resolve, reject) => {
    const script = document.createElement("script");
    script.src = IS_PROD
      ? "https://app.midtrans.com/snap/snap.js"
      : "https://app.sandbox.midtrans.com/snap/snap.js";
    script.setAttribute("data-client-key", CLIENT_KEY);
    script.onload = () => resolve(window.snap);
    script.onerror = () => reject(new Error("Failed to load Snap script"));
    document.body.appendChild(script);
  });
}

// ============================================
// OPEN SNAP PAYMENT
// ============================================
export async function openSnapPayment(snapToken, callbacks = {}) {
  try {
    const snap = await loadSnapScript();

    snap.pay(snapToken, {
      onSuccess: (result) => {
        console.log("Payment success:", result);
        if (callbacks.onSuccess) callbacks.onSuccess(result);
      },
      onPending: (result) => {
        console.log("Payment pending:", result);
        if (callbacks.onPending) callbacks.onPending(result);
      },
      onError: (result) => {
        console.error("Payment error:", result);
        if (callbacks.onError) callbacks.onError(result);
      },
      onClose: () => {
        console.log("Payment popup closed");
        if (callbacks.onClose) callbacks.onClose();
      },
    });
  } catch (error) {
    console.error("openSnapPayment error:", error);
    throw error;
  }
}

// ============================================
// GET CLIENT KEY (for frontend)
// ============================================
export function getMidtransClientKey() {
  return import.meta.env.VITE_MIDTRANS_CLIENT_KEY || "";
}

// ============================================
// CHECK IF PRODUCTION MODE
// ============================================
export function isProductionMode() {
  return import.meta.env.MIDTRANS_IS_PRODUCTION === "true";
}
