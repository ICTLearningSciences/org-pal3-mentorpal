import React from 'react'
import { useDispatch } from 'react-redux';
import { Button, Divider, InputBase, Paper } from '@material-ui/core';
import { withStyles } from '@material-ui/core/styles';

import { sendQuestion } from '../redux/actions'

const SendButton = ({ text }) => {
  const dispatch = useDispatch()

  const onSend = () => {
    dispatch(sendQuestion(text))
  }

  return (
    <Button
      style={{ margin: 10 }}
      onClick={() => { onSend() }}
      disabled={!text}
      variant='contained'
      color='primary'>
      Send
    </Button>
  )
}

const InputField = ({ text, onSelect, onChange }) => {
  const dispatch = useDispatch()

  const onKeyPress = (ev) => {
    if (ev.key !== 'Enter') {
      return
    }
    ev.preventDefault();

    if (text) {
      dispatch(sendQuestion(text))
    }
  }

  return (
    <InputBase
      style={{ flex: 1, marginLeft: 8 }}
      value={text}
      placeholder="Ask a question"
      multiline
      rows={2}

      onChange={onChange}
      onClick={onSelect}
      onKeyPress={onKeyPress} />
  )
}

class Input extends React.Component {
  constructor(props) {
    super(props);
    this.state = { text: '' };
  }

  onChange = (e) => {
    this.setState({ text: e.target.value })
  }

  clear = () => {
    this.setState({ text: '' })
  }

  render() {
    const { classes } = this.props;

    return (
      <div id='footer'>
        <Paper className={classes.root}>
          <InputField text={this.state.text} onSelect={this.clear} onChange={this.onChange} />
          <Divider className={classes.divider} />
          <SendButton text={this.state.text} />
        </Paper>
      </div>
    )
  }
}

const styles = {
  root: {
    padding: '2px 4px',
    display: 'flex',
    alignItems: 'center',
  },
  divider: {
    width: 1,
    height: 28,
    margin: 4,
  },
}

export default withStyles(styles)(Input)
