import React from "react";
import { useSelector, useDispatch } from "react-redux";
import { Star } from "@material-ui/icons";

import { selectMentor } from "store/actions";
import { MentorQuestionStatus } from "store/types";

import VideoThumbnail from "components/video-thumbnail";
import LoadingSpinner from "components/video-spinner";
import MessageStatus from "components/video-status";

const VideoPanel = ({ isMobile }) => {
  const dispatch = useDispatch();
  const mentor = useSelector(state => state.current_mentor);
  const mentors = useSelector(state => state.mentors_by_id);
  if (!mentor) {
    return <div />;
  }
  const height = 50;
  const width = isMobile ? height / 0.895 : height / 0.5625;

  const onClick = mentor => {
    if (mentor.is_off_topic || mentor.status === MentorQuestionStatus.ERROR) {
      return;
    }
    dispatch(selectMentor(mentor.id));
  };

  return (
    <div className="carousel">
      {Object.keys(mentors).map((id, i) => (
        <div
          className={`slide video-slide ${id === mentor ? "selected" : ""}`}
          key={`${id}-${i}`}
          onClick={() => onClick(mentors[id])}
        >
          <VideoThumbnail
            mentor={mentors[id]}
            isMobile={isMobile}
            height={height}
            width={width}
          />
          <LoadingSpinner mentor={mentors[id]} height={height} width={width} />
          <MessageStatus mentor={mentors[id]} />
          <StarIcon mentor={mentors[id]} />
        </div>
      ))}
    </div>
  );
};

const StarIcon = ({ mentor }) => {
  const faved_mentor = useSelector(state => state.faved_mentor);
  if (faved_mentor === mentor.id) {
    return (
      <Star
        className="star-icon"
        fontSize="small"
        style={{ color: "yellow" }}
      />
    );
  }
  return <div />;
};

export default VideoPanel;
