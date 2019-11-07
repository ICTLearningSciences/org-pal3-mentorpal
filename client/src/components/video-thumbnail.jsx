import React, { useState } from "react";
import ReactPlayer from "react-player";

import { idleUrl, videoUrl } from "api/api";
import { MentorQuestionStatus } from "store/types";

function findMentorIdleId(mentor) {
  try {
    return mentor.utterances_by_type["_IDLE_"][0][0];
  } catch (err) {
    return undefined;
  }
}

const VideoThumbnail = ({ mentor, isMobile, width, height }) => {
  const [isPlaying, setPlaying] = useState(true);
  const format = isMobile ? "mobile" : "web";
  const isDisabled =
    mentor.is_off_topic || mentor.status === MentorQuestionStatus.ERROR;

  const onStart = () => {
    setPlaying(false);
  };

  const idleVideoId = findMentorIdleId(mentor);
  const url = idleVideoId
    ? videoUrl(mentor.id, idleVideoId, format)
    : idleUrl(mentor.id, format);

  return (
    <ReactPlayer
      style={{ opacity: isDisabled ? "0.25" : "1", backgroundColor: "black" }}
      url={url}
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
