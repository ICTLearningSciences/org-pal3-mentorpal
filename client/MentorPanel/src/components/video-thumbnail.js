import React, { useState } from "react"
import ReactPlayer from 'react-player'

import { idleUrl } from 'src/api/api'
import { STATUS_ERROR } from 'src/redux/store'

const VideoThumbnail = ({ mentor }) => {
  const [isPlaying, setPlaying] = useState(true)
  const src = idleUrl(mentor)
  const isDisabled = mentor.is_off_topic || mentor.status === STATUS_ERROR

  const onStart = () => {
    setPlaying(false)
  }

  return (
    <ReactPlayer
      style={{ opacity: isDisabled ? '0.25' : '1' }}
      url={src}
      height={50}
      width={50 / 0.895}
      onStart={onStart}
      playing={isPlaying}
      volume={0.0}
      muted={true}
      controls={false}
      playsinline={true}
      webkit-playsinline='true' />
  )
}

export default VideoThumbnail