import React from "react"
import { connect } from 'react-redux';
import { Button, Divider, InputBase, Paper } from '@material-ui/core';
import { withStyles } from '@material-ui/core/styles';

import { queryPanel } from '../api/api'

class InputField extends React.Component {
  constructor(props) {
    super(props);
    this.state = {
      text: '',
    };
  }

  onSend = async () => {
    queryPanel(this.props.mentors, this.state.text, this.props.dispatch)
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
            placeholder="Ask a question"
            value={this.state.text}
            multiline
            rows={2} />
          <Divider className={classes.divider} />
          <Button
            className={classes.button}
            onClick={() => { this.onSend() }}
            disabled={this.state.text === ''}
            variant='contained'
            color='primary'>Send
          </Button>
        </Paper>
      </div>
    )
  }
}

const mapStateToProps = state => {
  return {
    mentor_id: state.cur_mentor,
    mentors: state.mentors,
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
  button: {
    margin: 10,
  },
  divider: {
    width: 1,
    height: 28,
    margin: 4,
  },
}

export default connect(mapStateToProps)(withStyles(styles)(InputField))