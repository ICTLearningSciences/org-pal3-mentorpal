import React from "react"
import { useSelector, useDispatch } from 'react-redux';
import { Button, Paper } from '@material-ui/core';

import { selectTopic } from 'src/redux/actions'
import { normalizeString } from 'src/funcs/funcs'

const Topics = ({ onSelected }) => {
  const dispatch = useDispatch()
  const mentor = useSelector(state => state.mentors_by_id[state.current_mentor])
  const current_topic = useSelector(state => state.current_topic)
  const questions_asked = useSelector(state => state.questions_asked)

  if (!(mentor && mentor.topic_questions)) {
    return <div></div>
  }

  const topic_questions = mentor.topic_questions
  const onTopicSelected = (topic) => {
    dispatch(selectTopic(topic))
    const top_question = topic_questions[topic].find(q => {
      return !questions_asked.includes(normalizeString(q))
    })
    onSelected(top_question || '')
  }

  if (!current_topic) {
    const first_topic = Object.keys(topic_questions)[0]
    if (first_topic === 'Recommended') {
      onTopicSelected(first_topic)
    }
    else {
      dispatch(selectTopic(first_topic))
    }
  }

  return (
    <Paper elevation={1} square={true}>
      <div className="carousel">
        {
          Object.keys(topic_questions).map((topic, i) =>
            <div className='slide topic-slide' key={i}>
              <Button
                variant='contained'
                color={current_topic === topic ? 'primary' : 'default'}
                onClick={() => onTopicSelected(topic)}>
                {topic}
              </Button>
            </div>
          )
        }
      </div>
    </Paper>
  )
}

export default Topics