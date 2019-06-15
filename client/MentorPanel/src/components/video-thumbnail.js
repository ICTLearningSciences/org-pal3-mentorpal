import React from "react"
import ReactPlayer from 'react-player'

import { idleUrl } from '../api/api'
import { STATUS_ERROR } from '../redux/store'

class VideoThumbnail extends React.Component {
  constructor(props) {
    super(props);
    this.state = { isPlaying: true };
  }

  onStart = () => {
    this.setState({ isPlaying: false })
  }

  render() {
    const mentor = this.props.mentor
    const src = idleUrl(mentor)
    const isDisabled = mentor.is_off_topic || mentor.status === STATUS_ERROR

    return (
      <ReactPlayer
        style={{ opacity: isDisabled ? '0.25' : '1' }}
        url={src}
        height={60}
        width={60}
        onStart={this.onStart}
        playing={this.state.isPlaying}
        volume={0.0}
        muted={true}
        controls={false}
        playsinline={true}
        webkit-playsinline='true' />
    )
  }
}

export default VideoThumbnail