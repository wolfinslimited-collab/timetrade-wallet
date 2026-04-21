import { encodeBase64Url } from "https://deno.land/std@0.220.0/encoding/base64url.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

// Same Firebase project + service account used by fcm-push
const SERVICE_ACCOUNT = {
  project_id: "timetrade-81620",
  // GCM/FCM Sender ID, from GoogleService-Info.plist
  sender_id: "166449318661",
  // iOS app ID (must match GoogleService-Info.plist GOOGLE_APP_ID)
  application: "com.wallet.ai",
  client_email: "firebase-adminsdk-fbsvc@timetrade-81620.iam.gserviceaccount.com",
  token_uri: "https://oauth2.googleapis.com/token",
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
};

async function getAccessToken(): Promise<string> {
  const now = Math.floor(Date.now() / 1000);
  const header = { alg: "RS256", typ: "JWT" };
  const payload = {
    iss: SERVICE_ACCOUNT.client_email,
    // batchImport requires this scope
    scope: "https://www.googleapis.com/auth/firebase.messaging",
    aud: SERVICE_ACCOUNT.token_uri,
    iat: now,
    exp: now + 3600,
  };

  const enc = new TextEncoder();
  const headerB64 = encodeBase64Url(enc.encode(JSON.stringify(header)));
  const payloadB64 = encodeBase64Url(enc.encode(JSON.stringify(payload)));
  const unsignedToken = `${headerB64}.${payloadB64}`;

  const pemContents = SERVICE_ACCOUNT.private_key
    .replace(/-----BEGIN PRIVATE KEY-----/, "")
    .replace(/-----END PRIVATE KEY-----/, "")
    .replace(/\s+/g, "");
  const binaryKey = Uint8Array.from(atob(pemContents), (c) => c.charCodeAt(0));

  const cryptoKey = await crypto.subtle.importKey(
    "pkcs8",
    binaryKey,
    { name: "RSASSA-PKCS1-v1_5", hash: "SHA-256" },
    false,
    ["sign"],
  );

  const signature = await crypto.subtle.sign(
    "RSASSA-PKCS1-v1_5",
    cryptoKey,
    enc.encode(unsignedToken),
  );
  const signatureB64 = encodeBase64Url(new Uint8Array(signature));
  const jwt = `${unsignedToken}.${signatureB64}`;

  const tokenRes = await fetch(SERVICE_ACCOUNT.token_uri, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: `grant_type=urn:ietf:params:oauth:grant-type:jwt-bearer&assertion=${jwt}`,
  });
  const tokenData = await tokenRes.json();
  if (!tokenData.access_token) {
    throw new Error("Failed to get access token: " + JSON.stringify(tokenData));
  }
  return tokenData.access_token as string;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const body = await req.json().catch(() => ({}));
    const apnsTokenRaw = (body?.apns_token ?? "").toString().trim();
    const sandbox = Boolean(body?.sandbox);

    if (!apnsTokenRaw) {
      return new Response(
        JSON.stringify({ error: "apns_token is required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    // Normalize: APNs tokens from Capacitor are lowercase hex with no spaces.
    // Firebase batchImport accepts hex-encoded APNs tokens directly.
    const apnsToken = apnsTokenRaw.replace(/\s+/g, "").toLowerCase();

    const accessToken = await getAccessToken();

    // Firebase Instance ID batchImport
    // Docs: https://developers.google.com/instance-id/reference/server#create_registration_tokens_for_apns_tokens
    const iidUrl = "https://iid.googleapis.com/iid/v1:batchImport";
    const iidRes = await fetch(iidUrl, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json",
        access_token_auth: "true",
      },
      body: JSON.stringify({
        application: SERVICE_ACCOUNT.application,
        sandbox,
        apns_tokens: [apnsToken],
      }),
    });

    const iidData = await iidRes.json().catch(() => ({}));
    if (!iidRes.ok) {
      return new Response(
        JSON.stringify({ error: "batchImport failed", details: iidData }),
        { status: 502, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    const result = iidData?.results?.[0];
    const fcmToken = result?.registration_token;
    if (!fcmToken) {
      return new Response(
        JSON.stringify({ error: "No registration_token returned", details: iidData }),
        { status: 502, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    return new Response(
      JSON.stringify({ fcm_token: fcmToken, status: result?.status ?? "OK" }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  } catch (e) {
    return new Response(
      JSON.stringify({ error: (e as Error).message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }
});
