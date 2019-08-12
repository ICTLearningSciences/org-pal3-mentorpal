import React from "react";
import { createStore, applyMiddleware } from "redux";
import { Provider } from "react-redux";
import thunk from "redux-thunk";

import store from "store/reducer";
import logger from "redux-logger";

const storeObj = createStore(store, applyMiddleware(...[thunk, logger]));

export default function WrappedWithProvider({ element }) {
  return <Provider store={storeObj}>{element}</Provider>;
}

WrappedWithProvider.displayName = "WrappedWithProvider";
