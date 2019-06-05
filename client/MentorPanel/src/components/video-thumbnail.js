import React from "react"
import ReactPlayer from 'react-player'

import { videoUrl } from '../api/api'
import { STATUS_ERROR } from '../redux/store'

const VideoThumbnail = ({ mentor }) => {
  const src = videoUrl(mentor)
  const isDisabled = mentor.is_off_topic || mentor.status === STATUS_ERROR

  return (
    <ReactPlayer
      style={{ opacity: isDisabled ? '0.25' : '1' }}
      url={src}
      height={80}
      width={80}
      playing={false}
      controls={false} />
  )
}

export default VideoThumbnail