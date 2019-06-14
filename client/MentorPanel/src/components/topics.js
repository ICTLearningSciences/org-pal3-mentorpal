import React from "react"
import { useSelector, useDispatch } from 'react-redux';
import { Button, Menu, MenuItem } from '@material-ui/core';

class Topic extends React.Component {
  constructor(props) {
    super(props);
    this.state = {
      anchor: null,
    };
  }

  selectTopic = (event) => {
    this.setState({ anchor: event.currentTarget })
  }

  selectQuestion = (question) => {
    this.setState({ anchor: null })
    if (!question) {
      return
    }
    this.props.onQuestionSelected(question)
  }

  render() {
    const topic = this.props.topic
    const questions = this.props.questions

    return (
      <div className='slide topic-slide'>
        <Button
          aria-controls="simple-menu"
          aria-haspopup="true"
          variant='contained'
          onClick={this.selectTopic}
        >
          {topic}
        </Button>
        <Menu
          id="simple-menu"
          anchorEl={this.state.anchor}
          open={this.state.anchor !== null}
          onClose={() => this.selectQuestion(null)}
        >
          {
            questions.map((question, i) =>
              <MenuItem key={i} onClick={() => { this.selectQuestion(question) }}>
                {question}
              </MenuItem>
            )
          }
        </Menu>
      </div>
    )
  }
}

const Topics = ({ onQuestionSelected }) => {
  const mentor = useSelector(state => state.mentors_by_id[state.current_mentor])

  try {
    const topic_questions = mentor.topic_questions
    return (
      <div id="carousel">
        {
          Object.keys(topic_questions).map((topic, i) =>
            <Topic
              key={i}
              topic={topic}
              questions={topic_questions[topic]}
              onQuestionSelected={onQuestionSelected} />
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