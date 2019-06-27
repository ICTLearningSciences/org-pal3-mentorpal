import React, { useState, useEffect, useRef } from 'react'
import { useSelector, useDispatch } from 'react-redux';
import { Button, Divider, InputBase, Paper } from '@material-ui/core';
import { withStyles } from '@material-ui/core/styles';

import { sendQuestion, onInput } from 'src/redux/actions'
import { normalizeString } from 'src/funcs/funcs'

const Input = ({ ...props }) => {
  const dispatch = useDispatch()
  const question = useSelector(state => state.current_question)
  const topic = useSelector(state => state.current_topic)
  const mentor = useSelector(state => state.mentors_by_id[state.current_mentor])
  const questions_asked = useSelector(state => state.questions_asked)
  const [text, setText] = useState('')

  const prevQuestion = useRef()
  const prevTopic = useRef()
  const { classes } = props

  useEffect(() => {
    if (prevQuestion.current !== question && text) {
      setText('')
    }

    if (prevTopic.current !== topic && mentor && mentor.topic_questions) {
      const topic_questions = mentor.topic_questions[topic]
      const top_question = topic_questions.find(q => {
        return !questions_asked.includes(normalizeString(q))
      })
      if (top_question) {
        dispatch(onInput())
        setText(top_question)
      }
    }

    prevQuestion.current = question
    prevTopic.current = topic
  })

  const onInputChanged = (e) => {
    dispatch(onInput())
    setText(e.target.value)
  }

  const onInputSelected = () => {
    dispatch(onInput())
    setText('')
  }

  const onInputSend = () => {
    if (!text) {
      return
    }
    dispatch(sendQuestion(text))
    setText('')
  }

  const onKeyPress = (ev) => {
    if (ev.key !== 'Enter') {
      return
    }
    ev.preventDefault()
    onInputSend()
  }

  const onBlur = () => {
    window.scrollTo(0, 0);
    document.body.scrollTop = 0;
  }

  return (
    <Paper className={classes.root} elevation={3} square={true}>
      <InputBase
        style={{ flex: 1, marginLeft: 8 }}
        value={text}
        placeholder={question ? question : "Ask a question"}
        multiline
        rows={2}
        onChange={onInputChanged}
        onClick={onInputSelected}
        onBlur={onBlur}
        onKeyPress={onKeyPress} />

      <Divider className={classes.divider} />

      <Button
        style={{ margin: 10 }}
        onClick={onInputSend}
        disabled={!text}
        variant='contained'
        color='primary'>
        Send
      </Button>
    </Paper>
  )
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