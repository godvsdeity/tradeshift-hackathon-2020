import session from "koa-session";
import Koa, { DefaultState, Context } from "koa";
import Router from "@koa/router";
import bodyParser from "koa-bodyparser";
import cors from "@koa/cors";
import { getRepository } from "typeorm";
import { createHash } from "crypto";
import {
  generateRegistrationChallenge,
  generateLoginChallenge,
} from "@webauthn/server";
import WebAuthn from "webauthn";
import base64url from "base64url";

import { User } from "./entity/user";
import { typeormConnection, userAuth } from "./middleware";
import { UserAuthenticator } from "./entity/userAuthenticator";
import { isPublicKeyCredentialsValid } from "./helper";

const app = new Koa();
const router = new Router<DefaultState, Context>();
const webauthn = new Router<DefaultState, Context>();

app.keys = ["supersecret"];
app
  .use(typeormConnection)
  .use(cors({ credentials: true }))
  .use(session(app))
  .use(bodyParser());

router.post("/login", async (ctx) => {
  if (!ctx.session) {
    return ctx.throw();
  }

  const { username, password } = ctx.request.body;
  if (!username || !password) {
    return ctx.throw(400);
  }

  const userRepository = getRepository(User);
  const user = await userRepository.findOne({
    username,
    password: createHash("sha1").update(password).digest("hex"),
  });
  if (!user) {
    return ctx.throw(401);
  }

  ctx.session.loggedInUser = user;
  ctx.status = 204;
});

router.get("/logout", (ctx) => {
  if (!ctx.session) {
    return ctx.throw();
  }

  ctx.session.loggedInUser = null;
  ctx.status = 204;
});

// webauthn routes
const relyingParty = {
  name: "Tradeshift",
  id: "localhost",
};

webauthn.get("/challenge/register", userAuth, (ctx) => {
  if (!ctx.session) {
    return ctx.throw();
  }

  const user = {
    id: ctx.session.loggedInUser.id,
    name: ctx.session.loggedInUser.username,
    displayName: ctx.session.loggedInUser.displayName,
  };
  const publicKeyCredentialCreationOptions = generateRegistrationChallenge({
    relyingParty,
    user,
  });
  ctx.session.webAuthnChallenge = publicKeyCredentialCreationOptions.challenge;
  ctx.body = publicKeyCredentialCreationOptions;
});

webauthn.post("/challenge/login", async (ctx) => {
  if (!ctx.session) {
    return ctx.throw();
  }

  const { username } = ctx.request.body;
  if (!username) {
    return ctx.throw(400);
  }

  const userRepository = getRepository(User);
  const user = await userRepository.findOne({
    username,
  });
  if (!user || !user.authenticators || !user.authenticators.length) {
    return ctx.throw(400);
  }
  const assertionChallenge = generateLoginChallenge(
    user.authenticators.map(({ authenticator }) => authenticator)
  );

  // remove transports because the webauthn libraries still sucks...
  for (const credentials of assertionChallenge.allowCredentials) {
    delete credentials.transports;
  }

  ctx.session.webAuthnChallenge = assertionChallenge.challenge;
  ctx.body = assertionChallenge;
});

webauthn.post("/register", userAuth, async (ctx) => {
  if (!ctx.session) {
    ctx.throw();
  }

  if (
    !isPublicKeyCredentialsValid(
      ctx.request.body,
      ctx.session!.webAuthnChallenge,
      "https://localhost:3000"
    )
  ) {
    return ctx.throw(400);
  }

  const { response } = ctx.request.body;
  const {
    authrInfo,
    verified,
  } = WebAuthn.verifyAuthenticatorAttestationResponse(response);
  if (!verified) {
    ctx.throw(400);
  }

  const userRepository = getRepository(User);
  const user = await userRepository.findOne(ctx.session!.loggedInUser.id);
  if (!user) {
    return ctx.throw(400);
  }
  // console.log(ctx.request.body);
  // console.log(authrInfo);

  authrInfo.publicKey = base64url.toBase64(authrInfo.publicKey);
  authrInfo.credID = base64url.toBase64(authrInfo.credID);

  if (user.authenticators && user.authenticators.length) {
    user.authenticators[0].authenticator = authrInfo;
  } else {
    const userAuthenticator = new UserAuthenticator();
    userAuthenticator.user = user;
    userAuthenticator.authenticator = authrInfo;

    user.authenticators = [userAuthenticator];
  }
  await userRepository.save(user);
  ctx.status = 204;
});

webauthn.post("/login", async (ctx) => {
  if (!ctx.session) {
    ctx.throw();
  }

  // console.log(ctx.request.body);

  if (
    !isPublicKeyCredentialsValid(
      ctx.request.body,
      ctx.session!.webAuthnChallenge,
      "https://localhost:3000"
    )
  ) {
    return ctx.throw(400);
  }

  const { rawId, response } = ctx.request.body;

  const userId = Buffer.from(response.userHandle, "base64").toString();
  const userRepository = getRepository(User);
  const user = await userRepository.findOne(userId);
  if (!user || !user.authenticators || !user.authenticators.length) {
    return ctx.throw(400);
  }
  const authenticator = user.authenticators.find(
    (auth) => auth.authenticator.credID === rawId
  );
  if (!authenticator) {
    return ctx.throw(400);
  }

  const { verified, counter } = WebAuthn.verifyAuthenticatorAssertionResponse(
    response,
    authenticator.authenticator,
    false
  );
  console.log(verified, counter);
  if (!verified || counter < authenticator.authenticator.counter) {
    return ctx.throw(400);
  }

  authenticator.authenticator.counter = counter;
  userRepository.save(user);

  ctx.session!.loggedInUser = user;
  ctx.status = 204;
});

router.use("/webauthn", webauthn.routes(), webauthn.allowedMethods());
app.use(router.routes()).use(router.allowedMethods());

const port = 4000;
app.listen(port, () => {
  console.log(`Listening on ${port}`);
});
