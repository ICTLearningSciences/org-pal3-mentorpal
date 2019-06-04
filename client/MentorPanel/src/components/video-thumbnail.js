import React from "react"
import ReactPlayer from 'react-player'

import { videoUrl } from '../api/api'

const VideoThumbnail = ({ mentor, ...props }) => {
  const src = videoUrl(mentor)

  return (
    <ReactPlayer
      style={{ opacity: mentor.is_off_topic ? '0.25' : '1' }}
      url={src}
      height={80}
      width={80}
      playing={false}
      controls={false} />
  )
}

export default VideoThumbnail