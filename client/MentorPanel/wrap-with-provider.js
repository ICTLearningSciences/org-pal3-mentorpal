import React from "react"
import { createStore, applyMiddleware } from "redux"
import { Provider } from "react-redux"
import thunk from "redux-thunk"

import store from "./src/redux/store"

const m_store = createStore(store, applyMiddleware(...[thunk]))

export default ({ element }) => <Provider store={m_store}>{element}</Provider>
