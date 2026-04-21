import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { encodeBase64Url } from "https://deno.land/std@0.220.0/encoding/base64url.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const SERVICE_ACCOUNT = {
  project_id: "timetrade-81620",
  private_key_id: "49014ee32fc2fa8af0772f92e2e99d504eea000b",
  private_key: `-----BEGIN PRIVATE KEY-----
MIIEvQIBADANBgkqhkiG9w0BAQEFAASCBKcwggSjAgEAAoIBAQC4QMENFVf5AKqb
qAxAL9+h5AtEXf+0ABq/WFOfm1POYeMNnIYcAUrtw3TIz+hlS2H8ntYWDpBxPzgs
BO/KVssKbTl7oRSExgp+jPm7kup9S0R98pLEbHhjP/0z1aPQ00r6wtoY8OfVQKDu
a3sbvjxmo275ccJO3vq4dRLGFAO4m4VFzdadRDiCYeOAnVn4EcaFoDsmopBT/uHY
wTe0aMm6PGsrYyhG+LDqltkgphSkCiNaswiVVDiT7gJz0Dz2+jVltlcatKiMDEjp
BI3r3mHKcZFniWQiNd2H6ccFI1A6yisickBdqDFRXlgtMOp2AsZINAraXyJQNVG0
CBmwaVVlAgMBAAECggEAA8OYOLGzwzZPG0XywMmZlR+TrAO1lRJJeZjkKxxhDmlz
2ikqmN4yjyqRM1xX9YsgMdPMMNV/AD6X4az/ebqN2aUt6ZzP+VRoY3nIIkZX5v5c
zwE1HAZ768nOB5COO6u4BOkVITGkCCMSsTwzNCJjQ9TZOrGnFAsRw9HpyRp15wAG
zVIk4snONWdWITPpSXMzlxf/9g3VoMqhsgEMwkv1+HFhiPmjcy2GAZdvyxNIOy2J
y2SlMvdOVDwnNBaJcZ1YLeh4lPbIXUFJKqEoTJ5ZfZXrRzWemA0HlIVKWMxN4k7/
dtj/ePRJpSEsMH6Ogqro5x6OQlPRm0Pdg9ZVPHsWAQKBgQDdtGV0vJD4iKhEE4Z2
U8BUFINlVrp4w6mLEGlZSi8ZBLpduuFUsjo0pwrdh5vqWJObGNwE7G1q0kXHIUaS
oz8sOvkvyCrrW1+fyHiZTgIxYzM7tE4JYWzQ5CeRwTrcK4VWDm6+mMjDTvbVIWta
O467oyw2TW2MeZTc+GK0G3toZQKBgQDUwUCyxeTerDZRZ4lUxRTLI6ek4jTUGxpi
e/igjjoFh5T8k5/9C5ZDlGBYTRUiFJDUPrJIur869k6xYZDMPPQGN/eqiaH98JcJ
czcqvYp1D36r6W2NnVLrZCRTJBsvZKrSv9sp8s8wjQDuB1OqEA0wNkubJVL8+xb8
Oy5it6LpAQKBgQCJG9FKunslWM5HG5QihXUCCpWgDFzR5p9pg0LDl58857Gh2bsU
uAxLF6seiYkhCppuZpda7CRW1aeVmLyeXxrobahBppb0atPeawo6NQYiKOk8WSuR
nZDANvlJqKiQFNInAFH4yWAPeTwpXruXWBHTdPwYsRW4tFAdv/a6z+woCQKBgDR7
w+EWDmKb6v5j4y3lPD7secOkBdI5KWYYHPpGe6u3iZpRNItw202qgaXmxgrVNfEV
0lc8skXyUvFRFy467xvFnLQWJb8GJcwv/vDtNwWvn9j6yYrAv57P4mIcKxSi6bz5
lTAg9NmOPyd46TuvoAE/s6D/MRy1ODNayhOSJ38BAoGADEPi79oexUn+i2BfJEWz
E/MVss+tOnFJwI5bS1n2jFb90Cp4CWs2ukDI7fmVPxQ6D9CmPQTXq6rWG5QBiLjm
o/UvJ6whrzQXLMBGjq/06JQOIOOpYe5cWakFQXLcl4Wwp9gbGrX3NP+SK1LDkSM0
XTtbf9TLXulLQTtYwRhar24=
-----END PRIVATE KEY-----`,
  client_email: "firebase-adminsdk-fbsvc@timetrade-81620.iam.gserviceaccount.com",
  token_uri: "https://oauth2.googleapis.com/token",
};

