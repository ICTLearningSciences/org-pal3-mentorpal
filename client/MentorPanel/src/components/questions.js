import React from 'react'
import { useSelector, useDispatch } from 'react-redux';
import { List } from '@material-ui/core'
import { MuiThemeProvider, createMuiTheme } from '@material-ui/core/styles'

import { sendQuestion } from 'src/redux/actions'

import ScrollingQuestions from 'src/components/scrolling_questions'

const Questions = ({ height }) => {
  const dispatch = useDispatch()
  const mentor = useSelector(state => state.mentors_by_id[state.current_mentor])
  const current_topic = useSelector(state => state.current_topic)
  const questions_asked = useSelector(state => state.questions_asked)

  if (!(mentor && current_topic && mentor.topic_questions)) {
    return <div></div>
  }

  const questions = mentor.topic_questions[current_topic] || []
  const recommended = mentor.topic_questions['Recommended'] || []

  const onQuestionSelected = (question) => {
    dispatch(sendQuestion(question))
  }

  return (
    <MuiThemeProvider theme={theme}>
      <List disablePadding={true} style={{ maxHeight: height, overflow: 'auto' }}>
        <ScrollingQuestions
          questions={questions}
          questions_asked={questions_asked}
          recommended={recommended}
          onQuestionSelected={onQuestionSelected} />
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