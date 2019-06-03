import React from "react"
import ReactPlayer from 'react-player'
import { CircularProgress } from '@material-ui/core';
import { useSelector } from 'react-redux';

const VideoThumbnail = ({ src, disabled, ...props }) => {
  const isLoading = useSelector(state => state.isLoading)
  const width = 95

  return (
    <div style={{ position: 'relative' }}>
      <ReactPlayer
        style={{ opacity: disabled ? '0.25' : '1' }}
        url={src}
        height={width * 0.5625}
        width={width}
        playing={false}
        controls={false} />
      {isLoading ? <CircularProgress className='spinner' /> : undefined}
    </div>
  )
}

export default VideoThumbnail