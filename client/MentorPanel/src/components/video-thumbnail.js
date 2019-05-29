import React from "react"
import ReactPlayer from 'react-player'

const VideoThumbnail = ({ src, ...props }) => {
  const width = 95
  return (
    <ReactPlayer
      url={src}
      height={width * 0.5625}
      width={width}
      playing={false}
      controls={false} />
  )
}

export default VideoThumbnail