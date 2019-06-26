import React from 'react'
import { useSelector, useDispatch, connect } from 'react-redux';
import { Button, Divider, InputBase, Paper } from '@material-ui/core';
import { withStyles } from '@material-ui/core/styles';

import { sendQuestion, onInput } from 'src/redux/actions'

import Topics from 'src/components/topics'
import Questions from 'src/components/questions'

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
  const question = useSelector(state => state.current_question)

  const onKeyPress = (ev) => {
    if (ev.key !== 'Enter') {
      return
    }
    ev.preventDefault();

    if (text) {
      dispatch(sendQuestion(text))
    }
  }

  const onBlur = () => {
    window.scrollTo(0, 0);
    document.body.scrollTop = 0;
  }

  return (
    <InputBase
      style={{ flex: 1, marginLeft: 8 }}
      value={text}
      placeholder={question ? question : "Ask a question"}
      multiline
      rows={2}

      onChange={(ev) => { dispatch(onInput()); onChange(ev) }}
      onClick={() => { dispatch(onInput()); onSelect() }}
      onBlur={onBlur}
      onKeyPress={onKeyPress} />
  )
}

class Input extends React.Component {
  constructor(props) {
    super(props);
    this.state = { text: '' };
  }

  componentDidUpdate(prevProps) {
    if (prevProps.current_question !== this.props.current_question && this.state.text) {
      this.setState({ text: '' })
    }
  }

  onInputChanged = (e) => {
    this.setState({ text: e.target.value })
  }

  onInputSelected = () => {
    this.setState({ text: '' })
  }

  onTopicSelected = (question) => {
    this.setState({ text: question })
  }

  render() {
    const { classes } = this.props;

    return (
      <div className='flex' style={{ height: window.innerHeight * 0.5 }}>
        <div className='content' style={{ height: '60px' }}>
          <Paper elevation={1} square={true}>
            <Topics onSelected={this.onTopicSelected} />
          </Paper>
        </div>
        <div className='expand'>
          <Questions />
        </div>
        <div className='footer' style={{ height: '60px' }}>
          <Paper className={classes.root} elevation={3} square={true}>
            <InputField text={this.state.text} onSelect={this.onInputSelected} onChange={this.onInputChanged} />
            <Divider className={classes.divider} />
            <SendButton text={this.state.text} />
          </Paper>
        </div>
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

const mapStateToProps = (state) => {
  return {
    current_question: state.current_question,
    current_mentor: state.current_mentor,
  }
}

export default withStyles(styles)(connect(mapStateToProps)(Input))
