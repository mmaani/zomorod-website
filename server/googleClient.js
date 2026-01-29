import { google } from "googleapis";
import { getServiceAccountFromEnv } from "./googleSa.js";

export function getGoogleAuth(scopes = []) {
  const sa = getServiceAccountFromEnv();

  const auth = new google.auth.JWT({
    email: sa.client_email,
    key: sa.private_key,
    scopes,
  });

  return auth;
}
