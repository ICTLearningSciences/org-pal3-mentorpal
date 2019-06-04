import React from "react"
import { useSelector, useDispatch } from 'react-redux';
import { CircularProgress } from '@material-ui/core';

import { selectMentor } from '../redux/actions'
import { RESPONSE_CUTOFF } from '../api/api'

import VideoThumbnail from "./video-thumbnail"

const VideoPanel = () => {
  const dispatch = useDispatch()
  const mentor = useSelector(state => state.current_mentor)
  const mentors = useSelector(state => state.mentors_by_id)
  const question = useSelector(state => state.current_question)

  const isDisabled = (id) => {
    return mentors[id].confidence <= RESPONSE_CUTOFF
  }

  const onClick = (id) => {
    if (isDisabled(id)) {
      return
    }
    dispatch(selectMentor(id))
  }

  return (
    <div id="carousel">
      {
        Object.keys(mentors).map((id, i) =>
          <div
            className={`slide ${id === mentor ? 'selected' : ''}`}
            key={`${id}-${i}`}
            onClick={() => onClick(id)}
          >
            <VideoThumbnail mentor={mentors[id]} />
            {question && question !== mentors[id].question ?
              <CircularProgress className='spinner' /> : undefined}
          </div>
        )
      }
    </div>
  )
}

export default VideoPanel;
