import React from "react"
import ReactPlayer from 'react-player'

import { videoUrl } from '../api/api'

const VideoThumbnail = ({ mentor, ...props }) => {
  const src = videoUrl(mentor)
  const width = 95

  return (
    <ReactPlayer
      style={{ opacity: mentor.is_off_topic ? '0.25' : '1' }}
      url={src}
      height={width * 0.5625}
      width={width}
      playing={false}
      controls={false} />
  )
}

export default VideoThumbnail