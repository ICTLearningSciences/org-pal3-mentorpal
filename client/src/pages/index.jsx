import React, { useEffect, useState } from "react";
import { useSelector, useDispatch } from "react-redux";
import { actions as cmi5Actions } from "redux-cmi5";
import { graphql, withPrefix } from "gatsby";
import { CircularProgress } from "@material-ui/core";
import { MuiThemeProvider, createMuiTheme } from "@material-ui/core/styles";
import { Helmet } from "react-helmet";

import { loadMentor, loadQuestions, selectMentor } from "store/actions";

import Header from "components/header";
import Input from "components/input";
import Video from "components/video";
import VideoPanel from "components/video-panel";
import withLocation from "wrap-with-location";

import "styles/layout.css";

const { start: cmi5Start } = cmi5Actions;

const theme = createMuiTheme({
  palette: {
    primary: {
      main: "#1b6a9c",
    },
  },
});

const IndexPage = ({ search, data }) => {
  const dispatch = useDispatch();
  const mentors = useSelector(state => state.mentors_by_id);
  const [height, setHeight] = useState(0);
  const [width, setWidth] = useState(0);
  const { recommended, mentor } = search;

  const isMobile = width < 768;
  const videoHeight = isMobile ? height * 0.5 : Math.min(width * 0.5625, 700);
  const inputHeight = isMobile
    ? height * 0.5
    : Math.max(height - videoHeight, 250);

  let globalWindow;
  if (typeof window !== "undefined") {
    globalWindow = window; // eslint-disable-line no-undef
  }

  function handleWindowResize() {
    if (typeof globalWindow === `undefined`) {
      return;
    }
    setHeight(globalWindow.innerHeight);
    setWidth(globalWindow.innerWidth);
  }

  useEffect(() => {
    dispatch(cmi5Start());
  }, []); // run only on first render

  useEffect(() => {
    const edgeData = data.allMentorsCsv.edges;
    const mentorData = edgeData.find(item => {
      return item.node.id === mentor;
    });

    // Load the data for a single mentor
    if (mentorData) {
      dispatch(loadMentor(mentorData.node));
      dispatch(loadQuestions(mentor, recommended));
      dispatch(selectMentor(mentor));
    }
    // Load the list of mentors and questions
    else {
      edgeData.forEach(item => {
        dispatch(loadMentor(item.node));
        dispatch(loadQuestions(item.node.id, recommended));
      });
      dispatch(selectMentor(edgeData[0].node.id));
    }

    // Media queries for layout
    setHeight(globalWindow.innerHeight);
    setWidth(globalWindow.innerWidth);
    globalWindow.addEventListener("resize", handleWindowResize);
    return () => {
      globalWindow.removeEventListener("resize", handleWindowResize);
    };
  }, []);

  if (mentors === {} || height === 0 || width === 0) {
    return <CircularProgress />;
  }

  return (
    <MuiThemeProvider theme={theme}>
      <Helmet>
        <script src={withPrefix("cmi5.js")} type="text/javascript" />
      </Helmet>
      <div className="flex" style={{ height: videoHeight }}>
        {mentor ? (
          undefined
        ) : (
          <div className="content" style={{ height: "100px" }}>
            <VideoPanel isMobile={isMobile} />
            <Header />
          </div>
        )}
        <div className="expand">
          <Video height={videoHeight - (mentor ? 0 : 100)} width={width} />
        </div>
      </div>
      <Input height={inputHeight} />
    </MuiThemeProvider>
  );
};

export default withLocation(IndexPage);

export const MentorQuery = graphql`
  query {
    allMentorsCsv {
      edges {
        node {
          id
          name
          short_name
          title
          answer_id
          answer_text
          confidence
        }
      }
    }
  }
`;
