import axios from 'axios';

const MENTOR_API_URL = process.env.MENTOR_API_URL || '/mentor-api'
const MENTOR_VIDEO_HOST = 'https://video.mentorpal.org'
const RESPONSE_CUTOFF = -100

export const videoUrl = (mentor) => {
  return `${MENTOR_VIDEO_HOST}/videos/mentors/${mentor.id}/web/${mentor.answer_id}.mp4`
}

export const idleUrl = (mentor) => {
  return `${MENTOR_VIDEO_HOST}/videos/mentors/${mentor.id}/web/idle.mp4`
}

export const queryMentor = async (mentor_id, question) => {
  const res = await axios.get(
    `${MENTOR_API_URL}/questions/`, {
      params: {
        mentor: mentor_id,
        query: question
      }
    }
  )
  const data = res.data
  const response = {
    id: mentor_id,
    question: data.query,
    answer_id: data.answer_id,
    answer_text: data.answer_text,
    confidence: data.confidence,
    is_off_topic: data.confidence <= RESPONSE_CUTOFF,
  }
  return response
}