async function getAccessToken(): Promise<string> {
  const now = Math.floor(Date.now() / 1000);
  const header = { alg: "RS256", typ: "JWT" };
  const payload = {
    iss: SERVICE_ACCOUNT.client_email,
    scope: "https://www.googleapis.com/auth/firebase.messaging",
    aud: SERVICE_ACCOUNT.token_uri,
    iat: now,
    exp: now + 3600,
  };

  const enc = new TextEncoder();
  const headerB64 = encodeBase64Url(enc.encode(JSON.stringify(header)));
  const payloadB64 = encodeBase64Url(enc.encode(JSON.stringify(payload)));
  const unsignedToken = `${headerB64}.${payloadB64}`;

  // Import private key
  const pemContents = SERVICE_ACCOUNT.private_key
    .replace(/-----BEGIN PRIVATE KEY-----/, "")
    .replace(/-----END PRIVATE KEY-----/, "")
    .replace(/\n/g, "");
  const binaryKey = Uint8Array.from(atob(pemContents), (c) => c.charCodeAt(0));

  const cryptoKey = await crypto.subtle.importKey(
    "pkcs8",
    binaryKey,
    { name: "RSASSA-PKCS1-v1_5", hash: "SHA-256" },
    false,
    ["sign"]
  );

  const signature = await crypto.subtle.sign(
    "RSASSA-PKCS1-v1_5",
    cryptoKey,
    enc.encode(unsignedToken)
  );
  const signatureB64 = encodeBase64Url(new Uint8Array(signature));
  const jwt = `${unsignedToken}.${signatureB64}`;

  // Exchange JWT for access token
  const tokenRes = await fetch(SERVICE_ACCOUNT.token_uri, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: `grant_type=urn:ietf:params:oauth:grant-type:jwt-bearer&assertion=${jwt}`,
  });
  const tokenData = await tokenRes.json();
  if (!tokenData.access_token) {
    throw new Error("Failed to get access token: " + JSON.stringify(tokenData));
  }
  return tokenData.access_token;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { title, message, type, icon, target_platform } = await req.json();

    if (!title || !message) {
      return new Response(JSON.stringify({ error: "title and message are required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Get all FCM tokens from database
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    let query = supabase.from("fcm_tokens").select("token, platform");
    if (target_platform && target_platform !== "all") {
      query = query.eq("platform", target_platform);
    }
    const { data: tokens, error: dbError } = await query;
    if (dbError) throw dbError;

    if (!tokens || tokens.length === 0) {
      // Still save to push_notifications table
      await supabase.from("push_notifications").insert({
        title, message,
        type: type || "info",
        icon: icon || null,
        target_platform: target_platform || "all",
        is_active: true,
      });
      return new Response(JSON.stringify({ success: true, sent: 0, note: "No registered devices" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const accessToken = await getAccessToken();
    const fcmUrl = `https://fcm.googleapis.com/v1/projects/${SERVICE_ACCOUNT.project_id}/messages:send`;

    let sent = 0;
    let failed = 0;
    const failedTokens: string[] = [];

    for (const { token } of tokens) {
      try {
        const res = await fetch(fcmUrl, {
          method: "POST",
          headers: {
            Authorization: `Bearer ${accessToken}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            message: {
              token,
              notification: { title, body: message },
              data: { type: type || "info", icon: icon || "" },
            },
          }),
        });

        if (res.ok) {
          sent++;
        } else {
          const err = await res.json();
          console.error("FCM send failed for token:", token.substring(0, 20), JSON.stringify(err));
          failed++;
          // Remove invalid tokens
          if (err.error?.details?.some((d: any) => d.errorCode === "UNREGISTERED")) {
            failedTokens.push(token);
          }
        }
      } catch {
        failed++;
      }
    }

    // Clean up invalid tokens
    if (failedTokens.length > 0) {
      await supabase.from("fcm_tokens").delete().in("token", failedTokens);
    }

    // Save notification record
    await supabase.from("push_notifications").insert({
      title, message,
      type: type || "info",
      icon: icon || null,
      target_platform: target_platform || "all",
      is_active: true,
    });

    return new Response(JSON.stringify({ success: true, sent, failed }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    return new Response(JSON.stringify({ error: (e as Error).message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});