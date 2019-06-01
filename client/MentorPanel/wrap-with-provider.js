import React from 'react';
import { createStore, applyMiddleware } from 'redux';
import { Provider } from 'react-redux';
import thunk from 'redux-thunk';

import reducer from './src/redux/reducer'

const middleware = [thunk]
const store = createStore(
  reducer,
  applyMiddleware(...middleware)
)

export default ({ element }) => (
  <Provider store={store}>
    {element}
  </Provider>
);