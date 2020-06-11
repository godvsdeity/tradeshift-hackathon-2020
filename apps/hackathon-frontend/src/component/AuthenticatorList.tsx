import React from "react";
import { solveRegistrationChallenge } from "@webauthn/client";
import { useHistory } from "react-router-dom";

function AuthenticatorList() {
  const history = useHistory();

  const handleAuthenticatorRegister = React.useCallback(async () => {
    const challengeResponse = await fetch(
      `${process.env.REACT_APP_BACKEND_HOST}/webauthn/challenge/register`,
      {
        credentials: "include",
      }
    );
    if (!challengeResponse.ok) {
      window.ts.ui.Notification.error(
        `Error: ${challengeResponse.status} - ${challengeResponse.statusText}`,
        {
          onaccept() {
            if (challengeResponse.status === 401) {
              history.push("/login");
            }
          },
        }
      );
      return;
    }

    const credentials = await solveRegistrationChallenge(
      await challengeResponse.json()
    );
    const registerResponse = await fetch(
      `${process.env.REACT_APP_BACKEND_HOST}/webauthn/register`,
      {
        method: "POST",
        headers: {
          "content-type": "application/json",
        },
        body: JSON.stringify(credentials),
        credentials: "include",
      }
    );
    if (!registerResponse.ok) {
      window.ts.ui.Notification.error(
        `Error: ${registerResponse.status} - ${registerResponse.statusText}`
      );
      return;
    } else {
      window.ts.ui.Notification.success("Authenticator added successfully.");
    }
  }, [history]);

  const handleLogout = React.useCallback(async () => {
    await fetch(`${process.env.REACT_APP_BACKEND_HOST}/logout`, {
      credentials: "include",
    });
    history.push("/login");
  }, [history]);

  return (
    <>
      <button
        data-ts="Button"
        className="ts-primary"
        onClick={handleAuthenticatorRegister}
      >
        Register Authenticator
      </button>
      <button onClick={handleLogout}>Logout</button>
    </>
  );
}

export default AuthenticatorList;
