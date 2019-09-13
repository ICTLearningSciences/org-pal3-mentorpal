import React from "react";
import ReactPlayer from "react-player";
import { useSelector, useDispatch } from "react-redux";
import { Star, StarBorder } from "@material-ui/icons";

import { idleUrl, videoUrl, subtitleUrl } from "api/api";
import { answerFinished, faveMentor } from "store/actions";
import { chromeVersion } from "funcs/funcs";

import LoadingSpinner from "components/video-spinner";
import MessageStatus from "components/video-status";

const Video = ({ height, width }) => {
  const mentor = useSelector(
    state => state.mentors_by_id[state.current_mentor]
  );
  const mobileWidth = height / 0.895;
  const webWidth = height / 0.5625;
  const format =
    Math.abs(width - mobileWidth) > Math.abs(width - webWidth)
      ? "web"
      : "mobile";
  width = Math.min(width, format === "mobile" ? mobileWidth : webWidth);

  return (
    <div id="video-container" style={{ width }}>
      <VideoPlayer height={height} width={width} format={format} />
      <FaveButton />
      <LoadingSpinner mentor={mentor} height={height} width={width} />
      <MessageStatus mentor={mentor} />
    </div>
  );
};

const VideoPlayer = ({ width, height, format = "mobile" }) => {
  const dispatch = useDispatch();
  const isIdle = useSelector(state => state.isIdle);
  const mentor = useSelector(
    state => state.mentors_by_id[state.current_mentor]
  );
  const video_url = mentor
    ? isIdle
      ? idleUrl(mentor.id, format)
      : videoUrl(mentor.id, mentor.answer_id, format)
    : "";
  const subtitle_url =
    mentor && !isIdle ? subtitleUrl(mentor.id, mentor.answer_id) : "";
  const showSubtitles = !chromeVersion() || chromeVersion() >= 62;

  const onEnded = () => {
    dispatch(answerFinished());
  };

  return (
    <ReactPlayer
      style={{ backgroundColor: "black" }}
      url={video_url}
      onEnded={onEnded}
      loop={isIdle}
      width={width}
      height={height}
      controls={!isIdle}
      playing
      playsinline
      webkit-playsinline="true"
      config={{
        file: {
          tracks: showSubtitles
            ? [
                {
                  kind: "subtitles",
                  src: subtitle_url,
                  srcLang: "en",
                  default: true,
                },
              ]
            : [],
        },
      }}
    />
  );
};

const FaveButton = () => {
  const dispatch = useDispatch();
  const mentor = useSelector(state => state.current_mentor);
  const mentors = useSelector(state => state.mentors_by_id);
  const faved_mentor = useSelector(state => state.faved_mentor);

  const onClick = () => {
    dispatch(faveMentor(mentor));
  };

  if (Object.keys(mentors).length === 1) {
    return <div />;
  }

  return faved_mentor === mentor ? (
    <Star className="star-icon" onClick={onClick} style={{ color: "yellow" }} />
  ) : (
    <StarBorder
      className="star-icon"
      onClick={onClick}
      style={{ color: "grey" }}
    />
  );
};

export default Video;
