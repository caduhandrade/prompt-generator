import jwt from "jsonwebtoken";

async function getAccessToken(): Promise<string> {
    const keyFile = JSON.parse(process.env.GOOGLE_CREDENTIALS || "{}");

    if (!keyFile.private_key || !keyFile.client_email || !keyFile.token_uri) {
        throw new Error("Invalid GOOGLE_CREDENTIALS environment variable");
    }

    // Alternativa segura: apenas converte \n para quebra de linha real
    const privateKey = keyFile.private_key.replace(/\\n/g, "\n");

    const now = Math.floor(Date.now() / 1000);
    const payload = {
        iss: keyFile.client_email,
        scope: "https://www.googleapis.com/auth/cloud-platform",
        aud: keyFile.token_uri,
        exp: now + 3600,
        iat: now,
    };

    // Gera JWT com RS256 usando a chave corretamente formatada
    const jwtToken = jwt.sign(payload, privateKey, { algorithm: "RS256" });

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
    const PROJECT_ID = process.env.GOOGLE_PROJECT_ID;
    const MODEL_ID = process.env.GOOGLE_MODEL_ID;
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
            "Authorization": `Bearer ${accessToken}`,
            "Content-Type": "application/json",
        },
        body: JSON.stringify(body),
    });

    if (!response.ok) {
        throw new Error(`Request failed: ${response.status} ${response.statusText}`);
    }

    return response.json();
}
