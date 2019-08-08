import React from "react"
import { useSelector } from "react-redux"
import { Sms, SmsFailed } from "@material-ui/icons"

import { STATUS_READY, STATUS_ERROR } from "redux/store"

const MessageStatus = ({ mentor }) => {
  const next_mentor = useSelector(state => state.next_mentor)

  if (mentor.is_off_topic) {
    return <div />
  }
  if (mentor.status === STATUS_ERROR) {
    return (
      <SmsFailed
        className="message-notice"
        fontSize="small"
        style={{ color: "red" }}
      />
    )
  }
  if (mentor.status === STATUS_READY) {
    const isNext = mentor.id === next_mentor
    return (
      <Sms
        className={`message-notice ${isNext ? "blink" : ""}`}
        fontSize="small"
        style={{ color: "green" }}
      />
    )
  }
  return <div />
}

export default MessageStatus
