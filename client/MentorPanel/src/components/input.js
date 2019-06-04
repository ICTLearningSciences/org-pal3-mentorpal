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

class Input extends React.Component {
  constructor(props) {
    super(props);
    this.state = { text: '' };
  }

  clear = () => {
    this.setState({ text: '' })
  }

  render() {
    const { classes } = this.props;

    return (
      <div id='footer'>
        <Paper className={classes.root}>
          <InputBase
            className={classes.input}
            onChange={(e) => this.setState({ text: e.target.value })}
            onClick={() => this.clear()}
            value={this.state.text}
            placeholder="Ask a question"
            multiline
            rows={2} />
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
  input: {
    marginLeft: 8,
    flex: 1,
  },
  divider: {
    width: 1,
    height: 28,
    margin: 4,
  },
}

export default withStyles(styles)(Input)
