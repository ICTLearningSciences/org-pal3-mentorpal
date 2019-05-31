import React from "react"
import { connect } from 'react-redux';

import { setCurrentMentor } from '../redux/actions'
import { videoUrl, RESPONSE_CUTOFF } from '../api/api'

import VideoThumbnail from "./video-thumbnail"

const VideoPanel = ({ ...props }) => {
  const isDisabled = (id) => {
    return props.mentors[id].confidence <= RESPONSE_CUTOFF
  }

  const onClick = (id) => {
    if (isDisabled(id)) {
      return
    }
    props.dispatch(setCurrentMentor(id))
  }

  return (
    <div id="carousel">
      {
        Object.keys(props.mentors).map((id, i) =>
          <div
            className={`slide ${id === props.mentor ? 'selected' : ''}`}
            key={`${id}-${i}`}
            onClick={() => onClick(id)}
          >
            <VideoThumbnail
              src={videoUrl(props.mentors[id])}
              disabled={isDisabled(id)} />
          </div>
        )
      }
    </div>
  )
}

const mapStateToProps = state => {
  return {
    mentor: state.cur_mentor,
    mentors: state.mentors,
  }
}

export default connect(mapStateToProps)(VideoPanel);
