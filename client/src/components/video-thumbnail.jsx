import React, { useState } from "react";
import ReactPlayer from "react-player";

import { idleUrl } from "api/api";
import { STATUS_ERROR } from "store/reducer";

const VideoThumbnail = ({ mentor, isMobile, width, height }) => {
  const [isPlaying, setPlaying] = useState(true);
  const src = idleUrl(mentor, isMobile ? "mobile" : "web");
  const isDisabled = mentor.is_off_topic || mentor.status === STATUS_ERROR;

  const onStart = () => {
    setPlaying(false);
  };

  return (
    <ReactPlayer
      style={{ opacity: isDisabled ? "0.25" : "1", backgroundColor: "black" }}
      url={src}
      height={height}
      width={width}
      onStart={onStart}
      playing={isPlaying}
      volume={0.0}
      muted
      controls={false}
      playsinline
      webkit-playsinline="true"
    />
  );
};

export default VideoThumbnail;
