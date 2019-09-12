import axios, { AxiosResponse } from "axios";

import { MentorApiData, MentorData } from '@/store/types'

const MENTOR_API_URL = process.env.MENTOR_API_URL || "/mentor-api"; // eslint-disable-line no-undef
let MENTOR_VIDEO_HOST =
  process.env.MENTOR_VIDEO_HOST || "https://video.mentorpal.org";
const RESPONSE_CUTOFF = -100;

/*
This is a hacky place and means to get a server-configured
override of VIDEO_HOST.
It exists (at least for now), exclusively to enable
dev-local clients where mentor videos are being polished
to test serving those videos
*/
if (typeof window !== "undefined" && process.env.NODE_ENV !== "test") {
  // i.e. don't run at build time
  axios
    .get(`${MENTOR_API_URL}/config/video-host`)
    .then(result => {
      console.log(`get ${MENTOR_API_URL}/config/video-host`, result);
      if (typeof result.data.url === "string") {
        MENTOR_VIDEO_HOST = result.data.url;
      }
    })
    .catch(err => {
      console.error(err);
    });
}

// TODO: don't pass mentor here, pass mentorId and answerId
export const videoUrl = (mentor:MentorData, format:string):string => {
  return `${MENTOR_VIDEO_HOST}/videos/mentors/${mentor.id}/${format}/${mentor.answer_id}.mp4`;
};

// TODO: don't pass mentor here, pass mentorId
export const idleUrl = (mentor:MentorData, format:string):string => {
  return `${MENTOR_VIDEO_HOST}/videos/mentors/${mentor.id}/${format}/idle.mp4`;
};

// TODO: don't pass mentor here, pass mentorId and answerId
export const subtitleUrl = (mentor:MentorData):string => {
  return `${MENTOR_API_URL}/mentors/${mentor.id}/tracks/${mentor.answer_id}.vtt`;
};

export const topicsUrl = (mentorId:string):string => {
  return `${MENTOR_API_URL}/mentors/${mentorId}/data/topics.csv`;
};

export const questionsUrl = (mentorId:string):string => {
  return `${MENTOR_API_URL}/mentors/${mentorId}/data/questions_paraphrases_answers.csv`;
};

export async function fetchMentorData(mentorId:string) {
  const res = await axios.get(`${MENTOR_API_URL}/mentors/${mentorId}`);
  const { data } = res;
  const response = {
    id: mentorId,
    name: data.name,
    short_name: data.short_name,
    title: data.title,
    answer_id: data.intro_id,
    answer_text: data.intro_text,
    confidence: 1,
  };
  return response;
}

export async function fetchMentorData2(mentorId:string) : Promise<AxiosResponse<MentorApiData>> {
  return await axios.get(`${MENTOR_API_URL}/mentors/${mentorId}/data`);
}

export const queryMentor = async (mentorId:string, question:string) => {
  const res = await axios.get(`${MENTOR_API_URL}/questions/`, {
    params: {
      mentor: mentorId,
      query: question,
    },
  });
  const { data } = res;
  const response = {
    id: mentorId,
    question: data.query,
    answer_id: data.answer_id,
    answer_text: data.answer_text,
    confidence: data.confidence,
    is_off_topic: data.confidence <= RESPONSE_CUTOFF,
    classifier: data.classifier,
  };
  return response;
};
