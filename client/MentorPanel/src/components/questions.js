import React from 'react'
import FlipMove from 'react-flip-move';
import { useSelector, useDispatch } from 'react-redux';
import { List } from '@material-ui/core'
import { MuiThemeProvider, createMuiTheme } from '@material-ui/core/styles'

import { sendQuestion } from 'src/redux/actions'

import ScrollingQuestions from 'src/components/scrolling_questions'

const Questions = () => {
  const dispatch = useDispatch()
  const mentor = useSelector(state => state.mentors_by_id[state.current_mentor])
  const current_topic = useSelector(state => state.current_topic)
  const questions_asked = useSelector(state => state.questions_asked)

  if (!mentor || !current_topic || !mentor.topic_questions || !mentor.topic_questions[current_topic]) {
    return <div></div>
  }

  const questions = mentor.topic_questions[current_topic]
  const height = document.getElementById('question-container').clientHeight
  const onQuestionSelected = (question) => {
    dispatch(sendQuestion(question))
  }

  return (
    <MuiThemeProvider theme={theme}>
      <List style={{ maxHeight: height * 0.9, overflow: 'auto' }}>
        <FlipMove>
          <ScrollingQuestions
            questions={questions}
            questions_asked={questions_asked}
            onQuestionSelected={onQuestionSelected} />
        </FlipMove>
      </List>
    </MuiThemeProvider>
  )
}

const theme = createMuiTheme({
  palette: {
    primary: { main: '#1B6A9C' },
  },
  typography: { useNextVariants: true },
});

export default Questions