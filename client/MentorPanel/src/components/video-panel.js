import React from "react"
import { connect } from 'react-redux';

import { setMentor } from '../redux/actions'
import { videoUrl } from '../funcs/funcs'

import VideoThumbnail from "./video-thumbnail"

const VideoPanel = ({ ...props }) => {
  return (
    <div id="carousel">
      {
        props.mentors.map((mentor, i) =>
          <div
            className={`slide ${mentor.id === props.mentor ? 'selected' : ''}`}
            key={`${mentor.id}-${i}`}
            onClick={() => props.dispatch(setMentor(mentor.id))} >
            <VideoThumbnail src={videoUrl(mentor)} />
          </div>
        )
      }
    </div>
  )
}

const mapStateToProps = state => {
  return {
    mentor: state.mentor,
    mentors: state.mentors,
  }
}

export default connect(mapStateToProps)(VideoPanel);
