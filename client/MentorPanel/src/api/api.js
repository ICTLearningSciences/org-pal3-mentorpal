import axios from 'axios';

const MENTOR_API_URL = process.env.MENTOR_API_URL || '/mentor-api'
const MENTOR_VIDEO_HOST = 'https://video.mentorpal.org'
const RESPONSE_CUTOFF = -100

export const videoUrl = (mentor, format) => {
  return `${MENTOR_VIDEO_HOST}/videos/mentors/${mentor.id}/${format}/${mentor.answer_id}.mp4`
}

export const idleUrl = (mentor, format) => {
  return `${MENTOR_VIDEO_HOST}/videos/mentors/${mentor.id}/${format}/idle.mp4`
}

export const subtitleUrl = (mentor) => {
  return `${MENTOR_API_URL}/mentors/${mentor.id}/tracks/${mentor.answer_id}.vtt`
}

export const topicsUrl = (mentor_id) => {
  return `${MENTOR_API_URL}/mentors/${mentor_id}/data/topics.csv`
}

export const questionsUrl = (mentor_id) => {
  return `${MENTOR_API_URL}/mentors/${mentor_id}/data/questions_paraphrases_answers.csv`
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