import axios, { AxiosResponse } from "axios";

const MENTOR_API_URL = process.env.MENTOR_API_URL || "/mentor-api"; // eslint-disable-line no-undef
let MENTOR_VIDEO_HOST =
  process.env.MENTOR_VIDEO_HOST || "https://video.mentorpal.org";

export interface MentorApiData {
  id: string;
  name: string;
  questions_by_id: {
    [question_id: string]: {
      question_text: string;
    };
  };
  short_name: string;
  title: string;
  topics_by_id: {
    [topic_id: string]: {
      name: string;
      questions: string[];
    };
  };
  utterances_by_type: {
    [utterance_type: string]: string[][];
  };
}

export interface QuestionApiData {
  query: string;
  answer_id: string;
  answer_text: string;
  confidence: number;
  classifier: string;
}

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

export const videoUrl = (
  mentor: string,
  answerId: string,
  format: string
): string => {
  return `${MENTOR_VIDEO_HOST}/videos/mentors/${mentor}/${format}/${answerId}.mp4`;
};

export const idleUrl = (mentor: string, format: string): string => {
  return `${MENTOR_VIDEO_HOST}/videos/mentors/${mentor}/${format}/idle.mp4`;
};

// TODO: don't pass mentor here, pass mentorId and answerId
export const subtitleUrl = (mentor: string, answerId: string): string => {
  return `${MENTOR_API_URL}/mentors/${mentor}/tracks/${answerId}.vtt`;
};

export async function fetchMentorData(
  mentorId: string
): Promise<AxiosResponse<MentorApiData>> {
  return await axios.get(`${MENTOR_API_URL}/mentors/${mentorId}/data`);
}

export const queryMentor = async (
  mentorId: string,
  question: string
): Promise<AxiosResponse<QuestionApiData>> => {
  // const res =
  return await axios.get(`${MENTOR_API_URL}/questions/`, {
    params: {
      mentor: mentorId,
      query: question,
    },
  });
  // const { data } = res;
  // const response = {
  //   id: mentorId,
  //   question: data.query,
  //   answer_id: data.answer_id,
  //   answer_text: data.answer_text,
  //   confidence: data.confidence,
  //   is_off_topic: data.confidence <= RESPONSE_CUTOFF,
  //   classifier: data.classifier,
  // };
  // return response;
};
