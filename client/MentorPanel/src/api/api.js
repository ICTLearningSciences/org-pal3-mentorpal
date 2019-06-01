import axios from 'axios';

const MENTOR_API_URL = process.env.MENTOR_API_URL || '/mentor-api'
const MENTOR_VIDEO_HOST = 'https://video.mentorpal.org'

export const RESPONSE_CUTOFF = -100

export const videoUrl = (mentor) => {
  return `${MENTOR_VIDEO_HOST}/videos/mentors/${mentor.id}/web/${mentor.answer_id}.mp4`
}

export const idleUrl = (mentor) => {
  return `${MENTOR_VIDEO_HOST}/videos/mentors/${mentor.id}/web/idle.mp4`
}

export const queryPanel = async (mentors, question) => {
  const responses = []

  // Get responses from the panel of mentors
  const mentor_ids = Object.keys(mentors)
  for (let i = 0; i < mentor_ids.length; i++) {
    const mentor_id = mentor_ids[i]
    const response = await queryMentor(mentors[mentor_id], question)
    if (response) {
      console.log(response)
      responses.push(response)
    }
  }

  // Order by best answer
  responses.sort((a, b) => (a.confidence > b.confidence) ? -1 : 1)

  return responses
}

export const queryMentor = async (mentor, question) => {
  try {
    const res = await axios.get(
      `${MENTOR_API_URL}/questions/`, {
        params: {
          mentor: mentor.id,
          query: question
        }
      }
    )
    const data = res.data
    const response = {
      id: mentor.id,
      name: mentor.name,
      short_name: mentor.short_name,
      title: mentor.title,
      answer_id: data.answer_id,
      answer_text: data.answer_text,
      confidence: data.confidence,
    }
    return response
  }
  catch (err) {
    return null
  }
}