import React from "react"
import { useSelector, useDispatch } from 'react-redux';
import { Button } from '@material-ui/core';

import { selectTopic } from '../redux/actions'

const Topics = () => {
  const dispatch = useDispatch()
  const current_topic = useSelector(state => state.current_topic)
  const mentor = useSelector(state => state.mentors_by_id[state.current_mentor])
  if (!mentor || !mentor.topic_questions) {
    return <div></div>
  }
  const topic_questions = mentor.topic_questions

  const onTopicSelected = (topic) => {
    dispatch(selectTopic(topic))
  }

  return (
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
  )
}

export default Topics