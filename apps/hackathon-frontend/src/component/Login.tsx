import React from "react";
import { solveLoginChallenge } from "@webauthn/client";
import { useHistory } from "react-router-dom";

function Login() {
  const [username, setUsername] = React.useState("");
  const [password, setPassword] = React.useState("");
  const history = useHistory();

  const handleSubmit = React.useCallback(async () => {
    if (username && password) {
      // classic authentication
      const response = await fetch(
        `${process.env.REACT_APP_BACKEND_HOST}/login`,
        {
          method: "POST",
          headers: {
            "content-type": "application/json",
          },
          body: JSON.stringify({ username, password }),
          credentials: "include",
        }
      );

      if (!response.ok) {
        window.ts.ui.Notification.error(
          `Authentication failed: ${response.status} - ${response.statusText}`
        );
        return;
      }

      history.push("/");
    } else if (username) {
      // passwordless authentication
      const response = await fetch(
        `${process.env.REACT_APP_BACKEND_HOST}/webauthn/challenge/login`,
        {
          method: "POST",
          headers: {
            "content-type": "application/json",
          },
          body: JSON.stringify({ username }),
          credentials: "include",
        }
      );

      if (!response.ok) {
        window.ts.ui.Notification.error(
          `Authentication failed: ${response.status} - ${response.statusText}`
        );
        return;
      }
      const challenge = await response.json();

      const credentials = await solveLoginChallenge(challenge);
      console.log(credentials);

      const loginResponse = await fetch(
        `${process.env.REACT_APP_BACKEND_HOST}/webauthn/login`,
        {
          method: "POST",
          headers: {
            "content-type": "application/json",
          },
          body: JSON.stringify(credentials),
          credentials: "include",
        }
      );
      if (!loginResponse.ok) {
        window.ts.ui.Notification.error(
          `Authentication failed: ${loginResponse.status} - ${loginResponse.statusText}`
        );
        return;
      }

      history.push("/");
    }
  }, [username, password, history]);

  const handleInputChange = React.useCallback(
    (stateSetter: React.Dispatch<React.SetStateAction<string>>) => (
      event: React.ChangeEvent<HTMLInputElement>
    ) => stateSetter(event.target.value),
    []
  );

  return (
    <form data-ts="Form" onSubmit={handleSubmit}>
      <fieldset>
        <label>
          <span>Username</span>
          <input value={username} onChange={handleInputChange(setUsername)} />
        </label>
        <label>
          <span>Password</span>
          <input onChange={handleInputChange(setPassword)} />
        </label>
      </fieldset>
      <button type="submit" data-ts="Button" className="ts-primary">
        Login
      </button>
    </form>
  );
}

export default Login;
