
const MENTOR_VIDEO_HOST = 'https://video.mentorpal.org'

export const videoUrl = (mentor) => {  
  return `${MENTOR_VIDEO_HOST}/videos/mentors/${mentor.id}/web/${mentor.videoId}.mp4`
}

export const idleUrl = (mentor) => {
  return `${MENTOR_VIDEO_HOST}/videos/mentors/${mentor.id}/web/idle.mp4`
}