import React from "react"
import { createStore, applyMiddleware } from "redux"
import { Provider } from "react-redux"
import thunk from "redux-thunk"

import store from "./src/redux/store"

const storeObj = createStore(store, applyMiddleware(...[thunk]))

export default ({ element }) => <Provider store={storeObj}>{element}</Provider>
