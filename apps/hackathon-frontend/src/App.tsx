import React from "react";
import { BrowserRouter, Switch, Route } from "react-router-dom";

import "./App.css";
import Login from "./component/Login";
import AuthenticatorList from "./component/AuthenticatorList";

function App() {
  return (
    <BrowserRouter>
      <Switch>
        <Route path="/login" exact>
          <Login />
        </Route>
        <Route path="/" exact>
          <AuthenticatorList />
        </Route>
      </Switch>
    </BrowserRouter>
  );
}

export default App;
