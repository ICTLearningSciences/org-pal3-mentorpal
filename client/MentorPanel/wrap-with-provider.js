import React from 'react';
import { Provider } from 'react-redux';
import { createStore } from 'redux'

import reducer from './src/redux/reducer'

const store = createStore(reducer)

export default ({ element }) => (
  <Provider store={store}>
    {element}
  </Provider>
);