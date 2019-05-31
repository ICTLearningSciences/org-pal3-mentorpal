import React from "react"
import { useSelector, useDispatch } from 'react-redux';

import { setCurrentMentor } from '../redux/actions'
import { videoUrl, RESPONSE_CUTOFF } from '../api/api'

import VideoThumbnail from "./video-thumbnail"

const VideoPanel = () => {
  const dispatch = useDispatch()
  const mentor = useSelector(state => state.cur_mentor)
  const mentors = useSelector(state => state.mentors)

  const isDisabled = (id) => {
    return mentors[id].confidence <= RESPONSE_CUTOFF
  }

  const onClick = (id) => {
    if (isDisabled(id)) {
      return
    }
    dispatch(setCurrentMentor(id))
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
            <VideoThumbnail
              src={videoUrl(mentors[id])}
              disabled={isDisabled(id)} />
          </div>
        )
      }
    </div>
  )
}

export default VideoPanel;
