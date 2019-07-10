import React, { useState } from "react"
import ReactPlayer from 'react-player'

import { idleUrl } from 'src/api/api'
import { STATUS_ERROR } from 'src/redux/store'

const VideoThumbnail = ({ mentor, isMobile }) => {
  const [isPlaying, setPlaying] = useState(true)
  const src = idleUrl(mentor, isMobile ? 'mobile' : 'web')
  const isDisabled = mentor.is_off_topic || mentor.status === STATUS_ERROR
  const width = isMobile ? 50 / 0.895 : 50 / 0.5625

  const onStart = () => {
    setPlaying(false)
  }

  return (
    <ReactPlayer
      style={{ opacity: isDisabled ? '0.25' : '1', backgroundColor: 'black' }}
      url={src}
      height={50}
      width={width}
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