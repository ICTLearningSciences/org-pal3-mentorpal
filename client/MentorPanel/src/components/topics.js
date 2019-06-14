import React from "react"
import { useSelector, useDispatch } from 'react-redux';
import { Button, Menu, MenuItem } from '@material-ui/core';

import { getQuestionForTopic } from '../redux/actions'

class Topic extends React.Component {
  constructor(props) {
    super(props);
    this.state = {
      anchor: null,
    };
  }

  handleClick = (event) => {
    this.setState({ anchor: event.currentTarget })
  }

  selectTopic = (topic) => {
    this.setState({ anchor: null })
    this.props.onTopicSelected(topic)
  }

  render() {
    const topic = this.props.topic
    const subtopics = this.props.subtopics

    return (
      <div className='slide topic-slide'>
        <Button aria-controls="simple-menu" aria-haspopup="true" onClick={this.handleClick}>
          {topic}
        </Button>
        <Menu
          id="simple-menu"
          anchorEl={this.state.anchor}
          open={this.state.anchor !== null}
          onClose={this.selectTopic}
        >
          {
            subtopics.map((subtopic) =>
              <MenuItem key={subtopic} onClick={() => { this.selectTopic(subtopic) }}>{subtopic}</MenuItem>)
          }
        </Menu>
      </div>
    )
  }
}

const Topics = () => {
  const dispatch = useDispatch()
  const mentor = useSelector(state => state.mentors_by_id[state.current_mentor])

  const onTopicSelected = (topic) => {
    dispatch(getQuestionForTopic(topic))
  }

  try {
    const topics = mentor.topics
    return (
      <div id="carousel">
        {
          Object.keys(topics).map((topic, i) =>
            <Topic
              key={`${topic}-${i}`}
              topic={topic}
              subtopics={topics[topic]}
              onTopicSelected={onTopicSelected} />
          )
        }
      </div>
    )
  }
  catch (err) {
    return <div></div>
  }
}

export default Topics