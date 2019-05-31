import React from "react"
import ReactPlayer from 'react-player'

const VideoThumbnail = ({ src, disabled, ...props }) => {
  const width = 95
  return (
    <ReactPlayer
      style={{ opacity: disabled ? '0.25' : '1' }}
      url={src}
      height={width * 0.5625}
      width={width}
      playing={false}
      controls={false} />
  )
}

export default VideoThumbnail