import React, { useState } from 'react'
import { useSelector, useDispatch } from 'react-redux';
import { Button, Divider, InputBase, Paper } from '@material-ui/core';
import { withStyles } from '@material-ui/core/styles';

import { sendQuestion, onInput } from 'src/redux/actions'

import Topics from 'src/components/topics'
import Questions from 'src/components/questions'

const Input = ({ height, ...props }) => {
  const dispatch = useDispatch()
  const question = useSelector(state => state.current_question)
  const [text, setText] = useState('')
  const { classes } = props

  // Input field should be updated (user typed a question or selected a topic)
  const onInputChanged = (text) => {
    dispatch(onInput())
    setText(text)
  }

  // Input field was clicked on
  const onInputSelected = () => {
    dispatch(onInput())
    setText('')
  }

  // Input is being sent (user hit send button or recommended question button)
  const onInputSend = (text) => {
    if (!text) {
      return
    }
    dispatch(sendQuestion(text))
    setText('')
  }

  // Input field key was entered (check if user hit enter)
  const onKeyPress = (ev) => {
    if (ev.key !== 'Enter') {
      return
    }
    ev.preventDefault()
    onInputSend(text)
  }

  // Input field keyboard was lowered
  const onBlur = () => {
    window.scrollTo(0, 0)
    document.body.scrollTop = 0
  }

  return (
    <div className='flex' style={{ height: height }}>
      <div className='content' style={{ height: '60px' }}>
        <Topics onSelected={onInputChanged}/>
      </div>
      <div className='expand'>
        <Questions height={height - 120} onSelected={onInputSend}/>
      </div>
      <div className='footer' style={{ height: '60px' }}>
        <Paper className={classes.root} elevation={3} square={true}>
          <InputBase className={classes.inputField}
            value={text} multiline rows={2}
            placeholder={question || "Ask a question"}
            onChange={(e) => {onInputChanged(e.target.value)}}
            onClick={onInputSelected}
            onBlur={onBlur}
            onKeyPress={onKeyPress} />
          <Divider className={classes.divider} />
          <Button className={classes.button}
            onClick={() => onInputSend(text)}
            disabled={!text}
            variant='contained'
            color='primary'> Send </Button>
        </Paper>
      </div>
    </div>
  )
}

const styles = {
  root: {
    padding: '2px 4px',
    display: 'flex',
    alignItems: 'center',
  },
  inputField: {
    flex: 1,
    marginLeft: 8,
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

export default withStyles(styles)(Input)