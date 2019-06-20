import React from "react"
import { useSelector, useDispatch } from 'react-redux';
import { CircularProgress, Paper } from '@material-ui/core';
import { Sms, SmsFailed, Star } from '@material-ui/icons'

import { selectMentor } from 'src/redux/actions'
import { STATUS_READY, STATUS_ERROR } from 'src/redux/store'

import VideoThumbnail from "src/components/video-thumbnail";

const LoadingSpinner = ({ mentor }) => {
  const question = useSelector(state => state.current_question)
  if (question && question !== mentor.question) {
    return <CircularProgress className='spinner' />
  }
  return <div></div>
}

const StarIcon = ({ mentor }) => {
  const faved_mentor = useSelector(state => state.faved_mentor)
  if (faved_mentor === mentor.id) {
    return <Star className='star-icon' fontSize='small' style={{ color: 'yellow' }} />
  }
  return <div></div>
}

const MessageStatus = ({ mentor }) => {
  const next_mentor = useSelector(state => state.next_mentor)

  if (mentor.is_off_topic) {
    return <div></div>
  }
  if (mentor.status === STATUS_ERROR) {
    return <SmsFailed className='message-notice' fontSize='small' style={{ color: 'red' }} />
  }
  if (mentor.status === STATUS_READY) {
    const isNext = mentor.id === next_mentor
    return <Sms
      className={`message-notice ${isNext ? 'blink' : ''}`}
      fontSize='small'
      style={{ color: 'green' }} />
  }
  return <div></div>
}

const VideoPanel = () => {
  const dispatch = useDispatch()
  const mentor = useSelector(state => state.current_mentor)
  const mentors = useSelector(state => state.mentors_by_id)

  const onClick = (mentor) => {
    if (mentor.is_off_topic || mentor.status === STATUS_ERROR) {
      return
    }
    dispatch(selectMentor(mentor.id))
  }

  return (
    <Paper elevation={1} square={true}>
      <div className="carousel">
        {
          Object.keys(mentors).map((id, i) =>
            <div
              className={`slide video-slide ${id === mentor ? 'selected' : ''}`}
              key={`${id}-${i}`}
              onClick={() => onClick(mentors[id])}
            >
              <VideoThumbnail mentor={mentors[id]} />
              <LoadingSpinner mentor={mentors[id]} />
              <MessageStatus mentor={mentors[id]} />
              <StarIcon mentor={mentors[id]} />
            </div>
          )
        }
      </div>
    </Paper>
  )
}

export default VideoPanel;
