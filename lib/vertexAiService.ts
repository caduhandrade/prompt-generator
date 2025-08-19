import jwt from "jsonwebtoken";

function normalizePrivateKey(pk: unknown) {
    if (!pk || typeof pk !== "string") return pk;
    let s = pk;
    // Remove surrounding single/double quotes
    s = s.replace(/(^["'])|(["']$)/g, "");
    // Convert escaped sequences to real newlines (handles "\\r\\n" and "\\n")
    s = s.replace(/\\r\\n/g, "\n").replace(/\\n/g, "\n");
    // Normalize any CRLF to LF
    s = s.replace(/\r\n/g, "\n");
    return s.trim();
}

async function getAccessToken(): Promise<string> {
    const raw = process.env.GOOGLE_CREDENTIALS;
    if (!raw) throw new Error("Environment variable GOOGLE_CREDENTIALS is not set");

    // Remove aspas externas e vírgula que podem vir do .env
    let cleanedRaw = raw.trim();
    if ((cleanedRaw.startsWith("'") && cleanedRaw.endsWith("'")) ||
        (cleanedRaw.startsWith('"') && cleanedRaw.endsWith('"'))) {
        cleanedRaw = cleanedRaw.slice(1, -1);
    }
    // Remove vírgula no final se existir
    if (cleanedRaw.endsWith(',')) {
        cleanedRaw = cleanedRaw.slice(0, -1);
    }

    let keyFile: any;
    try {
        keyFile = JSON.parse(cleanedRaw);
    } catch {
        throw new Error("Environment variable GOOGLE_CREDENTIALS is not valid JSON");
    } if (!keyFile?.private_key) throw new Error("GOOGLE_CREDENTIALS is missing private_key");

    keyFile.private_key = normalizePrivateKey(keyFile.private_key);

    if (
        typeof keyFile.private_key !== "string" ||
        !/-----BEGIN .*PRIVATE KEY-----/.test(keyFile.private_key)
    ) {
        throw new Error("Parsed private_key does not look like a valid PEM private key");
    }

    const now = Math.floor(Date.now() / 1000);
    const payload = {
        iss: keyFile.client_email,
        scope: "https://www.googleapis.com/auth/cloud-platform",
        aud: keyFile.token_uri,
        exp: now + 3600,
        iat: now,
    };

    const jwtToken = jwt.sign(payload, keyFile.private_key, { algorithm: "RS256" });

    const res = await fetch(keyFile.token_uri, {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: `grant_type=urn:ietf:params:oauth:grant-type:jwt-bearer&assertion=${jwtToken}`,
    });
    const data: any = await res.json();
    if (!data.access_token) throw new Error("Failed to get access token");
    return data.access_token;
}

export async function streamGenerateContent(body: any) {
    const PROJECT_ID = "gglobo-hackday11-hdg-dev";
    const MODEL_ID = "gemini-2.5-pro";
    if (!PROJECT_ID || !MODEL_ID) throw new Error("Missing GOOGLE_PROJECT_ID or GOOGLE_MODEL_ID");

    // Remove qualquer referência a upload de imagem do body
    if (body?.contents?.parts) {
        body.contents.parts = body.contents.parts.filter((part: any) => !part.fileData);
    }

    const accessToken = await getAccessToken();
    const url = `https://aiplatform.googleapis.com/v1/projects/${PROJECT_ID}/locations/global/publishers/google/models/${MODEL_ID}:streamGenerateContent`;

    const response = await fetch(url, {
        method: "POST",
        headers: {
            Authorization: `Bearer ${accessToken}`,
            "Content-Type": "application/json",
        },
        body: JSON.stringify(body),
    });

    if (!response.ok) {
        throw new Error(`Request failed: ${response.status} ${response.statusText}`);
    }

    return response.json();
}

