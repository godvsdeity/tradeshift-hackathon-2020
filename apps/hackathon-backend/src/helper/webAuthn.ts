export function getClientData(publicKeyCredentials): any {
  return JSON.parse(
    Buffer.from(
      publicKeyCredentials.response.clientDataJSON,
      "base64"
    ).toString()
  );
}

export function isPublicKeyCredentialsValid(
  publicKeyCredentials,
  challenge: string,
  origin: string
): boolean {
  const { id, rawId, response, type } = publicKeyCredentials;
  if (!id || !rawId || !response || !type) {
    return false;
  }

  if (type !== "public-key") {
    return false;
  }

  let clientData;
  try {
    clientData = getClientData(publicKeyCredentials);
  } catch (err) {
    return false;
  }

  // console.log(clientData);

  if (response.attestationObject && clientData.type !== "webauthn.create") {
    return false;
  }

  if (
    !clientData.challenge ||
    // re base64 encode the challenge received from browser to make sure that the challenge uses the same base64 standard
    Buffer.from(clientData.challenge, "base64").toString("base64") !== challenge
  ) {
    return false;
  }

  if (!clientData.origin || clientData.origin !== origin) {
    return false;
  }

  return true;
}
