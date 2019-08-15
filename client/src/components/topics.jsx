import React from "react";
import { useSelector, useDispatch } from "react-redux";
import { Button, Paper, GridList, GridListTile } from "@material-ui/core";
import { makeStyles } from '@material-ui/core/styles';

import { History, Whatshot } from "@material-ui/icons";

import { selectTopic } from "store/actions";
import { normalizeString } from "funcs/funcs";

const useStyles = makeStyles(theme => ({
    root: {
      display: 'flex',
      flexWrap: 'wrap',
      justifyContent: 'space-around',
      overflow: 'hidden',
    },
    gridList: {
      height: '60px',
      flexWrap: 'nowrap',
      transform: 'translateZ(0)',
    },
}));

const Topics = ({ onSelected }) => {
  const dispatch = useDispatch();
  const mentor = useSelector(
    state => state.mentors_by_id[state.current_mentor]
  );
  const current_topic = useSelector(state => state.current_topic);
  const questions_asked = useSelector(state => state.questions_asked);
  const classes = useStyles();

  if (!(mentor && mentor.topic_questions)) {
    return <div />;
  }

  const { topic_questions } = mentor;
  const onTopicSelected = topic => {
    dispatch(selectTopic(topic));
    const top_question = topic_questions[topic].find(q => {
      return !questions_asked.includes(normalizeString(q));
    });
    onSelected(top_question || "");
  };

  if (!current_topic) {
    const first_topic = Object.keys(topic_questions)[0];
    if (first_topic === "Recommended") {
      onTopicSelected(first_topic);
    } else {
      dispatch(selectTopic(first_topic));
    }
  }

  return (
    <Paper className={classes.root} elevation={2} square>
      <GridList className={classes.gridList}>
        {Object.keys(topic_questions).map((topic, i) => (
          <GridListTile key={i}>
            <Button
              variant="contained"
              color={current_topic === topic ? "primary" : "default"}
              onClick={() => onTopicSelected(topic)}
            >
              {topic === "History" ? (
                <History style={{ marginRight: "5px" }} />
              ) : (
                undefined
              )}
              {topic === "Recommended" ? (
                <Whatshot style={{ marginRight: "5px" }} />
              ) : (
                undefined
              )}
              {topic}
            </Button>
          </GridListTile>
        ))}
      </GridList>
    </Paper>
  );
};

export default Topics;
