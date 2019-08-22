import axios from "axios";

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
if (typeof window !== "undefined") {
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

export const videoUrl = (mentor, format) => {
  return `${MENTOR_VIDEO_HOST}/videos/mentors/${mentor.id}/${format}/${mentor.answer_id}.mp4`;
};

export const idleUrl = (mentor, format) => {
  return `${MENTOR_VIDEO_HOST}/videos/mentors/${mentor.id}/${format}/idle.mp4`;
};

export const subtitleUrl = mentor => {
  return `${MENTOR_API_URL}/mentors/${mentor.id}/tracks/${mentor.answer_id}.vtt`;
};

export const topicsUrl = mentorId => {
  return `${MENTOR_API_URL}/mentors/${mentorId}/data/topics.csv`;
};

export const questionsUrl = mentorId => {
  return `${MENTOR_API_URL}/mentors/${mentorId}/data/questions_paraphrases_answers.csv`;
};

// TODO: data needs to move to server, but for quick backwards-compat fix just hard coding it differently
export async function fetchMentorData(mentorId) {
  let mentorData;
  switch (mentorId) {
    case "carlos":
      mentorData = {
        answer_id: "carlos_A1_1_1",
        answer_text:
          "So my name is Carlos Rios. I'm a logistics lead supporting marine corps projects. I'm originally from Connecticut or New Haven, Connecticut. My mother and father are from Puerto Rico they migrated over to Connecticut and then from there after about six well I was about seven years old and moved over to a Philadelphia where I spent most of my most of my youth. About age 18-19 years old graduated high school and joined the marine corps. Twenty three years later, retired. During that time of course I got married. I have been married for twenty seven years. I have two great kids, one currently attending USC and one in the near future want to attend Clemson, South Carolina where I currently reside after my retirement from the marine corps. I spent two years as a contractor supporting the marine corps and I personally think I did such a good job that the government decided to bring it over to that side and support as a government employee and I've been doing that for about seven years high manage everything from my computer, servers, laptops to drones.",
        confidence: 0,
        id: mentorId,
        name: "Carlos Rios",
        short_name: "Carlos",
        title: "Marine Logistician",
      };
      break;
    case "clint":
      mentorData = {
        answer_id: "clintanderson_A1_1_1",
        answer_text:
          "My name is EMC Clint Anderson, that's Electrician's Mate Clinton Anderson. I was born in Los Angeles, California. I was raised there most of my life and I graduated from high school there. A couple of years after graduating from high school, then I joined the United States Navy. I was an Electrician's Mate for eight years. I served on an aircraft carrier. We went on many deployments. A deployment is when you go to war, you fight. We fought in the Iraq war. I went on three deployments and it was a really great time in my life. I had a lot of fun. At the end of the eight years, I decided that the Navy wasn't quite a career for me. So, I got out of the Navy. I started using the education benefits that we received and I started going to the University of California at Berkeley. I was majoring in computer science and afterwards, I started getting my master's degree from the University of Southern California. I also had a job at the Institute for Creative Technologies. It's been a lot of fun, this whole time. Thanks to the Navy.",
        confidence: 0,
        id: mentorId,
        name: "Clint Anderson",
        short_name: "Clint",
        title: "Nuclear Electrician's Mate",
      };
      break;
    case "dan":
      mentorData = {
        answer_id: "dandavis_A1_1_1",
        answer_text:
          "Hello I'm Dan Davis I've worked for universities to last thirty years doing basic research in high performance computing of work for Cal Tech, University of Southern California and the University of Hawaii.",
        confidence: 0,
        id: mentorId,
        name: "Dan Davis",
        short_name: "Dan",
        title: "High Performance Computing Researcher",
      };
      break;
    case "julianne":
      mentorData = {
        answer_id: "julianne_u1_1_1",
        answer_text:
          "I'm in the United States Navy and I'm currently a student naval aviator so that means that I have commissioned into the Navy and I am starting to learn how to fly planes and will then become a full trained pilot for the Navy.",
        confidence: 0,
        id: mentorId,
        name: "Julianne Nordhagen",
        short_name: "Julianne",
        title: "Student Naval Aviator",
      };
      break;
    default:
      mentorData = {
        answer_id: `${mentorId}_a1_1_1`,
        answer_text: "",
        confidence: 1,
        id: mentorId,
        name: mentorId,
        short_name: mentorId,
        title: mentorId,
      };
  }
  return Promise.resolve(mentorData);
}

export const queryMentor = async (mentorId, question) => {
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
